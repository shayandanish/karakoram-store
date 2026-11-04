// ── Regions of Gilgit-Baltistan Carousel (DB-driven) ─────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { cloudinaryImage, cloudinarySrcSet } from '../../lib/utils';

const AUTO_PLAY_MS = 5000;

/* ── Static fallback data (shown while DB has no entries) ───── */
const STATIC_REGIONS = [
  {
    _id: 's1', name: 'Hunza Valley', tagline: 'Heaven on Earth',
    body: 'Nestled between Rakaposhi and Ultar Sar, Hunza is famed for its turquoise river, ancient Baltit Fort, apricot orchards in bloom, and the legendary longevity of its people.',
    image: { url: '/regions/hunza.webp' }, accentColor: '#f89535',
  },
  {
    _id: 's2', name: 'Nagar Valley', tagline: 'Land of Glaciers & Orchards',
    body: "Across the Hunza River from its twin valley, Nagar boasts spectacular views of Rakaposhi's south face, Batura Glacier, and terraced fields bursting with cherries and walnuts.",
    image: { url: '/regions/nagar.webp' }, accentColor: '#5f89b7',
  },
  {
    _id: 's3', name: 'Ghizer Valley', tagline: "Gilgit-Baltistan's Green Crown",
    body: 'Carpeted in dense pine forests and threaded by the crystal-clear Ghizer River, this remote valley is a paradise for trout fishing, trekking, and experiencing unspoiled Shina culture.',
    image: { url: '/regions/ghizer.webp' }, accentColor: '#3f6d9e',
  },
  {
    _id: 's4', name: 'Astore Valley', tagline: 'In the Shadow of Nanga Parbat',
    body: "Gateway to the Rupal face of Nanga Parbat — the world's ninth highest peak — Astore offers dramatic high-altitude meadows, glaciers, and the serene Rama Lake.",
    image: { url: '/regions/astore.webp' }, accentColor: '#f07a18',
  },
  {
    _id: 's5', name: 'Diamer Valley', tagline: 'Gateway to the Killer Mountain',
    body: 'Home to the Diamer-Bhasha Dam site and the northern face of Nanga Parbat, Diamer is a rugged land of deep gorges, gushing rivers, and warm Kohistani hospitality.',
    image: { url: '/regions/diamer.webp' }, accentColor: '#ba4d0d',
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
    image: { url: '/regions/skardu.webp' }, accentColor: '#5f89b7',
  },
];

export default function RegionsCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef(null);

  /* Fetch from DB — fall back to static if empty */
  const { data, isLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/cities').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const regions = data?.cities?.length
    ? data.cities
    : isLoading
    ? []
    : STATIC_REGIONS;
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

  /* Auto-play (disabled when the visitor prefers reduced motion) */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener?.('change', updatePreference);
    return () => mediaQuery.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || paused || total === 0) return undefined;
    timerRef.current = setTimeout(next, AUTO_PLAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [active, paused, prefersReducedMotion, next, total]);

  if (total === 0) return null;

  const nextIndex = total > 1 ? (active + 1) % total : -1;

  return (
    <section id="explore-gb" className="scroll-mt-40 border-t border-cream-200 bg-cream-50 py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot-600 mb-2">
            Discover Gilgit-Baltistan
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-mountain-900">
            Regions of Gilgit-Baltistan
          </h2>
          <p className="mt-3 text-sm text-mountain-500 max-w-xl mx-auto leading-relaxed">
            Explore the valleys where our products are sourced.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="relative overflow-hidden border border-cream-300"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          role="region"
          aria-label="Regions of Gilgit-Baltistan"
        >
          {/* ── Slides ──────────────────────────────────────── */}
          <div className="relative h-[360px] w-full sm:h-[420px] lg:h-[480px]">
            {regions.map((r, idx) => {
              // Keep only the visible slide and the next one mounted. All
              // slides share the same viewport-sized box, so rendering the
              // full list makes the browser fetch every region photo at once.
              if (idx !== active && idx !== nextIndex) return null;

              const isActive = idx === active;
              const hasImage = Boolean(r.image?.url);
              return (
                <div
                  key={r._id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isActive ? 'z-10 opacity-100' : 'z-0 opacity-0'
                  }`}
                  aria-hidden={!isActive}
                >
                  {/* Background */}
                  {hasImage ? (
                    <img
                      src={cloudinaryImage(r.image.url, {
                        width: 1280,
                        crop: 'limit',
                        quality: 'auto:good',
                        format: 'auto',
                      })}
                      srcSet={cloudinarySrcSet(r.image.url, [640, 960, 1280, 1600], {
                        crop: 'limit',
                        quality: 'auto:good',
                        format: 'auto',
                      })}
                      sizes="(min-width: 1280px) 1280px, 100vw"
                      alt={isActive ? r.name : ''}
                      width={1280}
                      height={853}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      fetchPriority={isActive ? 'auto' : 'low'}
                      decoding="async"
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
                      <span className="select-none text-[120px] opacity-10">🏔️</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14">
                    <div className="max-w-2xl">
                      {/* Tagline */}
                      {r.tagline && (
                        <span className="mb-4 inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                          <span className="h-1 w-1 bg-apricot-300" aria-hidden="true" />
                          {r.tagline}
                        </span>
                      )}

                      {/* Title */}
                      <h3 className="mb-3 font-display text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
                        {r.name}
                      </h3>

                      {/* Body */}
                      <p className="mb-6 line-clamp-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                        {r.body}
                      </p>

                      {/* CTA */}
                      <Link
                        to="/shop"
                        tabIndex={isActive ? undefined : -1}
                        className="inline-flex items-center gap-2 bg-white px-6 py-2.5 text-sm font-semibold text-mountain-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 focus-visible:ring-offset-mountain-900"
                      >
                        Shop products from GB
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Progress bar */}
            <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-white/15">
              <div
                key={`${active}-progress`}
                className="h-full bg-apricot-400"
                style={{ animation: paused ? 'none' : `gbProgress ${AUTO_PLAY_MS}ms linear forwards` }}
              />
            </div>

            {/* Prev */}
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/30 bg-mountain-950/40 text-white backdrop-blur-sm transition-colors hover:bg-mountain-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 sm:left-5 sm:h-11 sm:w-11"
              aria-label="Previous region"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/30 bg-mountain-950/40 text-white backdrop-blur-sm transition-colors hover:bg-mountain-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 sm:right-5 sm:h-11 sm:w-11"
              aria-label="Next region"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slide counter */}
            <div className="absolute right-4 top-4 z-20 border border-white/25 bg-mountain-950/50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {active + 1} / {total}
            </div>
          </div>

          {/* ── Thumbnail strip ────────────────────────────── */}
          <div
            className="flex gap-2 overflow-x-auto border-t border-cream-300 bg-cream-50 px-4 py-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {regions.map((r, idx) => {
              const hasImg = Boolean(r.image?.url);
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => goTo(idx)}
                  className={`relative shrink-0 snap-start overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apricot-500 ${
                    idx === active
                      ? 'border-apricot-600 opacity-100'
                      : 'border-cream-300 opacity-60 hover:opacity-100'
                  }`}
                  style={{ width: 80, height: 56 }}
                  aria-label={`Go to ${r.name}`}
                  aria-current={idx === active ? 'true' : undefined}
                >
                  {hasImg ? (
                    <img
                      src={cloudinaryImage(r.image.url, {
                        width: 160,
                        height: 112,
                        crop: 'fill',
                        gravity: 'auto',
                        quality: 'auto:eco',
                        format: 'auto',
                      })}
                      alt=""
                      width={160}
                      height={112}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      fetchPriority="low"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mountain-800 to-mountain-900">
                      <span className="text-xl" aria-hidden="true">🏔️</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-1">
                    <span className="line-clamp-2 text-left text-[9px] font-semibold leading-tight text-white">
                      {r.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-6 flex justify-center gap-1" role="group" aria-label="Choose a region">
          {regions.map((r, idx) => (
            <button
              key={r._id}
              type="button"
              aria-current={idx === active ? 'true' : undefined}
              onClick={() => goTo(idx)}
              className="group flex h-6 w-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2"
              aria-label={`Show ${r.name}`}
            >
              <span
                className={`h-0.5 transition-all duration-300 ${
                  idx === active
                    ? 'w-6 bg-apricot-600'
                    : 'w-3 bg-mountain-300 group-hover:bg-apricot-400'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes gbProgress { from { width: 0% } to { width: 100% } }
      `}</style>
    </section>
  );
}
