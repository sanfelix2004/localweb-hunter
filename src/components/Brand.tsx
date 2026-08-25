import Link from "next/link";

export function Brand({
  href = "/",
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <span className="relative grid place-items-center w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/25">
        <span className="absolute inset-1 rounded-full border border-cyan-300/30" />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee]" />
      </span>
      <span className="font-display font-semibold tracking-tight text-[1.05rem] leading-none">
        LocalWeb{" "}
        <em className="not-italic text-cyan-300 group-hover:text-cyan-200 transition-colors">
          Hunter
        </em>
      </span>
      {!compact && (
        <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--faint)] border border-[var(--line)] rounded-full px-2 py-0.5">
          radar v1
        </span>
      )}
    </Link>
  );
}
