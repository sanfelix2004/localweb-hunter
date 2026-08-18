"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

interface Props {
  onScanComplete: (summary: string) => void;
}

export default function ScanForm({ onScanComplete }: Props) {
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [radius, setRadius] = useState(3000);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setPhase("Ricerca attività in corso…");
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, categoryId, radius }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante la scansione");

      setPhase(`Trovate ${data.found} attività. Analisi siti web in corso…`);
      const anRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const anData = await anRes.json();

      onScanComplete(
        `${data.found} attività trovate (${data.noWebsite} senza sito) · ${anData.analyzed ?? 0} siti analizzati`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
      setPhase("");
    }
  }

  return (
    <form
      onSubmit={handleScan}
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Zona (città, CAP o lat,lon)
          </span>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="es. Palermo · 90121 · 38.11,13.36"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Categoria
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 min-w-36">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Raggio: {(radius / 1000).toFixed(1)} km
          </span>
          <input
            type="range"
            min={500}
            max={20000}
            step={500}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="accent-indigo-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-6 py-2 text-sm transition-colors"
        >
          {loading ? "Scansione…" : "🎯 Caccia Lead"}
        </button>
      </div>

      {phase && (
        <p className="text-sm text-indigo-300 animate-pulse">{phase}</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
