"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { LeadDTO, scoreColor, scoreLabel, effectiveScore } from "@/lib/types";

interface Props {
  leads: LeadDTO[];
  onOpenPitch: (lead: LeadDTO) => void;
  onOpen: (lead: LeadDTO) => void;
}

function FitBounds({ leads }: { leads: LeadDTO[] }) {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 40);
    const pts = leads.filter((l) => l.lat != null && l.lon != null);
    if (!pts.length) return () => window.clearTimeout(t);
    if (pts.length === 1) {
      map.setView([pts[0].lat!, pts[0].lon!], 14);
    } else {
      const bounds = L.latLngBounds(
        pts.map((l) => [l.lat!, l.lon!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    }
    return () => window.clearTimeout(t);
  }, [leads, map]);
  return null;
}

export default function LeadMap({ leads, onOpenPitch, onOpen }: Props) {
  const located = leads.filter((l) => l.lat != null && l.lon != null);
  const center: [number, number] = located.length
    ? [located[0].lat!, located[0].lon!]
    : [41.9028, 12.4964];

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "min(68vh, 640px)", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds leads={located} />
        {located.map((lead) => {
          const score = effectiveScore(lead);
          const color = scoreColor(score);
          return (
            <CircleMarker
              key={lead.id}
              center={[lead.lat!, lead.lon!]}
              radius={score !== null && score <= 20 ? 11 : 8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.82,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm min-w-44">
                  <div className="font-semibold">{lead.name}</div>
                  <div className="text-xs opacity-70 mb-1">{lead.address ?? ""}</div>
                  <div className="text-xs mb-3">
                    Score{" "}
                    <strong style={{ color }}>
                      {score ?? "—"} · {scoreLabel(score)}
                    </strong>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onOpen(lead)}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15"
                    >
                      Dettaglio
                    </button>
                    <button
                      onClick={() => onOpenPitch(lead)}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold"
                    >
                      Pitch
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="absolute left-3 bottom-8 z-[400] glass rounded-xl px-3 py-2 text-[11px] flex gap-3 text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-rose-400" /> Critico
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-amber-400" /> Grave
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-emerald-400" /> Solido
        </span>
      </div>
    </div>
  );
}
