import type { DiscoveredBusiness } from "./overpass";
import type { LeadDTO } from "./types";

export function discoveredToLead(
  b: DiscoveredBusiness,
  category: string
): LeadDTO {
  const now = new Date().toISOString();
  const hasWebsite = !!b.website;
  return {
    id: b.osmId,
    osmId: b.osmId,
    name: b.name,
    category,
    address: b.address ?? null,
    phone: b.phone ?? null,
    email: b.email ?? null,
    website: b.website ?? null,
    websiteSource: b.websiteSource ?? null,
    socialLinks: JSON.stringify(b.socialLinks ?? {}),
    lat: b.lat,
    lon: b.lon,
    hasWebsite,
    healthScore: hasWebsite ? null : 0,
    healthFlags: hasWebsite ? null : JSON.stringify(["NO_WEBSITE"]),
    healthDetail: null,
    status: hasWebsite ? "NEW" : "ANALYZED",
    pitchEmail: null,
    pitchWhatsapp: null,
    analyzedAt: hasWebsite ? null : now,
    contactedAt: null,
    createdAt: now,
  };
}

export function mergeLeads(base: LeadDTO[], extra: LeadDTO[]): LeadDTO[] {
  const map = new Map<string, LeadDTO>();
  for (const lead of [...base, ...extra]) {
    map.set(lead.osmId || lead.id, lead);
  }
  return [...map.values()];
}

export function statsFromLeads(leads: LeadDTO[]) {
  const scored = leads.filter((l) => l.healthScore != null);
  const avg =
    scored.length === 0
      ? null
      : scored.reduce((s, l) => s + (l.healthScore ?? 0), 0) / scored.length;
  return {
    total: leads.length,
    noSite: leads.filter((l) => !l.hasWebsite).length,
    critical: leads.filter(
      (l) => l.hasWebsite && l.healthScore !== null && l.healthScore <= 45
    ).length,
    contacted: leads.filter((l) => l.status === "CONTACTED").length,
    won: leads.filter((l) => l.status === "WON").length,
    avgScore: avg,
    filtered: leads.length,
  };
}
