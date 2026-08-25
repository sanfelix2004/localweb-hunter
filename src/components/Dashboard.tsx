"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LeadDTO, STATUS_LABELS, effectiveScore } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { mergeLeads, statsFromLeads } from "@/lib/mapLead";
import ScanForm from "./ScanForm";
import LeadTable from "./LeadTable";
import PitchModal from "./PitchModal";
import LeadDrawer from "./LeadDrawer";
import Toasts, { ToastItem } from "./Toasts";
import { Brand } from "./Brand";
import { Icons } from "./Icons";

const LeadMap = dynamic(() => import("./LeadMap"), {
  ssr: false,
  loading: () => <div className="h-[520px] rounded-2xl glass animate-pulse" />,
});

interface Stats {
  total: number;
  noSite: number;
  critical: number;
  contacted: number;
  won: number;
  avgScore: number | null;
  filtered: number;
}

const EMPTY_STATS: Stats = {
  total: 0,
  noSite: 0,
  critical: 0,
  contacted: 0,
  won: 0,
  avgScore: null,
  filtered: 0,
};

const STORAGE = "lwh-leads-v1";

function readLocal(): LeadDTO[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as LeadDTO[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(next: LeadDTO[]) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next.slice(0, 500)));
  } catch {
    /* ignore quota */
  }
}

export default function Dashboard() {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [view, setView] = useState<"table" | "map">("table");
  const [maxScore, setMaxScore] = useState(100);
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"score" | "name" | "status">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pitchLead, setPitchLead] = useState<LeadDTO | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [help, setHelp] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(1);

  const notify = useCallback((message: string, tone: "ok" | "err" = "ok") => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (maxScore < 100) params.set("maxScore", String(maxScore));
    if (onlyNoWebsite) params.set("noWebsite", "true");
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.leads) && data.leads.length) {
        setLeads(data.leads);
        writeLocal(data.leads);
        if (data.stats) setStats(data.stats);
        return;
      }
      const local = readLocal();
      if (local.length) {
        setLeads(local);
        setStats(statsFromLeads(local));
      }
    } catch {
      const local = readLocal();
      if (local.length) {
        setLeads(local);
        setStats(statsFromLeads(local));
      }
    }
  }, [maxScore, onlyNoWebsite, categoryFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch archive
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setHelp((h) => !h);
      }
      if (e.key === "t" && !typing) setView("table");
      if (e.key === "m" && !typing) setView("map");
      if (e.key === "Escape") {
        setHelp(false);
        setOpenId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function analyzeLead(lead: LeadDTO) {
    setAnalyzingIds((prev) => new Set(prev).add(lead.id));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: [lead.id], leads: [lead] }),
      });
      const data = await res.json();
      if (Array.isArray(data.leads) && data.leads.length) {
        setLeads((prev) => {
          const next = mergeLeads(prev, data.leads);
          writeLocal(next);
          setStats(statsFromLeads(next));
          return next;
        });
      } else {
        await loadLeads();
      }
      notify(`Analisi completata: ${lead.name}`);
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  }

  async function analyzeSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    ids.forEach((id) =>
      setAnalyzingIds((prev) => new Set(prev).add(id))
    );
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids }),
      });
      await loadLeads();
      notify(`${ids.length} lead analizzati`);
      setSelected(new Set());
    } finally {
      setAnalyzingIds(new Set());
    }
  }

  function exportCsv() {
    const rows = [
      ["Nome", "Categoria", "Indirizzo", "Telefono", "Email", "Sito", "Score", "Stato"],
      ...visible.map((l) => [
        l.name,
        l.category,
        l.address ?? "",
        l.phone ?? "",
        l.email ?? "",
        l.website ?? "",
        String(effectiveScore(l) ?? ""),
        l.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "localweb-hunter-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("CSV esportato");
  }

  function toggleSort(key: "score" | "name" | "status") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const q = query.trim().toLowerCase();
  const visible = (q
    ? leads.filter((l) =>
        [l.name, l.address, l.website, l.email, l.phone]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      )
    : leads
  )
    .slice()
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "it");
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else {
        const sa = effectiveScore(a);
        const sb = effectiveScore(b);
        cmp = (sa ?? 999) - (sb ?? 999);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const drawerLead = openId ? (leads.find((l) => l.id === openId) ?? null) : null;

  return (
    <div className="app-shell">
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-3">
          <Brand href="/" compact />
          <div className="hidden md:flex items-center flex-1 max-w-md ml-4 relative">
            <Icons.Search className="w-4 h-4 absolute left-3 text-[var(--faint)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca attività, sito, telefono…"
              className="field pl-9"
            />
            <kbd className="absolute right-3 text-[10px] font-mono text-[var(--faint)] border border-[var(--line)] rounded px-1.5 py-0.5">
              /
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setHelp(true)}
              className="btn btn-ghost btn-icon"
              title="Scorciatoie"
            >
              <Icons.Help className="w-4 h-4" />
            </button>
            <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto w-full px-4 py-6 flex flex-col gap-5 flex-1">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="kicker">Command center</p>
            <h1 className="font-display text-3xl font-bold text-white mt-1">
              Coda territoriale
            </h1>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {stats.filtered} in vista · {stats.total} in archivio
          </p>
        </div>

        <ScanForm
          onScanComplete={(summary, scanned) => {
            notify(summary);
            if (scanned.length) {
              setLeads((prev) => {
                const next = mergeLeads(prev, scanned);
                writeLocal(next);
                setStats(statsFromLeads(next));
                return next;
              });
            }
            void loadLeads();
          }}
          onError={(message) => notify(message, "err")}
        />

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Lead" value={stats.total} />
          <Stat label="Senza sito" value={stats.noSite} tone="hot" />
          <Stat label="Siti critici" value={stats.critical} tone="warn" />
          <Stat label="Contattati" value={stats.contacted} tone="ok" />
          <Stat
            label="Score medio"
            value={stats.avgScore == null ? "—" : Math.round(stats.avgScore)}
            tone="cyan"
          />
        </section>

        <div className="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full overflow-hidden border border-[var(--line)]">
            {(["table", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-sm inline-flex items-center gap-1.5 ${
                  view === v ? "bg-cyan-400 text-slate-950 font-semibold" : "text-[var(--muted)] hover:text-white"
                }`}
              >
                {v === "table" ? (
                  <Icons.Table className="w-3.5 h-3.5" />
                ) : (
                  <Icons.Map className="w-3.5 h-3.5" />
                )}
                {v === "table" ? "Tabella" : "Mappa"}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="text-xs">
              Score max <strong className="text-white">{maxScore}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className="accent-cyan-400 w-28"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={onlyNoWebsite}
              onChange={(e) => setOnlyNoWebsite(e.target.checked)}
              className="accent-rose-400"
            />
            Solo senza sito
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field !py-1.5 !rounded-full w-auto text-xs"
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="field !py-1.5 !rounded-full w-auto text-xs md:ml-auto"
          >
            <option value="">Tutte le categorie</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <button onClick={exportCsv} className="btn btn-ghost btn-sm" disabled={!visible.length}>
            <Icons.Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        <div className="md:hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca…"
            className="field"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 text-sm text-cyan-100">
            <span className="font-mono">{selected.size} selezionati</span>
            <button onClick={analyzeSelected} className="btn btn-primary btn-sm">
              Analizza selezione
            </button>
            <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm">
              Annulla
            </button>
          </div>
        )}

        {view === "table" ? (
          <LeadTable
            leads={visible}
            selected={selected}
            onToggle={(id, checked) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(id);
                else next.delete(id);
                return next;
              })
            }
            onToggleAll={(checked) =>
              setSelected(checked ? new Set(visible.map((l) => l.id)) : new Set())
            }
            onOpen={(lead) => setOpenId(lead.id)}
            onOpenPitch={setPitchLead}
            onAnalyze={analyzeLead}
            analyzingIds={analyzingIds}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        ) : (
          <LeadMap
            leads={visible}
            onOpenPitch={setPitchLead}
            onOpen={(lead) => setOpenId(lead.id)}
          />
        )}
      </main>

      {drawerLead && (
        <LeadDrawer
          lead={drawerLead}
          onClose={() => setOpenId(null)}
          onPitch={(l) => {
            setPitchLead(l);
          }}
          onAnalyze={analyzeLead}
          onChanged={loadLeads}
          analyzing={analyzingIds.has(drawerLead.id)}
        />
      )}

      {pitchLead && (
        <PitchModal
          lead={pitchLead}
          onClose={() => setPitchLead(null)}
          onContacted={() => {
            notify(`Contattato: ${pitchLead.name}`);
            loadLeads();
          }}
        />
      )}

      {help && (
        <div
          className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setHelp(false)}
        >
          <div
            className="modal-enter glass rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="kicker mb-3">Scorciatoie</p>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li className="flex justify-between"><kbd className="font-mono text-white">/</kbd> Cerca</li>
              <li className="flex justify-between"><kbd className="font-mono text-white">T</kbd> Tabella</li>
              <li className="flex justify-between"><kbd className="font-mono text-white">M</kbd> Mappa</li>
              <li className="flex justify-between"><kbd className="font-mono text-white">Esc</kbd> Chiudi</li>
              <li className="flex justify-between"><kbd className="font-mono text-white">?</kbd> Questa guida</li>
            </ul>
          </div>
        </div>
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "hot" | "warn" | "ok" | "cyan";
}) {
  const color =
    tone === "hot"
      ? "text-rose-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "ok"
          ? "text-emerald-300"
          : tone === "cyan"
            ? "text-cyan-300"
            : "text-white";
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className={`stat-value font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--faint)] mt-1">
        {label}
      </div>
    </div>
  );
}
