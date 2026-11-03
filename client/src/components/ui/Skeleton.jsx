// ── Skeleton loaders ──────────────────────────────────────────
// Shapes mirror the real components so there is no layout shift when
// content arrives. `.shimmer` is defined in index.css.
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm" aria-hidden="true">
      <div className="shimmer aspect-[4/5] w-full bg-cream-200" />
      <div className="space-y-3 p-4">
        <div className="shimmer h-3 w-1/3 rounded-full bg-cream-200" />
        <div className="shimmer h-4 w-3/4 rounded bg-cream-200" />
        <div className="shimmer h-3 w-1/2 rounded bg-cream-200" />
        <div className="flex items-end justify-between gap-3 border-t border-cream-100 pt-3">
          <div className="shimmer h-5 w-24 rounded bg-apricot-100" />
          <div className="shimmer h-3 w-16 rounded bg-cream-200" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4 rounded bg-cream-200"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="grid gap-8 md:grid-cols-2" aria-hidden="true">
      <div className="shimmer aspect-square rounded-2xl bg-cream-200" />
      <div className="space-y-4">
        <div className="shimmer h-8 w-2/3 rounded bg-cream-200" />
        <div className="shimmer h-4 w-1/3 rounded bg-cream-200" />
        <div className="shimmer h-6 w-1/4 rounded bg-apricot-100" />
        <div className="space-y-2">
          {[100, 80, 90].map((w, i) => (
            <div key={i} className="shimmer h-4 rounded bg-cream-200" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
