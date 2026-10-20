// ── Skeleton loaders ──────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="bg-cream-200 h-52 w-full" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-cream-200 rounded w-3/4" />
        <div className="h-3 bg-cream-200 rounded w-1/2" />
        <div className="h-5 bg-apricot-100 rounded w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-cream-200 rounded"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="animate-pulse grid md:grid-cols-2 gap-8">
      <div className="bg-cream-200 rounded-2xl aspect-square" />
      <div className="space-y-4">
        <div className="h-8 bg-cream-200 rounded w-2/3" />
        <div className="h-4 bg-cream-200 rounded w-1/3" />
        <div className="h-6 bg-apricot-100 rounded w-1/4" />
        <div className="space-y-2">
          {[100, 80, 90].map((w, i) => (
            <div key={i} className="h-4 bg-cream-200 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
