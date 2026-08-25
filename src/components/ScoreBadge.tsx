import { scoreColor, scoreLabel } from "@/lib/types";

export default function ScoreBadge({
  score,
  compact = false,
}: {
  score: number | null;
  compact?: boolean;
}) {
  const color = scoreColor(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {score === null
        ? scoreLabel(score)
        : compact
          ? score
          : `${score} · ${scoreLabel(score)}`}
    </span>
  );
}

export function ScoreRing({
  score,
  size = 88,
}: {
  score: number | null;
  size?: number;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="rgba(148,197,255,0.12)"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="font-display text-xl font-bold leading-none" style={{ color }}>
          {score ?? "—"}
        </span>
      </div>
    </div>
  );
}
