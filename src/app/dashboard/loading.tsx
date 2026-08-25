export default function DashboardLoading() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 py-8 space-y-5">
      <div className="h-10 w-64 rounded-lg bg-white/5 animate-pulse" />
      <div className="h-28 rounded-2xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="h-[420px] rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}
