/**
 * Trova il sito ufficiale di un'attività.
 * OSM spesso NON ha il tag website anche se il locale ha un sito vero:
 * questa pipeline verifica più fonti e accetta un URL solo se la pagina
 * (o il dominio) appartiene davvero all'attività.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 LocalWebHunter/1.1";

const GENERIC_WORDS = new Set([
  "ristorante",
  "ristoranti",
  "trattoria",
  "osteria",
  "pizzeria",
  "pizza",
  "bar",
  "caffè",
  "caffe",
  "cafe",
  "hotel",
  "albergo",
  "b&b",
  "bb",
  "pub",
  "grill",
  "steakhouse",
  "tavola",
  "calda",
  "enoteca",
  "wine",
  "bar",
  "da",
  "dal",
  "dalla",
  "del",
  "della",
  "dello",
  "dei",
  "degli",
  "di",
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "e",
  "ed",
  "a",
  "al",
  "alla",
  "ai",
  "the",
  "and",
  "of",
  "restaurant",
  "trattoria",
  "pizzeria",
  "studio",
  "snc",
  "sas",
  "srl",
  "spa",
]);

const AGGREGATOR_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "wa.me",
  "whatsapp.com",
  "linktr.ee",
  "linktree.com",
  "tripadvisor.",
  "thefork.",
  "theforkmanager.",
  "quandoo.",
  "opentable.",
  "yelp.",
  "justeat.",
  "deliveroo.",
  "glovo.",
  "foodora.",
  "uber.com",
  "paginegialle.",
  "paginebianche.",
  "google.",
  "g.page",
  "maps.app.goo.gl",
  "goo.gl",
  "bing.com",
  "duckduckgo.com",
  "wikipedia.org",
  "wikidata.org",
  "booking.com",
  "expedia.",
  "airbnb.",
  "timeout.com",
  "zerozero.",
  "miodottore.",
  "doctoralia.",
  "prestocard.",
  "covermanager.",
  "easybook.",
  "prenotaora.",
  "miorestaurant.",
  "restopolitan.",
  "foursquare.",
  "apple.com",
];

export interface WebsiteQuery {
  name: string;
  address?: string;
  city?: string;
  lat?: number;
  lon?: number;
  wikidataId?: string;
  osmWebsite?: string;
}

export interface WebsiteHit {
  url: string;
  source: "osm" | "wikidata" | "google_places" | "nominatim" | "web_search" | "domain_guess";
  confidence: number;
}

export function isAggregatorUrl(url: string): boolean {
  try {
    const host = new URL(ensureHttp(url)).hostname.toLowerCase().replace(/^www\./, "");
    return AGGREGATOR_HOSTS.some((h) => host.includes(h.replace(/\.$/, "")) || host.endsWith(h));
  } catch {
    return true;
  }
}

export function normalizeWebsite(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    if (isAggregatorUrl(parsed.toString())) return undefined;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** Pipeline completa. Restituisce il primo candidato verificato, per priorità di fonte. */
export async function findOfficialWebsite(q: WebsiteQuery): Promise<WebsiteHit | null> {
  const osm = normalizeWebsite(q.osmWebsite);
  if (osm && (await verifyWebsiteBelongsToBusiness(osm, q))) {
    return { url: osm, source: "osm", confidence: 0.95 };
  }

  const wikiHit = await fromWikidata(q);
  if (wikiHit) return wikiHit;

  const placesHit = await fromGooglePlaces(q);
  if (placesHit) return placesHit;

  const nominatimHit = await fromNominatim(q);
  if (nominatimHit) return nominatimHit;

  const searchHit = await fromWebSearch(q);
  if (searchHit) return searchHit;

  const guessHit = await fromDomainGuess(q);
  if (guessHit) return guessHit;

  return osm ? { url: osm, source: "osm", confidence: 0.6 } : null;
}

export async function enrichMissingWebsites(
  items: WebsiteQuery[],
  concurrency = 4
): Promise<(WebsiteHit | null)[]> {
  const results: (WebsiteHit | null)[] = new Array(items.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await withTimeout(findOfficialWebsite(items[i]), 12000);
      } catch {
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function fromWikidata(q: WebsiteQuery): Promise<WebsiteHit | null> {
  try {
    let qid = q.wikidataId?.toUpperCase();
    if (!qid) {
      const search = [q.name, q.city].filter(Boolean).join(" ");
      const url =
        "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=it&uselang=it&type=item&limit=5&search=" +
        encodeURIComponent(search);
      const data = await fetchJson<{
        search?: { id: string; description?: string; label?: string }[];
      }>(url, 8000);
      const hit = data.search?.find((s) => {
        const blob = `${s.label ?? ""} ${s.description ?? ""}`.toLowerCase();
        const loc = (q.city ?? "").toLowerCase();
        return tokensOf(q.name).every((t) => blob.includes(t)) && (!loc || blob.includes(loc));
      });
      qid = hit?.id ?? data.search?.[0]?.id;
    }
    if (!qid) return null;

    const entityUrl =
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=" +
      encodeURIComponent(qid);
    const entity = await fetchJson<{
      entities?: Record<
        string,
        { claims?: { P856?: { mainsnak?: { datavalue?: { value?: string } } }[] } }
      >;
    }>(entityUrl, 8000);
    const claim = entity.entities?.[qid]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
    const url = normalizeWebsite(claim);
    if (url && (await verifyWebsiteBelongsToBusiness(url, q))) {
      return { url, source: "wikidata", confidence: 0.93 };
    }
  } catch {
    /* fonte best-effort */
  }
  return null;
}

async function fromGooglePlaces(q: WebsiteQuery): Promise<WebsiteHit | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || q.lat == null || q.lon == null) return null;
  try {
    const input = [q.name, q.address, q.city].filter(Boolean).join(", ");
    const findUrl =
      "https://maps.googleapis.com/maps/api/place/findplacefromtext/json" +
      `?input=${encodeURIComponent(input)}&inputtype=textquery` +
      `&fields=place_id,name` +
      `&locationbias=circle:120@${q.lat},${q.lon}` +
      `&key=${key}`;
    const found = await fetchJson<{
      candidates?: { place_id: string; name: string }[];
      status: string;
    }>(findUrl, 8000);
    const placeId = found.candidates?.[0]?.place_id;
    if (!placeId) return null;

    const detailsUrl =
      "https://maps.googleapis.com/maps/api/place/details/json" +
      `?place_id=${placeId}&fields=website,name,url&key=${key}`;
    const details = await fetchJson<{
      result?: { website?: string; name?: string };
    }>(detailsUrl, 8000);
    const url = normalizeWebsite(details.result?.website);
    if (url && (await verifyWebsiteBelongsToBusiness(url, q))) {
      return { url, source: "google_places", confidence: 0.97 };
    }
  } catch {
    /* Places è opzionale */
  }
  return null;
}

async function fromNominatim(q: WebsiteQuery): Promise<WebsiteHit | null> {
  try {
    const query = [q.name, q.city ?? q.address].filter(Boolean).join(", ");
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=5&extratags=1&addressdetails=1&countrycodes=it&q=" +
      encodeURIComponent(query);
    const results = await fetchJson<
      {
        lat: string;
        lon: string;
        extratags?: Record<string, string>;
        display_name: string;
      }[]
    >(url, 8000);
    for (const r of results ?? []) {
      if (q.lat != null && q.lon != null) {
        const d = haversine(q.lat, q.lon, parseFloat(r.lat), parseFloat(r.lon));
        if (d > 250) continue;
      }
      const candidate = normalizeWebsite(
        r.extratags?.website ?? r.extratags?.url ?? r.extratags?.["contact:website"]
      );
      if (candidate && (await verifyWebsiteBelongsToBusiness(candidate, q))) {
        return { url: candidate, source: "nominatim", confidence: 0.88 };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fromWebSearch(q: WebsiteQuery): Promise<WebsiteHit | null> {
  const city = q.city ?? "";
  const queries = [
    `"${q.name}" ${city} sito ufficiale`.trim(),
    `${q.name} ${city} ristorante sito`.trim(),
  ];
  for (const query of queries) {
    try {
      const html = await fetchText(
        "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query),
        9000
      );
      const urls = extractSearchUrls(html);
      for (const raw of urls.slice(0, 8)) {
        const url = normalizeWebsite(raw);
        if (!url) continue;
        if (await verifyWebsiteBelongsToBusiness(url, q)) {
          return { url, source: "web_search", confidence: 0.82 };
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function fromDomainGuess(q: WebsiteQuery): Promise<WebsiteHit | null> {
  const slug = slugify(q.name);
  const distinctive = tokensOf(q.name).join("");
  if (slug.length < 4 && distinctive.length < 4) return null;

  const bases = Array.from(
    new Set([slug, distinctive, `ristorante${slug}`, `trattoria${slug}`, `pizzeria${slug}`])
  ).filter((s) => s.length >= 4);

  const tlds = ["it", "com", "eu"];
  const candidates: string[] = [];
  for (const base of bases.slice(0, 3)) {
    for (const tld of tlds) candidates.push(`https://www.${base}.${tld}`);
  }

  for (const url of candidates.slice(0, 8)) {
    if (await verifyWebsiteBelongsToBusiness(url, q, { requireNameInPage: true })) {
      return { url, source: "domain_guess", confidence: 0.78 };
    }
  }
  return null;
}

export async function verifyWebsiteBelongsToBusiness(
  url: string,
  q: WebsiteQuery,
  opts?: { requireNameInPage?: boolean }
): Promise<boolean> {
  const host = hostnameOf(url);
  if (!host || isAggregatorUrl(url)) return false;

  const tokens = tokensOf(q.name);
  const slug = slugify(q.name);
  const hostCompact = host.replace(/\./g, "").replace(/^www/, "");
  const domainLooksLikeName =
    (slug.length >= 5 && hostCompact.includes(slug)) ||
    (tokens.length > 0 && tokens.every((t) => t.length >= 4 && hostCompact.includes(t)));

  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return false;
    const finalHost = hostnameOf(res.url);
    if (finalHost && isAggregatorUrl(res.url)) return false;
    const ctype = res.headers.get("content-type") ?? "";
    if (ctype && !/text\/html|application\/xhtml/i.test(ctype) && !ctype.includes("text/")) {
      return domainLooksLikeName;
    }
    html = (await res.text()).slice(0, 40000);
  } catch {
    return false;
  }

  if (looksLikeDirectoryPage(html)) return false;

  const hay = `${extractTitle(html)} ${stripTags(html).slice(0, 6000)}`.toLowerCase();
  if (tokens.length === 0) return domainLooksLikeName;

  const matched = tokens.filter((t) => hay.includes(t));
  const enough =
    tokens.length === 1 ? matched.length === 1 : matched.length >= Math.min(2, tokens.length);

  if (opts?.requireNameInPage) return enough;
  return enough || domainLooksLikeName;
}

function extractSearchUrls(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/uddg=([^&"]+)/gi)) {
    try {
      out.push(decodeURIComponent(m[1]));
    } catch {
      /* skip */
    }
  }
  for (const m of html.matchAll(/class="result__a"[^>]*href="([^"]+)"/gi)) {
    out.push(m[1]);
  }
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/gi)) {
    out.push(m[1]);
  }
  return Array.from(new Set(out)).filter((u) => !/duckduckgo\.com|google\.com\/aclk/i.test(u));
}

function tokensOf(name: string): string[] {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/['’]/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
}

function slugify(name: string): string {
  return tokensOf(name).join("");
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(ensureHttp(url)).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function extractTitle(html: string): string {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function looksLikeDirectoryPage(html: string): boolean {
  const t = html.toLowerCase();
  const hits = ["tripadvisor", "thefork", "justeat", "paginegialle", "prenota un tavolo su"].filter((x) =>
    t.includes(x)
  );
  return hits.length >= 2;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const a =
    Math.sin(((lat2 - lat1) * Math.PI) / 180 / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(((lon2 - lon1) * Math.PI) / 180 / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fetchJson<T>(url: string, ms: number): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function fetchText(url: string, ms: number): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
