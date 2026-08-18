// PATCH /api/leads/[id] — Aggiorna stato/email/telefono di un lead.
// DELETE /api/leads/[id] — Elimina un lead.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const key of ["status", "email", "phone", "website"] as const) {
    if (key in body) allowed[key] = body[key];
  }
  if (body.status === "CONTACTED") allowed.contactedAt = new Date();

  try {
    const lead = await prisma.lead.update({ where: { id }, data: allowed });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }
}
