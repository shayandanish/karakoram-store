// ── Regions of Gilgit-Baltistan Carousel (DB-driven) ─────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';

const AUTO_PLAY_MS = 5000;

/* ── Static fallback data (shown while DB has no entries) ───── */
const STATIC_REGIONS = [
  {
    _id: 's1', name: 'Hunza Valley', tagline: 'Heaven on Earth',
    body: 'Nestled between Rakaposhi and Ultar Sar, Hunza is famed for its turquoise river, ancient Baltit Fort, apricot orchards in bloom, and the legendary longevity of its people.',
    image: { url: '/regions/hunza.jpg' }, accentColor: '#f89535',
  },
  {
    _id: 's2', name: 'Nagar Valley', tagline: 'Land of Glaciers & Orchards',
    body: "Across the Hunza River from its twin valley, Nagar boasts spectacular views of Rakaposhi's south face, Batura Glacier, and terraced fields bursting with cherries and walnuts.",
    image: { url: '/regions/nagar.jpg' }, accentColor: '#5f89b7',
  },
  {
    _id: 's3', name: 'Ghizer Valley', tagline: "Gilgit-Baltistan's Green Crown",
    body: 'Carpeted in dense pine forests and threaded by the crystal-clear Ghizer River, this remote valley is a paradise for trout fishing, trekking, and experiencing unspoiled Shina culture.',
    image: { url: '/regions/ghizer.jpg' }, accentColor: '#3f6d9e',
  },
  {
    _id: 's4', name: 'Astore Valley', tagline: 'In the Shadow of Nanga Parbat',
    body: "Gateway to the Rupal face of Nanga Parbat — the world's ninth highest peak — Astore offers dramatic high-altitude meadows, glaciers, and the serene Rama Lake.",
    image: { url: '/regions/astore.jpg' }, accentColor: '#f07a18',
  },
  {
    _id: 's5', name: 'Diamer Valley', tagline: 'Gateway to the Killer Mountain',
    body: 'Home to the Diamer-Bhasha Dam site and the northern face of Nanga Parbat, Diamer is a rugged land of deep gorges, gushing rivers, and warm Kohistani hospitality.',
    image: { url: '/regions/diamer.jpg' }, accentColor: '#ba4d0d',
  },
  {
    _id: 's6', name: 'Gilgit City', tagline: 'Crossroads of Civilisations',
    body: 'The administrative capital of Gilgit-Baltistan sits at the confluence of three mighty rivers. Its vibrant bazaars, ancient petroglyphs, and Silk Road heritage make it a living museum.',
    image: { url: '' }, accentColor: '#87a9cc',
  },
  {
    _id: 's7', name: 'Baltistan', tagline: 'Land of K2 & Ancient Forts',
    body: 'Baltistan — "Little Tibet" — harbours K2, Broad Peak, and the Baltoro Glacier, alongside the jewelled Shangrila Resort, majestic Shigar Fort, and a rich Tibetan-influenced culture.',
    image: { url: '' }, accentColor: '#e0630e',
  },
  {
    _id: 's8', name: 'Skardu', tagline: 'Base Camp to the Giants',
    body: "Perched on a high plateau between towering peaks, Skardu is the launchpad for K2 expeditions and home to the mystical Deosai Plains, Sheosar Lake, and Kachura — one of the world's most photographed valleys.",
    image: { url: '/regions/skardu.jpg' }, accentColor: '#5f89b7',
  },
];

export default function RegionsCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  /* Fetch from DB — fall back to static if empty */
  const { data } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/cities').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const regions = (data?.cities && data.cities.length > 0) ? data.cities : STATIC_REGIONS;
  const total = regions.length;

  const goTo = useCallback((idx) => {
    setActive((idx + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  /* Reset active if region list shrinks */
  useEffect(() => {
    if (active >= total) setActive(0);
  }, [total, active]);

  /* Auto-play */
  useEffect(() => {
    if (paused || total === 0) return;
    timerRef.current = setTimeout(next, AUTO_PLAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [active, paused, next, total]);

  /* Keyboard */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  if (total === 0) return null;

  const region = regions[active];

  return (
    <section id="explore-gb" className="py-20 scroll-mt-40 bg-gradient-to-b from-cream-100 to-cream-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-apricot-500 text-xs font-semibold uppercase tracking-widest mb-2">
            Discover Gilgit-Baltistan
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-mountain-900">
            Explore the Land We Source From
          </h2>
          <p className="mt-3 text-mountain-500 text-sm max-w-xl mx-auto leading-relaxed">
            Every product in our store carries the spirit of these magnificent valleys.
            Swipe through to learn about the regions that inspire us.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-label="Regions of Gilgit-Baltistan"
        >
          {/* ── Slides ──────────────────────────────────────── */}
          <div className="relative h-[480px] sm:h-[520px] lg:h-[560px] w-full">
            {regions.map((r, idx) => {
              const isActive = idx === active;
              const hasImage = Boolean(r.image?.url);
              return (
                <div
                  key={r._id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                  aria-hidden={!isActive}
                >
                  {/* Background */}
                  {hasImage ? (
                    <img
                      src={r.image.url}
                      alt={r.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-mountain-900 via-mountain-800 to-mountain-700"
                      aria-hidden="true"
                    />
                  )}

                  {/* Overlay */}
                  <div
                    className={`absolute inset-0 ${
                      hasImage
                        ? 'bg-gradient-to-t from-mountain-950/90 via-mountain-900/40 to-transparent'
                        : 'bg-mountain-950/20'
                    }`}
                    aria-hidden="true"
                  />

                  {/* Emoji backdrop for no-image cards */}
                  {!hasImage && (
                    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      <span className="text-[120px] opacity-10 select-none">🏔️</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14">
                    <div className="max-w-2xl">
                      {/* Tagline pill */}
                      {r.tagline && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 text-white/90 border border-white/20 backdrop-blur-sm"
                          style={{ backgroundColor: `${r.accentColor || '#f89535'}40` }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: r.accentColor || '#f89535' }}
                          />
                          {r.tagline}
                        </span>
                      )}

                      {/* Title */}
                      <h3 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
                        {r.name}
                      </h3>

                      {/* Body */}
                      <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl mb-6 line-clamp-4">
                        {r.body}
                      </p>

                      {/* CTA */}
                      <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                        style={{ backgroundColor: r.accentColor || '#f89535' }}
                      >
                        Shop Products from GB
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 z-20 h-1 bg-white/10">
              <div
                key={`${active}-progress`}
                className="h-full bg-apricot-400 rounded-full"
                style={{ animation: paused ? 'none' : `gbProgress ${AUTO_PLAY_MS}ms linear forwards` }}
              />
            </div>

            {/* Prev */}
            <button
              onClick={prev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400"
              aria-label="Previous region"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next */}
            <button
              onClick={next}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400"
              aria-label="Next region"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slide counter */}
            <div className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {active + 1} / {total}
            </div>
          </div>

          {/* ── Thumbnail strip ────────────────────────────── */}
          <div className="bg-mountain-900 px-4 py-4 flex gap-2 overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {regions.map((r, idx) => {
              const hasImg = Boolean(r.image?.url);
              return (
                <button
                  key={r._id}
                  onClick={() => goTo(idx)}
                  className={`snap-start shrink-0 rounded-xl overflow-hidden relative transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 ${
                    idx === active
                      ? 'ring-2 ring-apricot-400 scale-105 opacity-100'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{ width: 80, height: 56 }}
                  aria-label={`Go to ${r.name}`}
                  aria-current={idx === active ? 'true' : undefined}
                >
                  {hasImg ? (
                    <img src={r.image.url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-mountain-800 to-mountain-900"
                      style={{ borderColor: r.accentColor }}
                    >
                      <span className="text-xl" aria-hidden="true">🏔️</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-1">
                    <span className="text-[9px] font-semibold text-white leading-tight line-clamp-2 text-left">
                      {r.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Region slides">
          {regions.map((r, idx) => (
            <button
              key={r._id}
              role="tab"
              aria-selected={idx === active}
              onClick={() => goTo(idx)}
              className={`rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 ${
                idx === active
                  ? 'w-7 h-2.5 bg-apricot-500'
                  : 'w-2.5 h-2.5 bg-mountain-300 hover:bg-apricot-300'
              }`}
              aria-label={r.name}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes gbProgress { from { width: 0% } to { width: 100% } }
      `}</style>
    </section>
  );
}
