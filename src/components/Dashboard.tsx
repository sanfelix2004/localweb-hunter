"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LeadDTO } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import ScanForm from "./ScanForm";
import LeadTable from "./LeadTable";
import PitchModal from "./PitchModal";

const LeadMap = dynamic(() => import("./LeadMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-xl bg-slate-900 animate-pulse" />
  ),
});

export default function Dashboard() {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [view, setView] = useState<"table" | "map">("table");
  const [maxScore, setMaxScore] = useState(100);
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pitchLead, setPitchLead] = useState<LeadDTO | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState("");

  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (maxScore < 100) params.set("maxScore", String(maxScore));
    if (onlyNoWebsite) params.set("noWebsite", "true");
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
  }, [maxScore, onlyNoWebsite, categoryFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function analyzeLead(lead: LeadDTO) {
    setAnalyzingIds((prev) => new Set(prev).add(lead.id));
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: [lead.id] }),
      });
      await loadLeads();
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  }

  const stats = useMemo(() => {
    const noSite = leads.filter((l) => !l.hasWebsite).length;
    const critical = leads.filter(
      (l) => l.hasWebsite && l.healthScore !== null && l.healthScore <= 45
    ).length;
    const contacted = leads.filter((l) => l.status === "CONTACTED").length;
    return { total: leads.length, noSite, critical, contacted };
  }, [leads]);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🎯 LocalWeb Hunter
          </h1>
          <p className="text-sm text-slate-400">
            Trova attività senza sito o con siti obsoleti · qualifica · contatta
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Stat label="Lead" value={stats.total} />
          <Stat label="Senza sito" value={stats.noSite} accent="text-red-400" />
          <Stat label="Siti critici" value={stats.critical} accent="text-orange-400" />
          <Stat label="Contattati" value={stats.contacted} accent="text-emerald-400" />
        </div>
      </header>

      <ScanForm
        onScanComplete={(summary) => {
          setBanner(summary);
          loadLeads();
        }}
      />

      {banner && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-lg px-4 py-2.5 flex justify-between items-center">
          <span>✅ {banner}</span>
          <button onClick={() => setBanner("")} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {(["table", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm ${
                view === v
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {v === "table" ? "📋 Tabella" : "🗺️ Mappa"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-xs text-slate-400">
            Score max (gravità): <strong className="text-slate-200">{maxScore}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            className="accent-indigo-500 w-36"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyNoWebsite}
            onChange={(e) => setOnlyNoWebsite(e.target.checked)}
            className="accent-red-500"
          />
          Solo senza sito 🔥
        </label>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm ml-auto"
        >
          <option value="">Tutte le categorie</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {view === "table" ? (
        <LeadTable
          leads={leads}
          onOpenPitch={setPitchLead}
          onAnalyze={analyzeLead}
          analyzingIds={analyzingIds}
        />
      ) : (
        <LeadMap leads={leads} onOpenPitch={setPitchLead} />
      )}

      {pitchLead && (
        <PitchModal
          lead={pitchLead}
          onClose={() => setPitchLead(null)}
          onContacted={loadLeads}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "text-slate-100",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-center min-w-20">
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
