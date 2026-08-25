"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { Icons } from "./Icons";

interface Props {
  onScanComplete: (summary: string) => void;
  onError: (message: string) => void;
}

const PHASES = [
  "Geocoding della zona",
  "Discovery OpenStreetMap",
  "Arricchimento siti ufficiali",
  "Analisi Health Score",
];

export default function ScanForm({ onScanComplete, onError }: Props) {
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [radius, setRadius] = useState(3000);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setPhase(0);
    try {
      setPhase(1);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, categoryId, radius }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante la scansione");

      setPhase(2);
      setPhase(3);
      let analyzed = 0;
      for (let i = 0; i < 20; i++) {
        const anRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const anData = await anRes.json();
        const n = anData.analyzed ?? 0;
        analyzed += n;
        if (!n) break;
      }

      onScanComplete(
        `${data.found} attività · ${data.noWebsite} senza sito · ${analyzed} analizzati`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
      setPhase(0);
    }
  }

  return (
    <form onSubmit={handleScan} className="glass rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="kicker">Nuova caccia</p>
          <h2 className="font-display text-lg font-semibold text-white mt-1">
            Scansiona una zona
          </h2>
        </div>
        <span className="hidden sm:inline text-[11px] font-mono text-[var(--faint)]">
          OSM · Nominatim · live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto_auto] gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
            Zona
          </span>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Palermo · 90121 · 38.11, 13.36"
            className="field"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
            Categoria
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="field"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 min-w-40">
          <span className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
            Raggio {(radius / 1000).toFixed(1)} km
          </span>
          <input
            type="range"
            min={500}
            max={20000}
            step={500}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="accent-cyan-400 h-10"
          />
        </label>

        <button type="submit" disabled={loading} className="btn btn-primary h-11">
          {loading ? (
            "Scansione…"
          ) : (
            <>
              <Icons.Crosshair className="w-4 h-4" />
              Caccia lead
            </>
          )}
        </button>
      </div>

      {loading && (
        <ol className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {PHASES.map((label, i) => {
            const active = i <= phase;
            return (
              <li
                key={label}
                className={`text-[11px] rounded-xl border px-3 py-2 ${
                  active
                    ? "border-cyan-400/40 text-cyan-200 bg-cyan-400/8"
                    : "border-[var(--line)] text-[var(--faint)]"
                }`}
              >
                <span className="font-mono mr-1.5">0{i + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
      )}
      {error && <p className="text-sm text-rose-300 mt-3">{error}</p>}
    </form>
  );
}
