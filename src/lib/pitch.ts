// AI Cold-Pitch Generator.
// Con OPENAI_API_KEY genera messaggi ultra-personalizzati via LLM;
// senza chiave usa un template intelligente basato sui problemi rilevati.

export interface PitchInput {
  businessName: string;
  category: string;
  city?: string;
  hasWebsite: boolean;
  website?: string;
  issues: string[]; // problemi in italiano prodotti dall'analisi
  channel: "email" | "whatsapp";
  senderName?: string;
}

export interface PitchResult {
  subject?: string; // solo per email
  body: string;
  generatedBy: "openai" | "template";
}

export async function generatePitch(input: PitchInput): Promise<PitchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      return await generateWithOpenAI(input, apiKey);
    } catch (err) {
      console.error("OpenAI fallito, uso template:", err);
    }
  }
  return generateWithTemplate(input);
}

async function generateWithOpenAI(
  input: PitchInput,
  apiKey: string
): Promise<PitchResult> {
  const isEmail = input.channel === "email";
  const sender = input.senderName || process.env.SENDER_NAME || "un web designer della tua zona";

  const problemList = input.hasWebsite
    ? input.issues.map((i) => `- ${i}`).join("\n")
    : "- L'attività NON ha alcun sito web";

  const prompt = `Scrivi un messaggio ${isEmail ? "email" : "WhatsApp"} di primo contatto (cold outreach) in italiano per proporre servizi web a questa attività locale:

Attività: ${input.businessName}
Categoria: ${input.category}
${input.city ? `Città: ${input.city}` : ""}
${input.website ? `Sito attuale: ${input.website}` : "Sito web: ASSENTE"}

Problemi concreti rilevati dalla nostra analisi tecnica:
${problemList}

Regole:
- Mittente: ${sender}
- Tono: diretto, amichevole, professionale. NON servile, NON aggressivo.
- Cita 2-3 problemi SPECIFICI rilevati (non generici) spiegando l'impatto sul business (clienti persi, figuraccia con chi cerca da smartphone, ecc.)
- Massimo ${isEmail ? "130" : "80"} parole nel corpo.
- Chiudi con una call-to-action leggera (es. "ti va se ti mando 2 esempi?").
- NIENTE placeholder tipo [Nome]: usa i dati reali forniti.
${isEmail ? '- Rispondi in JSON: {"subject": "...", "body": "..."}' : '- Rispondi in JSON: {"body": "..."}'}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return {
    subject: parsed.subject,
    body: parsed.body,
    generatedBy: "openai",
  };
}

function generateWithTemplate(input: PitchInput): PitchResult {
  const sender = input.senderName || process.env.SENDER_NAME || "";
  const firma = sender ? `\n\n${sender}` : "";
  const topIssues = input.issues.slice(0, 3);

  if (!input.hasWebsite) {
    const body =
      `Ciao ${input.businessName}! 👋\n\n` +
      `Cercavo ${input.category.toLowerCase()} in zona e ho notato una cosa: non avete un sito web. ` +
      `Oggi 8 clienti su 10 cercano su Google prima di scegliere, e chi non trova un sito spesso passa al concorrente successivo.\n\n` +
      `Mi occupo proprio di siti per attività locali: veloci, ottimizzati per smartphone e pensati per farvi trovare. ` +
      `Vi va se vi mando un paio di esempi di lavori simili? Nessun impegno.` +
      firma;
    return {
      subject: `${input.businessName}: i clienti vi cercano online ma non vi trovano`,
      body,
      generatedBy: "template",
    };
  }

  const issueText = topIssues.length
    ? topIssues.map((i, idx) => `${idx + 1}. ${capitalize(i)}` ).join("\n")
    : "1. Il sito mostra diversi segnali di obsolescenza tecnica";

  const body =
    `Ciao ${input.businessName}! 👋\n\n` +
    `Ho dato un'occhiata al vostro sito${input.website ? ` (${input.website})` : ""} e da un'analisi tecnica sono emersi alcuni problemi concreti:\n\n` +
    `${issueText}\n\n` +
    `Sono dettagli che fanno perdere clienti ogni giorno, soprattutto chi vi cerca dallo smartphone. ` +
    `Mi occupo di rimettere in sesto siti di attività locali: vi va se vi mando 2 esempi di prima/dopo? Nessun impegno.` +
    firma;

  return {
    subject: `${input.businessName}: 3 problemi del vostro sito che vi costano clienti`,
    body,
    generatedBy: "template",
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
