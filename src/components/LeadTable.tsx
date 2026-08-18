"use client";

import { LeadDTO, parseFlags, STATUS_LABELS, FLAG_LABELS, SOURCE_LABELS } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import ScoreBadge from "./ScoreBadge";

interface Props {
  leads: LeadDTO[];
  onOpenPitch: (lead: LeadDTO) => void;
  onAnalyze: (lead: LeadDTO) => void;
  analyzingIds: Set<string>;
}

export default function LeadTable({
  leads,
  onOpenPitch,
  onAnalyze,
  analyzingIds,
}: Props) {
  if (!leads.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        Nessun lead. Avvia una scansione per iniziare la caccia. 🎯
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium">Attività</th>
            <th className="text-left px-4 py-3 font-medium">Score</th>
            <th className="text-left px-4 py-3 font-medium">Problemi</th>
            <th className="text-left px-4 py-3 font-medium">Contatti</th>
            <th className="text-left px-4 py-3 font-medium">Stato</th>
            <th className="text-right px-4 py-3 font-medium">Azioni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {leads.map((lead) => {
            const flags = parseFlags(lead);
            return (
              <tr key={lead.id} className="hover:bg-slate-900/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{lead.name}</div>
                  <div className="text-xs text-slate-500">
                    {getCategory(lead.category)?.label ?? lead.category}
                    {lead.address ? ` · ${lead.address}` : ""}
                  </div>
                  {lead.website && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:underline break-all"
                      >
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                      {lead.websiteSource && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                          {SOURCE_LABELS[lead.websiteSource] ?? lead.websiteSource}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={lead.hasWebsite ? lead.healthScore : 0} />
                </td>
                <td className="px-4 py-3 max-w-56">
                  <div className="flex flex-wrap gap-1">
                    {flags.slice(0, 4).map((f) => (
                      <span
                        key={f}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20"
                      >
                        {FLAG_LABELS[f] ?? f}
                      </span>
                    ))}
                    {flags.length > 4 && (
                      <span className="text-[10px] text-slate-500">
                        +{flags.length - 4}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {lead.phone && <div>📞 {lead.phone}</div>}
                  {lead.email && <div>📧 {lead.email}</div>}
                  {!lead.phone && !lead.email && (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      lead.status === "CONTACTED"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : lead.status === "ANALYZED"
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-slate-700/40 text-slate-300"
                    }`}
                  >
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 justify-end">
                    {lead.hasWebsite && (
                      <button
                        onClick={() => onAnalyze(lead)}
                        disabled={analyzingIds.has(lead.id)}
                        title="(Ri)analizza il sito"
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                      >
                        {analyzingIds.has(lead.id) ? "⏳" : "🔍"}
                      </button>
                    )}
                    <button
                      onClick={() => onOpenPitch(lead)}
                      title="Genera pitch e contatta"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      ✍️ Pitch
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
