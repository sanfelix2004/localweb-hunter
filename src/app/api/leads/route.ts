// GET /api/leads — Lista lead con filtri per la dashboard.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const and: Prisma.LeadWhereInput[] = [];

  const category = sp.get("category");
  if (category) and.push({ category });

  const status = sp.get("status");
  if (status) and.push({ status });

  if (sp.get("noWebsite") === "true") and.push({ hasWebsite: false });

  const maxScore = sp.get("maxScore");
  if (maxScore !== null && maxScore !== "") {
    and.push({
      OR: [{ healthScore: { lte: Number(maxScore) } }, { healthScore: null }],
    });
  }

  const q = sp.get("q")?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    });
  }

  const where: Prisma.LeadWhereInput = and.length ? { AND: and } : {};

  try {
    const [leads, total, noSite, critical, contacted, won, avg] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: [{ healthScore: "asc" }, { createdAt: "desc" }],
        take: 500,
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { hasWebsite: false } }),
      prisma.lead.count({
        where: { hasWebsite: true, healthScore: { lte: 45 } },
      }),
      prisma.lead.count({ where: { status: "CONTACTED" } }),
      prisma.lead.count({ where: { status: "WON" } }),
      prisma.lead.aggregate({ _avg: { healthScore: true } }),
    ]);

    return NextResponse.json({
      leads,
      stats: {
        total,
        noSite,
        critical,
        contacted,
        won,
        avgScore: avg._avg.healthScore,
        filtered: leads.length,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Archivio non raggiungibile. Controlla DATABASE_URL e riprova.",
        leads: [],
        stats: {
          total: 0,
          noSite: 0,
          critical: 0,
          contacted: 0,
          won: 0,
          avgScore: null,
          filtered: 0,
        },
      },
      { status: 503 }
    );
  }
}
