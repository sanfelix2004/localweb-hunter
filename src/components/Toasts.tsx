"use client";

import { useEffect } from "react";

export interface ToastItem {
  id: number;
  message: string;
  tone?: "ok" | "err";
}

export default function Toasts({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-stack">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), 4200);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  return (
    <div
      className={`toast glass rounded-xl px-4 py-3 text-sm min-w-64 max-w-sm flex items-start gap-3 ${
        item.tone === "err" ? "border-rose-400/30" : "border-cyan-400/25"
      }`}
    >
      <span className="flex-1">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-[var(--faint)] hover:text-white"
        aria-label="Chiudi notifica"
      >
        ×
      </button>
    </div>
  );
}
