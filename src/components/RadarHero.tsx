const PINS = [
  { x: 168, y: 118, hot: true, delay: "0s" },
  { x: 292, y: 156, hot: true, delay: "0.6s" },
  { x: 214, y: 268, hot: false, delay: "1.1s" },
  { x: 318, y: 232, hot: true, delay: "1.7s" },
  { x: 140, y: 210, hot: false, delay: "2.2s" },
];

export default function RadarHero() {
  return (
    <div className="radar-stage radar-float">
      <div className="absolute inset-6 rounded-full bg-cyan-400/5 blur-2xl" />
      <svg className="radar-svg relative" viewBox="0 0 480 480" role="img" aria-label="Radar territoriale dei lead">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.16" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <circle cx="240" cy="240" r="210" fill="url(#radarFill)" />
        {[70, 120, 170, 210].map((r) => (
          <circle
            key={r}
            cx="240"
            cy="240"
            r={r}
            fill="none"
            stroke="rgba(34,211,238,0.22)"
            strokeWidth="1"
          />
        ))}
        <line x1="240" y1="30" x2="240" y2="450" stroke="rgba(34,211,238,0.12)" />
        <line x1="30" y1="240" x2="450" y2="240" stroke="rgba(34,211,238,0.12)" />
        <line x1="92" y1="92" x2="388" y2="388" stroke="rgba(34,211,238,0.08)" />
        <line x1="388" y1="92" x2="92" y2="388" stroke="rgba(34,211,238,0.08)" />

        <g className="radar-sweep">
          <path d="M240 240 L240 30 A210 210 0 0 1 390 160 Z" fill="url(#sweepGrad)" />
          <line x1="240" y1="240" x2="240" y2="30" stroke="#67e8f9" strokeWidth="2" />
        </g>

        {PINS.map((p) => (
          <g key={`${p.x}-${p.y}`} transform={`translate(${p.x} ${p.y})`}>
            <circle
              r="10"
              fill={p.hot ? "#fb7185" : "#34d399"}
              opacity="0.25"
              className="radar-ping"
              style={{ animationDelay: p.delay }}
            />
            <circle r="4.5" fill={p.hot ? "#fb7185" : "#34d399"} />
          </g>
        ))}

        <circle cx="240" cy="240" r="4" fill="#e8eef8" />
        <circle cx="240" cy="240" r="9" fill="none" stroke="#22d3ee" strokeWidth="1.4" />
      </svg>

      <div className="absolute left-0 right-0 -bottom-2 flex justify-center gap-4 text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-rose-400" /> Nessun sito
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-emerald-400" /> Presenza ok
        </span>
      </div>
    </div>
  );
}
