"use client";

import {
  LeadDTO,
  parseFlags,
  STATUS_LABELS,
  FLAG_LABELS,
  SOURCE_LABELS,
  effectiveScore,
} from "@/lib/types";
import { getCategory } from "@/lib/categories";
import ScoreBadge from "./ScoreBadge";
import { Icons } from "./Icons";

interface Props {
  leads: LeadDTO[];
  selected: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (lead: LeadDTO) => void;
  onOpenPitch: (lead: LeadDTO) => void;
  onAnalyze: (lead: LeadDTO) => void;
  analyzingIds: Set<string>;
  sortKey: "score" | "name" | "status";
  sortDir: "asc" | "desc";
  onSort: (key: "score" | "name" | "status") => void;
}

export default function LeadTable({
  leads,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onOpenPitch,
  onAnalyze,
  analyzingIds,
  sortKey,
  sortDir,
  onSort,
}: Props) {
  const allChecked = leads.length > 0 && leads.every((l) => selected.has(l.id));

  if (!leads.length) {
    return (
      <div className="glass rounded-2xl py-20 text-center">
        <Icons.Radar className="w-8 h-8 mx-auto text-cyan-300/70 mb-3" />
        <p className="font-display text-xl text-white">Nessun lead in vista</p>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-sm mx-auto">
          Avvia una scansione oppure allenta i filtri. Il radar è pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto glass rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="accent-cyan-400"
                aria-label="Seleziona tutti"
              />
            </th>
            <SortTh
              label="Attività"
              active={sortKey === "name"}
              dir={sortDir}
              onClick={() => onSort("name")}
              align="left"
            />
            <SortTh
              label="Score"
              active={sortKey === "score"}
              dir={sortDir}
              onClick={() => onSort("score")}
            />
            <th className="text-left px-4 py-3 font-medium">Problemi</th>
            <th className="text-left px-4 py-3 font-medium">Contatti</th>
            <SortTh
              label="Stato"
              active={sortKey === "status"}
              dir={sortDir}
              onClick={() => onSort("status")}
            />
            <th className="text-right px-4 py-3 font-medium">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const flags = parseFlags(lead);
            return (
              <tr
                key={lead.id}
                className="lead-row border-t border-[var(--line)] cursor-pointer"
                onClick={() => onOpen(lead)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={(e) => onToggle(lead.id, e.target.checked)}
                    className="accent-cyan-400"
                    aria-label={`Seleziona ${lead.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{lead.name}</div>
                  <div className="text-xs text-[var(--faint)] mt-0.5">
                    {getCategory(lead.category)?.label ?? lead.category}
                    {lead.address ? ` · ${lead.address}` : ""}
                  </div>
                  {lead.website && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-cyan-300 hover:underline break-all"
                      >
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                      {lead.websiteSource && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--muted)] shrink-0">
                          {SOURCE_LABELS[lead.websiteSource] ?? lead.websiteSource}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={effectiveScore(lead)} />
                </td>
                <td className="px-4 py-3 max-w-56">
                  <div className="flex flex-wrap gap-1">
                    {flags.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-200 border border-rose-500/15"
                      >
                        {FLAG_LABELS[f] ?? f}
                      </span>
                    ))}
                    {flags.length > 3 && (
                      <span className="text-[10px] text-[var(--faint)]">
                        +{flags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]">
                  {lead.phone && <div>{lead.phone}</div>}
                  {lead.email && <div>{lead.email}</div>}
                  {!lead.phone && !lead.email && (
                    <span className="text-[var(--faint)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={lead.status} />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1.5 justify-end">
                    {lead.hasWebsite && (
                      <button
                        onClick={() => onAnalyze(lead)}
                        disabled={analyzingIds.has(lead.id)}
                        title="Rianalizza il sito"
                        className="btn btn-ghost btn-icon"
                      >
                        <Icons.Refresh
                          className={`w-3.5 h-3.5 ${analyzingIds.has(lead.id) ? "animate-spin" : ""}`}
                        />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenPitch(lead)}
                      className="btn btn-primary btn-sm"
                    >
                      <Icons.Spark className="w-3.5 h-3.5" />
                      Pitch
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={`${align === "left" ? "text-left" : "text-right"} px-4 py-3 font-medium`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-white ${active ? "text-white" : ""}`}
      >
        {label}
        {active && <span className="font-mono text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls =
    status === "CONTACTED"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "ANALYZED"
        ? "bg-sky-500/15 text-sky-300"
        : status === "WON"
          ? "bg-cyan-500/15 text-cyan-200"
          : status === "DISCARDED"
            ? "bg-white/5 text-[var(--faint)]"
            : "bg-white/6 text-slate-300";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
