"use client";

import { useEffect, useState } from "react";
import { LeadDTO } from "@/lib/types";
import { toWhatsAppNumber } from "@/lib/email";

interface Props {
  lead: LeadDTO;
  onClose: () => void;
  onContacted: () => void;
}

export default function PitchModal({ lead, onClose, onContacted }: Props) {
  const [channel, setChannel] = useState<"email" | "whatsapp">(
    lead.email ? "email" : "whatsapp"
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState(lead.email ?? "");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatedBy, setGeneratedBy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(ch: "email" | "whatsapp") {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, channel: ch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubject(data.subject ?? "");
      setBody(data.body);
      setGeneratedBy(data.generatedBy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generazione pitch");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    generate(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  async function sendEmail() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, to, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onContacted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore invio email");
    } finally {
      setSending(false);
    }
  }

  async function openWhatsApp() {
    if (!lead.phone) return;
    const url = `https://wa.me/${toWhatsAppNumber(lead.phone)}?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    onContacted();
  }

  function copyText() {
    navigator.clipboard.writeText(subject ? `${subject}\n\n${body}` : body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">✍️ Cold Pitch — {lead.name}</h2>
            {generatedBy && (
              <p className="text-xs text-slate-400 mt-0.5">
                {generatedBy === "openai"
                  ? "Generato con AI (OpenAI)"
                  : "Generato da template smart (configura OPENAI_API_KEY per l'AI)"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2">
          {(["email", "whatsapp"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                channel === ch
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {ch === "email" ? "📧 Email" : "💬 WhatsApp"}
            </button>
          ))}
          <button
            onClick={() => generate(channel)}
            disabled={generating}
            className="ml-auto px-4 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            🔄 Rigenera
          </button>
        </div>

        {generating ? (
          <div className="py-12 text-center text-slate-400 animate-pulse">
            Generazione pitch personalizzato…
          </div>
        ) : (
          <>
            {channel === "email" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Destinatario</span>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="email@attivita.it"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Oggetto</span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Messaggio (modificabile)</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={copyText}
            className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700"
          >
            {copied ? "✅ Copiato" : "📋 Copia"}
          </button>
          {channel === "email" ? (
            <button
              onClick={sendEmail}
              disabled={sending || !to || !body}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
            >
              {sending ? "Invio…" : "🚀 Invia Email"}
            </button>
          ) : (
            <button
              onClick={openWhatsApp}
              disabled={!lead.phone || !body}
              title={!lead.phone ? "Nessun telefono disponibile" : ""}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
            >
              💬 Apri WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
