// POST /api/analyze — Esegue il Website Health Score sui lead.
// Body: { leadIds?: string[] }  → se assente, analizza tutti i lead non ancora analizzati.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeWebsite, noWebsiteResult } from "@/lib/health";

export const maxDuration = 300;

const CONCURRENCY = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const leadIds: string[] | undefined = body.leadIds;

  const leads = await prisma.lead.findMany({
    where: leadIds?.length
      ? { id: { in: leadIds } }
      : { healthScore: null },
    take: 100,
  });

  if (!leads.length) {
    return NextResponse.json({ analyzed: 0, message: "Nessun lead da analizzare" });
  }

  let analyzed = 0;
  const queue = [...leads];

  async function worker() {
    while (queue.length) {
      const lead = queue.shift();
      if (!lead) break;
      const result = lead.website
        ? await analyzeWebsite(lead.website).catch(() => noWebsiteResult())
        : noWebsiteResult();

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          healthScore: result.score,
          healthFlags: JSON.stringify(result.flags),
          healthDetail: JSON.stringify({
            ...result.detail,
            issuesHuman: result.issuesHuman,
          }),
          status: lead.status === "NEW" ? "ANALYZED" : lead.status,
          analyzedAt: new Date(),
        },
      });
      analyzed++;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, leads.length) }, worker)
  );

  return NextResponse.json({ analyzed });
}
