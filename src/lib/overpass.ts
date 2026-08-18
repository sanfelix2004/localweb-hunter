// Discovery pipeline: geocoding (Nominatim) + ricerca attività (Overpass API).
// Entrambe le API sono gratuite e non richiedono chiavi.

import { CategoryDef } from "./categories";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const USER_AGENT = "LocalWebHunter/1.0 (lead-gen tool)";

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
  phone?: string;
  email?: string;
  website?: string;
  socialLinks: Record<string, string>;
}

/** Geocodifica città/CAP/indirizzo. Accetta anche "lat,lon" diretto. */
export async function geocode(query: string): Promise<GeoPoint> {
  const coordMatch = query
    .trim()
    .match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2]),
      displayName: `Coordinate ${coordMatch[1]}, ${coordMatch[2]}`,
    };
  }

  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Geocoding fallito (HTTP ${res.status})`);
  const results = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];
  if (!results.length)
    throw new Error(`Località "${query}" non trovata. Prova con "Città, Provincia" o un CAP.`);
  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
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

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Overpass API errore (HTTP ${res.status}). Riprova tra qualche secondo.`);
  const data = (await res.json()) as { elements: OverpassElement[] };

  const businesses: DiscoveredBusiness[] = [];
  for (const el of data.elements) {
    const tags = el.tags ?? {};
    if (!tags.name) continue; // scarta POI anonimi

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const addressParts = [
      [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
      tags["addr:postcode"],
      tags["addr:city"],
    ].filter(Boolean);

    const socialLinks: Record<string, string> = {};
    for (const key of ["facebook", "instagram", "twitter", "linkedin", "tiktok"]) {
      const v = tags[`contact:${key}`] ?? tags[key];
      if (v) socialLinks[key] = v;
    }

    businesses.push({
      osmId: `${el.type}/${el.id}`,
      name: tags.name,
      lat,
      lon,
      address: addressParts.length ? addressParts.join(", ") : undefined,
      phone: tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"],
      email: tags.email ?? tags["contact:email"],
      website: normalizeWebsite(tags.website ?? tags["contact:website"]),
      socialLinks,
    });
  }
  return businesses;
}

function normalizeWebsite(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  // Link Facebook/Instagram messi nel campo website NON contano come sito vero
  if (/facebook\.com|instagram\.com|wa\.me|whatsapp\.com|linktr\.ee/i.test(trimmed)) {
    return undefined;
  }
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}
