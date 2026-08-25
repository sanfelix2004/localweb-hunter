"use client";

import { useEffect } from "react";
import {
  LeadDTO,
  parseFlags,
  parseHealthDetail,
  parseSocial,
  FLAG_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  effectiveScore,
} from "@/lib/types";
import { getCategory } from "@/lib/categories";
import ScoreBadge, { ScoreRing } from "./ScoreBadge";
import { Icons } from "./Icons";
import { StatusPill } from "./LeadTable";

interface Props {
  lead: LeadDTO;
  onClose: () => void;
  onPitch: (lead: LeadDTO) => void;
  onAnalyze: (lead: LeadDTO) => void;
  onChanged: () => void;
  analyzing: boolean;
}

export default function LeadDrawer({
  lead,
  onClose,
  onPitch,
  onAnalyze,
  onChanged,
  analyzing,
}: Props) {
  const flags = parseFlags(lead);
  const detail = parseHealthDetail(lead);
  const social = parseSocial(lead);
  const score = effectiveScore(lead);
  const status = lead.status;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveStatus(next: string) {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    onChanged();
  }

  async function remove() {
    if (!confirm(`Eliminare ${lead.name}?`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    onChanged();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="drawer-enter h-full w-full max-w-md glass border-l border-[var(--line)] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="lead-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker">Scheda lead</p>
            <h2 id="lead-title" className="font-display text-2xl font-bold text-white mt-1">
              {lead.name}
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              {getCategory(lead.category)?.label ?? lead.category}
              {lead.address ? ` · ${lead.address}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Chiudi">
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <ScoreRing score={score} />
          <div className="space-y-2">
            <ScoreBadge score={score} />
            <StatusPill status={status} />
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
            Pipeline
          </span>
          <select
            value={status}
            onChange={(e) => saveStatus(e.target.value)}
            className="field"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="btn btn-ghost btn-sm">
              <Icons.Phone className="w-3.5 h-3.5" />
              Chiama
            </a>
          )}
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <Icons.External className="w-3.5 h-3.5" />
              Sito
            </a>
          )}
          <button onClick={() => onPitch(lead)} className="btn btn-primary btn-sm col-span-2">
            <Icons.Spark className="w-3.5 h-3.5" />
            Genera pitch
          </button>
          {lead.hasWebsite && (
            <button
              onClick={() => onAnalyze(lead)}
              disabled={analyzing}
              className="btn btn-ghost btn-sm col-span-2"
            >
              <Icons.Refresh className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
              {analyzing ? "Analisi in corso…" : "Rianalizza sito"}
            </button>
          )}
        </div>

        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-[var(--faint)] mb-2">
            Contatti
          </h3>
          <ul className="space-y-1.5 text-sm">
            <li className="text-[var(--muted)]">{lead.phone ?? "Telefono assente"}</li>
            <li className="text-[var(--muted)]">{lead.email ?? "Email assente"}</li>
            {lead.website && (
              <li className="text-cyan-300 break-all">
                {lead.website}
                {lead.websiteSource && (
                  <span className="ml-2 text-[10px] text-[var(--faint)]">
                    {SOURCE_LABELS[lead.websiteSource] ?? lead.websiteSource}
                  </span>
                )}
              </li>
            )}
          </ul>
        </section>

        {flags.length > 0 && (
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-[var(--faint)] mb-2">
              Problemi rilevati
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {flags.map((f) => (
                <span
                  key={f}
                  className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-200 border border-rose-500/15"
                >
                  {FLAG_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </section>
        )}

        {detail && (
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-[var(--faint)] mb-2">
              Diagnostica
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <Fact k="HTTPS" v={detail.https ? "Sì" : "No"} />
              <Fact k="Raggiungibile" v={detail.reachable ? "Sì" : "No"} />
              <Fact
                k="Caricamento"
                v={detail.loadTimeMs != null ? `${detail.loadTimeMs} ms` : "—"}
              />
              <Fact k="Viewport" v={detail.hasViewport ? "Sì" : "No"} />
              <Fact k="Meta description" v={detail.hasDescription ? "Sì" : "No"} />
              <Fact k="Open Graph" v={detail.hasOgTags ? "Sì" : "No"} />
              {detail.generator && <Fact k="Generator" v={detail.generator} />}
              {detail.copyrightYear && <Fact k="Copyright" v={String(detail.copyrightYear)} />}
              {detail.pagespeedScore != null && (
                <Fact k="PageSpeed" v={String(detail.pagespeedScore)} />
              )}
            </dl>
            {detail.issuesHuman && detail.issuesHuman.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                {detail.issuesHuman.map((issue) => (
                  <li key={issue}>· {issue}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {Object.keys(social).length > 0 && (
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-[var(--faint)] mb-2">
              Social
            </h3>
            <ul className="space-y-1 text-sm">
              {Object.entries(social).map(([k, v]) => (
                <li key={k}>
                  <a
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:underline"
                  >
                    {k}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button onClick={remove} className="btn btn-danger btn-sm mt-auto self-start">
          <Icons.Trash className="w-3.5 h-3.5" />
          Elimina lead
        </button>
      </aside>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] px-3 py-2">
      <dt className="text-[var(--faint)]">{k}</dt>
      <dd className="text-white mt-0.5 truncate" title={v}>
        {v}
      </dd>
    </div>
  );
}
