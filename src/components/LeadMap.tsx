"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { LeadDTO, scoreColor, scoreLabel } from "@/lib/types";

interface Props {
  leads: LeadDTO[];
  onOpenPitch: (lead: LeadDTO) => void;
}

export default function LeadMap({ leads, onOpenPitch }: Props) {
  const located = leads.filter((l) => l.lat != null && l.lon != null);
  const center: [number, number] = located.length
    ? [located[0].lat!, located[0].lon!]
    : [41.9028, 12.4964]; // Roma fallback

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: 520, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {located.map((lead) => {
        const effScore = lead.hasWebsite ? lead.healthScore : 0;
        const color = scoreColor(effScore);
        return (
          <CircleMarker
            key={lead.id}
            center={[lead.lat!, lead.lon!]}
            radius={9}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.75,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm min-w-44">
                <div className="font-semibold">{lead.name}</div>
                <div className="text-xs opacity-75 mb-1">
                  {lead.address ?? ""}
                </div>
                <div className="text-xs mb-2">
                  Score:{" "}
                  <strong style={{ color }}>
                    {effScore ?? "—"} ({scoreLabel(effScore)})
                  </strong>
                </div>
                <button
                  onClick={() => onOpenPitch(lead)}
                  className="w-full text-xs px-2 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  ✍️ Genera Pitch
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
