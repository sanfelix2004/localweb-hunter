"use client";

import { useEffect, useState } from "react";
import { LeadDTO } from "@/lib/types";
import { toWhatsAppNumber } from "@/lib/email";
import { Icons } from "./Icons";

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
        body: JSON.stringify({ leadId: lead.id, lead, channel: ch }),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- generate pitch on channel/lead change
    void generate(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, lead.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="modal-enter glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="pitch-title"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">Cold pitch</p>
            <h2 id="pitch-title" className="font-display text-xl font-semibold text-white mt-1">
              {lead.name}
            </h2>
            {generatedBy && (
              <p className="text-xs text-[var(--muted)] mt-1">
                {generatedBy === "openai"
                  ? "Generato con OpenAI sui problemi rilevati"
                  : "Template smart · configura OPENAI_API_KEY per l’AI"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Chiudi">
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["email", "whatsapp"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`btn btn-sm ${channel === ch ? "btn-primary" : "btn-ghost"}`}
            >
              {ch === "email" ? (
                <Icons.Mail className="w-3.5 h-3.5" />
              ) : (
                <Icons.Chat className="w-3.5 h-3.5" />
              )}
              {ch === "email" ? "Email" : "WhatsApp"}
            </button>
          ))}
          <button
            onClick={() => generate(channel)}
            disabled={generating}
            className="btn btn-ghost btn-sm ml-auto"
          >
            <Icons.Refresh className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            Rigenera
          </button>
        </div>

        {generating ? (
          <div className="py-16 text-center text-[var(--muted)]">
            <div className="w-8 h-8 mx-auto mb-3 rounded-full border border-cyan-400/40 border-t-cyan-300 animate-spin" />
            Composizione del pitch…
          </div>
        ) : (
          <>
            {channel === "email" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
                    Destinatario
                  </span>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="email@attivita.it"
                    className="field"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
                    Oggetto
                  </span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="field"
                  />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
                Messaggio
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                className="field leading-relaxed min-h-48"
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={copyText} className="btn btn-ghost btn-sm">
            {copied ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiato" : "Copia"}
          </button>
          {channel === "email" ? (
            <button
              onClick={sendEmail}
              disabled={sending || !to || !body}
              className="btn btn-primary btn-sm"
            >
              {sending ? "Invio…" : "Invia email"}
            </button>
          ) : (
            <button
              onClick={openWhatsApp}
              disabled={!lead.phone || !body}
              title={!lead.phone ? "Nessun telefono disponibile" : ""}
              className="btn btn-primary btn-sm"
            >
              <Icons.Chat className="w-3.5 h-3.5" />
              Apri WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
