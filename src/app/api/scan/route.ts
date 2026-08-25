// POST /api/scan — Discovery pipeline: geocoding + Overpass + salvataggio lead.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { geocode, searchBusinesses } from "@/lib/overpass";
import { enrichMissingWebsites } from "@/lib/websiteDiscovery";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { location, categoryId, radius } = await req.json();
    if (!location || !categoryId) {
      return NextResponse.json(
        { error: "location e categoryId sono obbligatori" },
        { status: 400 }
      );
    }
    const category = getCategory(categoryId);
    if (!category) {
      return NextResponse.json({ error: "Categoria sconosciuta" }, { status: 400 });
    }
    const radiusMeters = Math.min(Math.max(Number(radius) || 3000, 500), 30000);

    const center = await geocode(location);
    const businesses = await searchBusinesses(center, radiusMeters, category);

    const missingIdx = businesses
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => !b.website);
    const hits = await enrichMissingWebsites(
      missingIdx.map(({ b }) => ({
        name: b.name,
        address: b.address,
        city: b.city ?? location,
        lat: b.lat,
        lon: b.lon,
        wikidataId: b.wikidataId,
        osmWebsite: b.website,
      })),
      4
    );
    hits.forEach((hit, n) => {
      if (!hit) return;
      const biz = businesses[missingIdx[n].i];
      biz.website = hit.url;
      biz.websiteSource = hit.source;
    });

    const scan = await prisma.scan.create({
      data: {
        query: location,
        category: category.id,
        lat: center.lat,
        lon: center.lon,
        radius: radiusMeters,
        resultCount: businesses.length,
      },
    });

    let created = 0;
    let updated = 0;
    for (const b of businesses) {
      const data = {
        name: b.name,
        category: category.id,
        address: b.address ?? null,
        phone: b.phone ?? null,
        email: b.email ?? null,
        website: b.website ?? null,
        websiteSource: b.websiteSource ?? null,
        socialLinks: JSON.stringify(b.socialLinks),
        lat: b.lat,
        lon: b.lon,
        hasWebsite: !!b.website,
        scanId: scan.id,
      };
      const existing = await prisma.lead.findUnique({ where: { osmId: b.osmId } });
      if (existing) {
        const websiteJustFound = !!data.website && !existing.website;
        await prisma.lead.update({
          where: { osmId: b.osmId },
          data: {
            ...data,
            ...(websiteJustFound
              ? { healthScore: null, healthFlags: null, healthDetail: null, analyzedAt: null }
              : {}),
          },
        });
        updated++;
      } else {
        await prisma.lead.create({ data: { ...data, osmId: b.osmId } });
        created++;
      }
    }

    return NextResponse.json({
      scanId: scan.id,
      center,
      found: businesses.length,
      created,
      updated,
      noWebsite: businesses.filter((b) => !b.website).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
