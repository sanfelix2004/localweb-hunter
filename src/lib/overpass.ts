// Discovery pipeline: geocoding + ricerca attività (Overpass API).
// Geocoding con più provider: Photon → Open-Meteo → Nominatim (con retry).

import { CategoryDef } from "./categories";
import { normalizeWebsite } from "./websiteDiscovery";

const OVERPASS_URLS = [
  process.env.OVERPASS_URL,
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
].filter(Boolean) as string[];

const USER_AGENT =
  "LocalWebHunter/1.1 (https://localweb-hunter-app.vercel.app; lead-gen tool)";

export interface GeoPoint {
  lat: number;
  lon: number;
  displayName: string;
}

export interface DiscoveredBusiness {
  osmId: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  websiteSource?: string;
  wikidataId?: string;
  socialLinks: Record<string, string>;
}

/** CAP italiani più usati → centro città (evita rate limit sul geocoding). */
const CAP_HINTS: Record<string, GeoPoint> = {
  "70054": { lat: 41.0055, lon: 16.876, displayName: "Giovinazzo, Bari" },
  "70121": { lat: 41.125, lon: 16.8667, displayName: "Bari" },
  "70122": { lat: 41.125, lon: 16.8667, displayName: "Bari" },
  "70123": { lat: 41.125, lon: 16.8667, displayName: "Bari" },
  "70124": { lat: 41.125, lon: 16.8667, displayName: "Bari" },
  "70125": { lat: 41.125, lon: 16.8667, displayName: "Bari" },
  "70126": { lat: 41.125, lon: 16.8667, displayName: "Bari" },
  "90121": { lat: 38.1157, lon: 13.3615, displayName: "Palermo" },
  "90133": { lat: 38.1157, lon: 13.3615, displayName: "Palermo" },
  "20121": { lat: 45.4642, lon: 9.19, displayName: "Milano" },
  "00118": { lat: 41.9028, lon: 12.4964, displayName: "Roma" },
  "00184": { lat: 41.9028, lon: 12.4964, displayName: "Roma" },
  "00185": { lat: 41.9028, lon: 12.4964, displayName: "Roma" },
  "10121": { lat: 45.0703, lon: 7.6869, displayName: "Torino" },
  "80121": { lat: 40.8518, lon: 14.2681, displayName: "Napoli" },
  "50121": { lat: 43.7696, lon: 11.2558, displayName: "Firenze" },
  "40121": { lat: 44.4949, lon: 11.3426, displayName: "Bologna" },
  "16121": { lat: 44.4056, lon: 8.9463, displayName: "Genova" },
  "35121": { lat: 45.4064, lon: 11.8768, displayName: "Padova" },
};

async function geocodePhoton(query: string): Promise<GeoPoint | null> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&limit=3&lang=it&lat=41.9&lon=12.5`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: {
        name?: string;
        city?: string;
        country?: string;
        countrycode?: string;
        state?: string;
        postcode?: string;
        type?: string;
      };
    }[];
  };
  const features = data.features ?? [];
  const preferred =
    features.find((f) => (f.properties?.countrycode || "").toLowerCase() === "it") ??
    features[0];
  const coords = preferred?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  const p = preferred?.properties ?? {};
  const label = [p.name, p.city, p.state, p.country].filter(Boolean).join(", ");
  return { lat, lon, displayName: label || query };
}

async function geocodeOpenMeteo(query: string): Promise<GeoPoint | null> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=1&language=it&format=json&countryCode=IT`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { latitude: number; longitude: number; name: string; admin1?: string; country?: string }[];
  };
  const r = data.results?.[0];
  if (!r) return null;
  return {
    lat: r.latitude,
    lon: r.longitude,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  };
}

async function geocodeNominatim(query: string): Promise<GeoPoint | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it` +
    `&q=${encodeURIComponent(query)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1100 * attempt));
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Accept-Language": "it",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 429 || res.status === 503) continue;
    if (!res.ok) return null;
    const results = (await res.json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];
    if (!results.length) return null;
    return {
      lat: parseFloat(results[0].lat),
      lon: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  }
  return null;
}

/** Geocodifica città/CAP/indirizzo. Accetta anche "lat,lon" diretto. */
export async function geocode(query: string): Promise<GeoPoint> {
  const trimmed = query.trim();
  const coordMatch = trimmed.match(
    /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/
  );
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2]),
      displayName: `Coordinate ${coordMatch[1]}, ${coordMatch[2]}`,
    };
  }

  const cap = trimmed.match(/^\d{5}$/)?.[0];
  if (cap && CAP_HINTS[cap]) return CAP_HINTS[cap];

  // Per CAP italiani senza hint: prova "CAP Italia"
  const attempts = cap
    ? [`${cap}, Italia`, `${cap} Italy`, trimmed]
    : [`${trimmed}, Italia`, trimmed];

  for (const q of attempts) {
    const photon = await geocodePhoton(q).catch(() => null);
    if (photon) return photon;
    const meteo = await geocodeOpenMeteo(q).catch(() => null);
    if (meteo) return meteo;
    const nomi = await geocodeNominatim(q).catch(() => null);
    if (nomi) return nomi;
  }

  throw new Error(
    `Località "${query}" non trovata o servizi di geocoding temporaneamente pieni. Prova "Città, Provincia", un CAP, oppure coordinate tipo 41.12,16.87.`
  );
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Cerca attività della categoria entro il raggio (metri) dal punto. */
export async function searchBusinesses(
  center: GeoPoint,
  radiusMeters: number,
  category: CategoryDef
): Promise<DiscoveredBusiness[]> {
  const around = `around:${radiusMeters},${center.lat},${center.lon}`;
  const clauses = category.osmFilters
    .flatMap(({ key, value }) => [
      `node["${key}"="${value}"](${around});`,
      `way["${key}"="${value}"](${around});`,
    ])
    .join("\n");

  const query = `[out:json][timeout:40];\n(\n${clauses}\n);\nout center tags;`;

  let lastErr = "Overpass non raggiungibile";
  for (const endpoint of OVERPASS_URLS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(55000),
      });
      if (!res.ok) {
        lastErr = `Overpass HTTP ${res.status}`;
        continue;
      }
      const data = (await res.json()) as { elements: OverpassElement[] };
      return parseOverpass(data.elements);
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "Overpass timeout";
    }
  }
  throw new Error(`${lastErr}. Riprova tra qualche secondo.`);
}

function parseOverpass(elements: OverpassElement[]): DiscoveredBusiness[] {
  const businesses: DiscoveredBusiness[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    if (!tags.name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const city = tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"];
    const addressParts = [
      [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
      tags["addr:postcode"],
      city,
    ].filter(Boolean);

    const socialLinks: Record<string, string> = {};
    for (const key of ["facebook", "instagram", "twitter", "linkedin", "tiktok"]) {
      const v = tags[`contact:${key}`] ?? tags[key];
      if (v) socialLinks[key] = v;
    }

    const osmWebsite = normalizeWebsite(
      tags.website ??
        tags["contact:website"] ??
        tags.url ??
        tags["contact:url"] ??
        tags["website:official"]
    );

    businesses.push({
      osmId: `${el.type}/${el.id}`,
      name: tags.name,
      lat,
      lon,
      address: addressParts.length ? addressParts.join(", ") : undefined,
      city,
      phone: tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"],
      email: tags.email ?? tags["contact:email"],
      website: osmWebsite,
      websiteSource: osmWebsite ? "osm" : undefined,
      wikidataId: tags.wikidata,
      socialLinks,
    });
  }
  return businesses;
}
