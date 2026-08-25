// DTO e costanti condivisi tra API e frontend (nessun import server-only).

export type HealthFlag =
  | "NO_WEBSITE"
  | "SITE_UNREACHABLE"
  | "NO_SSL"
  | "NOT_MOBILE_FRIENDLY"
  | "SLOW_LOADING"
  | "VERY_SLOW_LOADING"
  | "DEPRECATED_TECH"
  | "TABLE_LAYOUT"
  | "OUTDATED_COPYRIGHT"
  | "OBSOLETE_GENERATOR"
  | "POOR_SEO_META"
  | "NO_MODERN_MARKUP"
  | "LOW_PAGESPEED";

/** Etichette italiane per la UI. */
export const FLAG_LABELS: Record<HealthFlag, string> = {
  NO_WEBSITE: "Nessun sito",
  SITE_UNREACHABLE: "Sito irraggiungibile",
  NO_SSL: "No HTTPS",
  NOT_MOBILE_FRIENDLY: "Non mobile-friendly",
  SLOW_LOADING: "Lento",
  VERY_SLOW_LOADING: "Molto lento",
  DEPRECATED_TECH: "Tecnologie deprecate",
  TABLE_LAYOUT: "Layout a tabelle",
  OUTDATED_COPYRIGHT: "Copyright vecchio",
  OBSOLETE_GENERATOR: "Software obsoleto",
  POOR_SEO_META: "SEO carente",
  NO_MODERN_MARKUP: "Markup datato",
  LOW_PAGESPEED: "PageSpeed basso",
};

export interface LeadDTO {
  id: string;
  osmId: string | null;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  websiteSource: string | null;
  socialLinks: string | null;
  lat: number | null;
  lon: number | null;
  hasWebsite: boolean;
  healthScore: number | null;
  healthFlags: string | null;
  healthDetail: string | null;
  status: string;
  pitchEmail: string | null;
  pitchWhatsapp: string | null;
  analyzedAt: string | null;
  contactedAt: string | null;
  createdAt: string;
}

export function parseFlags(lead: LeadDTO): HealthFlag[] {
  if (!lead.healthFlags) return [];
  try {
    return JSON.parse(lead.healthFlags);
  } catch {
    return [];
  }
}

export interface HealthDetailView {
  finalUrl?: string;
  https: boolean;
  reachable: boolean;
  loadTimeMs?: number;
  hasViewport?: boolean;
  hasFlash?: boolean;
  hasFrameset?: boolean;
  tableLayout?: boolean;
  copyrightYear?: number;
  generator?: string;
  hasOgTags?: boolean;
  hasDescription?: boolean;
  html5Doctype?: boolean;
  pagespeedScore?: number;
  httpStatus?: number;
  websiteSource?: string;
  issuesHuman?: string[];
}

export function parseHealthDetail(lead: LeadDTO): HealthDetailView | null {
  if (!lead.healthDetail) return null;
  try {
    return JSON.parse(lead.healthDetail) as HealthDetailView;
  } catch {
    return null;
  }
}

export function parseSocial(lead: LeadDTO): Record<string, string> {
  if (!lead.socialLinks) return {};
  try {
    const parsed = JSON.parse(lead.socialLinks) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Score effettivo in UI: senza sito = 0. */
export function effectiveScore(lead: LeadDTO): number | null {
  if (!lead.hasWebsite) return 0;
  return lead.healthScore;
}

/** Colore di gravità: score basso = rosso (lead caldo). */
export function scoreColor(score: number | null): string {
  if (score === null) return "#64748b"; // non analizzato
  if (score <= 20) return "#ef4444";
  if (score <= 45) return "#f97316";
  if (score <= 70) return "#eab308";
  return "#22c55e";
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "Da analizzare";
  if (score <= 20) return "Critico";
  if (score <= 45) return "Grave";
  if (score <= 70) return "Migliorabile";
  return "Buono";
}

export const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuovo",
  ANALYZED: "Analizzato",
  CONTACTED: "Contattato",
  WON: "Cliente",
  DISCARDED: "Scartato",
};

export const SOURCE_LABELS: Record<string, string> = {
  osm: "OSM",
  wikidata: "Wikidata",
  google_places: "Google",
  nominatim: "OSM+",
  web_search: "Ricerca web",
  domain_guess: "Dominio",
};
