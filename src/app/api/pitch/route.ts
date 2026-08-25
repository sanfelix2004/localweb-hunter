// POST /api/pitch — Genera il cold pitch personalizzato per un lead.
// Body: { leadId: string, channel: "email" | "whatsapp" }
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePitch } from "@/lib/pitch";
import { getCategory } from "@/lib/categories";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { leadId, channel, lead: payload } = await req.json();
    if (!["email", "whatsapp"].includes(channel)) {
      return NextResponse.json(
        { error: "channel (email|whatsapp) obbligatorio" },
        { status: 400 }
      );
    }

    const fromDb = leadId
      ? await prisma.lead.findUnique({ where: { id: leadId } }).catch(() => null)
      : null;
    const lead = fromDb ?? payload;
    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    const detail = (() => {
      if (!lead.healthDetail) return {};
      try {
        return JSON.parse(lead.healthDetail);
      } catch {
        return {};
      }
    })();
    const issues: string[] = detail.issuesHuman ?? [];

    const pitch = await generatePitch({
      businessName: lead.name,
      category: getCategory(lead.category)?.label ?? lead.category,
      city: lead.address ?? undefined,
      hasWebsite: lead.hasWebsite,
      website: lead.website ?? undefined,
      issues,
      channel,
    });

    const fullText = pitch.subject
      ? `Oggetto: ${pitch.subject}\n\n${pitch.body}`
      : pitch.body;

    await prisma.lead
      .update({
        where: { id: lead.id },
        data:
          channel === "email"
            ? { pitchEmail: fullText }
            : { pitchWhatsapp: pitch.body },
      })
      .catch(() => undefined);

    return NextResponse.json({ ...pitch });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
