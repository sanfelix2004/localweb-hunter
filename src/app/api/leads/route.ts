// GET /api/leads — Lista lead con filtri per la dashboard.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.LeadWhereInput = {};

  const category = sp.get("category");
  if (category) where.category = category;

  const status = sp.get("status");
  if (status) where.status = status;

  if (sp.get("noWebsite") === "true") where.hasWebsite = false;

  const maxScore = sp.get("maxScore");
  if (maxScore !== null && maxScore !== "") {
    where.OR = [
      { healthScore: { lte: Number(maxScore) } },
      { healthScore: null }, // non ancora analizzati restano visibili
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ healthScore: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  return NextResponse.json({ leads });
}
