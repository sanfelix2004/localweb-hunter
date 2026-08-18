// POST /api/contact/email — Invio 1-click via Resend.
// Body: { leadId: string, to: string, subject: string, body: string }
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { leadId, to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "to, subject e body sono obbligatori" },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, body });

    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "CONTACTED", contactedAt: new Date(), email: to },
      });
    }

    return NextResponse.json({ sent: true, id: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
