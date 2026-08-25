// POST /api/analyze — Esegue il Website Health Score sui lead.
// Body: { leadIds?: string[], leads?: LeadDTO[] }
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeWebsite, noWebsiteResult } from "@/lib/health";
import { findOfficialWebsite } from "@/lib/websiteDiscovery";
import { LeadDTO } from "@/lib/types";

export const maxDuration = 60;

const CONCURRENCY = 3;
const BATCH = 8;

async function scoreLead(lead: LeadDTO): Promise<LeadDTO> {
  let website = lead.website;
  let websiteSource = lead.websiteSource;
  if (!website) {
    const hit = await findOfficialWebsite({
      name: lead.name,
      address: lead.address ?? undefined,
      city: lead.address?.split(",").pop()?.trim(),
      lat: lead.lat ?? undefined,
      lon: lead.lon ?? undefined,
    }).catch(() => null);
    if (hit) {
      website = hit.url;
      websiteSource = hit.source;
    }
  }

  const result = website
    ? await analyzeWebsite(website).catch(() => noWebsiteResult())
    : noWebsiteResult();

  const scored: LeadDTO = {
    ...lead,
    website,
    websiteSource,
    hasWebsite: !!website && !result.flags.includes("NO_WEBSITE"),
    healthScore: result.score,
    healthFlags: JSON.stringify(result.flags),
    healthDetail: JSON.stringify({
      ...result.detail,
      websiteSource,
      issuesHuman: result.issuesHuman,
    }),
    status: lead.status === "NEW" ? "ANALYZED" : lead.status,
    analyzedAt: new Date().toISOString(),
  };

  await prisma.lead
    .update({
      where: { id: lead.id },
      data: {
        website: scored.website,
        websiteSource: scored.websiteSource,
        hasWebsite: scored.hasWebsite,
        healthScore: scored.healthScore,
        healthFlags: scored.healthFlags,
        healthDetail: scored.healthDetail,
        status: scored.status,
        analyzedAt: new Date(),
      },
    })
    .catch(() => undefined);

  return scored;
}

async function runQueue(items: LeadDTO[]) {
  const queue = [...items];
  const out: LeadDTO[] = [];
  async function worker() {
    while (queue.length) {
      const lead = queue.shift();
      if (!lead) break;
      out.push(await scoreLead(lead));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker)
  );
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const incoming: LeadDTO[] | undefined = body.leads;

  if (Array.isArray(incoming) && incoming.length) {
    const scored = await runQueue(incoming.slice(0, BATCH));
    return NextResponse.json({ analyzed: scored.length, leads: scored });
  }

  try {
    const leadIds: string[] | undefined = body.leadIds;
    const rows = await prisma.lead.findMany({
      where: leadIds?.length ? { id: { in: leadIds } } : { healthScore: null },
      take: BATCH,
    });
    if (!rows.length) {
      return NextResponse.json({ analyzed: 0, leads: [] });
    }
    const asDto = rows.map((row) => ({
      ...row,
      analyzedAt: row.analyzedAt?.toISOString() ?? null,
      contactedAt: row.contactedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })) as LeadDTO[];
    const scored = await runQueue(asDto);
    return NextResponse.json({ analyzed: scored.length, leads: scored });
  } catch {
    return NextResponse.json({
      analyzed: 0,
      leads: [],
      error: "Analisi senza archivio: invia i lead nel body.",
    });
  }
}
