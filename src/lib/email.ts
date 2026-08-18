// Invio email via Resend (REST API, nessun SDK necessario).
// Richiede RESEND_API_KEY e FROM_EMAIL in .env.

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error(
      "Email non configurata: imposta RESEND_API_KEY e FROM_EMAIL nel file .env"
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Invio email fallito (HTTP ${res.status}): ${err}`);
  }
  return res.json() as Promise<{ id: string }>;
}

/** Normalizza un numero di telefono italiano per il link wa.me */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("3") || digits.startsWith("0")) digits = "39" + digits;
  return digits;
}
