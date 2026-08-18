// DTO condivisi tra API e frontend.
import type { HealthFlag } from "./health";

export interface LeadDTO {
  id: string;
  osmId: string | null;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
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
