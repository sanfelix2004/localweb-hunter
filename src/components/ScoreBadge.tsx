import { scoreColor, scoreLabel } from "@/lib/types";

export default function ScoreBadge({ score }: { score: number | null }) {
  const color = scoreColor(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {score === null ? scoreLabel(score) : `${score} · ${scoreLabel(score)}`}
    </span>
  );
}
