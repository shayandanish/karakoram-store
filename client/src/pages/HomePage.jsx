// ── Home Page ─────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import ProductCard from '../components/ui/ProductCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';
import RegionsCarousel from '../components/ui/RegionsCarousel';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { cloudinaryImage, cloudinarySrcSet } from '../lib/utils';

const HERO_STATS = [
  { icon: '🛍️', value: '100+', label: 'Curated products' },
  { icon: '💛', value: '5,000+', label: 'Happy customers' },
  { icon: '🏔️', value: '100%', label: 'Locally sourced' },
  { icon: '📱', value: 'Easypaisa', label: 'Instant transfer' },
];

const PROMISES = [
  {
    icon: 'truck',
    title: 'Nationwide delivery',
    desc: 'Flat Rs. 200 shipping anywhere in Pakistan.',
  },
  {
    icon: 'wallet',
    title: 'Easypaisa payment',
    desc: 'Fast, secure transfer to 0349 5144486 (Shayan Danish).',
  },
  {
    icon: 'mountain',
    title: 'Straight from source',
    desc: 'Sourced directly from Gilgit-Baltistan farmers and artisans.',
  },
];

// Shown while the city/region API is loading or if no region images exist.
const HERO_REGION_FALLBACK = [
  { _id: 'hero-hunza', name: 'Hunza Valley', tagline: 'Heaven on Earth', image: { url: '/regions/hunza.webp' } },
  { _id: 'hero-nagar', name: 'Nagar Valley', tagline: 'Land of Glaciers & Orchards', image: { url: '/regions/nagar.webp' } },
  { _id: 'hero-ghizer', name: 'Ghizer Valley', tagline: "Gilgit-Baltistan's Green Crown", image: { url: '/regions/ghizer.webp' } },
  { _id: 'hero-astore', name: 'Astore Valley', tagline: 'In the Shadow of Nanga Parbat', image: { url: '/regions/astore.webp' } },
  { _id: 'hero-diamer', name: 'Diamer Valley', tagline: 'Gateway to the Killer Mountain', image: { url: '/regions/diamer.webp' } },
  { _id: 'hero-skardu', name: 'Skardu', tagline: 'Base Camp to the Giants', image: { url: '/regions/skardu.webp' } },
];

// Avoid downloading the multi-megabyte local fallback photos while the city
// API is still loading. The gradient placeholder keeps the hero layout stable.
const HERO_LOADING_REGION = {
  _id: 'hero-loading',
  name: 'Gilgit-Baltistan',
  tagline: 'Loading regions…',
  image: { url: '' },
};

// Categories that should always be available in the landing navigation.
// They link to shop search until a matching category is created in the database.
const EXTRA_NAV_ITEMS = [
  { name: 'Natural Herbs', slug: 'natural-herbs', search: 'herbs' },
  { name: 'Natural Honey', slug: 'natural-honey', search: 'honey' },
  { name: 'Natural Butter', slug: 'natural-butter', search: 'butter' },
  { name: 'Organic Oil', slug: 'organic-oil', search: 'oil' },
  { name: 'Seasonal Fruits', slug: 'seasonal-fruits', search: 'fruit' },
  { name: 'Stone', slug: 'stone', search: 'stone' },
  { name: 'Cultural Apparel', slug: 'cultural-apparel', search: 'apparel' },
];

function ArrowRightIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PromiseIcon({ name, className = 'h-6 w-6' }) {
  if (name === 'truck') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5V16H3V7.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10h3.6a1 1 0 01.8.4l1.2 1.6a1 1 0 01.2.6V16h-5.8" />
        <circle cx="7" cy="18" r="1.75" />
        <circle cx="17" cy="18" r="1.75" />
      </svg>
    );
  }

  if (name === 'wallet') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M16 13h2" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 19l6-9 3.5 5L16 9l5 10H3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5L9 5l1.5 2.5" />
    </svg>
  );
}

function HeroStat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-apricot-50 text-lg" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="font-display text-xl font-bold leading-none text-mountain-900">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-mountain-500">{label}</p>
      </div>
    </div>
  );
}

function LandingSubnav({ categories }) {
  const { logo } = useSiteSettings();
  const stickyTop = logo?.url ? 'top-[6.5rem]' : 'top-16';
  const linkClass =
    'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-mountain-600 transition-colors hover:bg-apricot-50 hover:text-apricot-700';

  const extraItems = EXTRA_NAV_ITEMS.filter(
    (item) =>
      !categories.some(
        (category) =>
          category.name.toLowerCase() === item.name.toLowerCase() ||
          category.slug.includes(item.slug)
      )
  );

  return (
    <nav
      aria-label="Landing page shortcuts"
      className={`sticky ${stickyTop} z-40 border-b border-cream-200 bg-cream-50/95 shadow-sm backdrop-blur-md`}
    >
      <div
        className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 lg:flex-wrap lg:overflow-visible lg:px-8 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        <Link
          to="/shop"
          className="shrink-0 rounded-full bg-mountain-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-mountain-800"
          title="Shop all categories"
        >
          Categories
        </Link>

        {categories.map((category) => (
          <Link
            key={category._id}
            to={`/shop?category=${encodeURIComponent(category.slug)}`}
            className={linkClass}
            title={`Shop ${category.name}`}
          >
            {category.name}
          </Link>
        ))}

        {extraItems.map((item) => (
          <Link
            key={item.slug}
            to={`/shop?search=${encodeURIComponent(item.search)}`}
            className={linkClass}
            title={`Shop ${item.name}`}
          >
            {item.name}
          </Link>
        ))}

        <span className="mx-1 h-4 w-px shrink-0 bg-cream-300" aria-hidden="true" />

        <a href="#hero" className={linkClass}>
          Our Story
        </a>
        <a href="#featured-products" className={linkClass}>
          Featured
        </a>
        <a href="#explore-gb" className={linkClass}>
          Regions
        </a>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-cream-50 via-cream-50/80 to-transparent lg:hidden"
        aria-hidden="true"
      />
    </nav>
  );
}

export default function HomePage() {
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [regionsPaused, setRegionsPaused] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: citiesData, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/cities').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const {
    data: featuredData,
    isLoading: featLoading,
    error: featError,
    refetch: refetchFeat,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?limit=8&sort=-createdAt').then((r) => r.data),
    staleTime: 2 * 60_000,
  });

  const categories = categoriesData || [];
  const featured = featuredData?.products || [];

  const cityRegions = (citiesData?.cities || []).filter((region) => region.image?.url);
  const heroRegions =
    cityRegions.length > 0
      ? cityRegions
      : citiesLoading
      ? [HERO_LOADING_REGION]
      : HERO_REGION_FALLBACK;
  const activeRegionIndexSafe = heroRegions.length ? activeRegionIndex % heroRegions.length : 0;
  const activeRegion = heroRegions[activeRegionIndexSafe] || HERO_REGION_FALLBACK[0];
  const nextRegionIndex =
    heroRegions.length > 1 ? (activeRegionIndexSafe + 1) % heroRegions.length : -1;

  // Map a city/region record to the slug understood by the shop filter.
  const regionKey = ['hunza', 'nagar', 'ghizer', 'skardu', 'astore', 'diamer', 'gilgit'].find((key) =>
    `${activeRegion.slug || ''} ${activeRegion.name || ''}`.toLowerCase().includes(key)
  );
  const activeRegionShopPath = regionKey
    ? `/shop?region=${encodeURIComponent(regionKey)}`
    : '/shop';

  useEffect(() => {
    if (regionsPaused || heroRegions.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveRegionIndex((index) => (index + 1) % heroRegions.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroRegions.length, regionsPaused]);

  return (
    <div>
      <SEO
        title="Authentic Gifts & Organic Food from Gilgit-Baltistan"
        description="Shop authentic handcrafted goods from Gilgit-Baltistan — Hunza, Skardu, Ghizer, Astore, and beyond. Pure sun-dried apricots, organic honey, Pakol caps, and handmade leather accessories."
      />

      <LandingSubnav categories={categories} />
      <h1 className="sr-only">
        Karakoram Store — Authentic gifts and organic food from Gilgit-Baltistan
      </h1>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative scroll-mt-40 overflow-hidden bg-gradient-to-b from-cream-50 via-cream-100 to-cream-200"
      >
        {/* Soft decorative glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-apricot-200/50 blur-3xl" />
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-mountain-200/50 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-apricot-100/70 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-14 lg:px-8 lg:pb-20 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            {/* Copy */}
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mountain-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-apricot-500" aria-hidden="true" />
                From Gilgit-Baltistan
              </p>

              <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] text-mountain-900 sm:text-5xl lg:text-[3.5rem]">
                Treasures of the{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10 text-apricot-600">Karakoram</span>
                  <span
                    className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-full bg-apricot-200/80"
                    aria-hidden="true"
                  />
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-mountain-600 sm:text-lg">
                Sun-dried apricots, raw mountain honey, rare spices, and handcrafted goods —
                sourced directly from local families across the world's highest mountains.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-mountain-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-apricot-100 text-[10px] font-bold text-apricot-700" aria-hidden="true">
                    ✓
                  </span>
                  Sun-dried, no additives
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-apricot-100 text-[10px] font-bold text-apricot-700" aria-hidden="true">
                    ✓
                  </span>
                  Direct from local families
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/shop"
                  id="hero-shop-btn"
                  className="group inline-flex items-center gap-2 rounded-full bg-apricot-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-apricot-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-apricot-600"
                >
                  Shop Now
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/shop?sort=-ratingAverage"
                  id="hero-popular-btn"
                  className="inline-flex items-center gap-2 rounded-full border border-mountain-200 bg-white/80 px-6 py-3.5 text-sm font-semibold text-mountain-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-apricot-300 hover:bg-white"
                >
                  Most Popular
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Link
                  to="/about"
                  className="font-semibold text-mountain-600 underline-offset-4 transition-colors hover:text-apricot-600 hover:underline"
                >
                  Our story
                </Link>
                <a
                  href="#explore-gb"
                  className="font-semibold text-mountain-600 underline-offset-4 transition-colors hover:text-apricot-600 hover:underline"
                >
                  Explore the regions
                </a>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div
                className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-apricot-200/70 via-cream-200/50 to-mountain-200/60 blur-2xl"
                aria-hidden="true"
              />

              <div
                className="relative overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-mountain-900/20 ring-1 ring-mountain-900/5"
                onMouseEnter={() => setRegionsPaused(true)}
                onMouseLeave={() => setRegionsPaused(false)}
                onFocusCapture={() => setRegionsPaused(true)}
                onBlurCapture={() => setRegionsPaused(false)}
                role="region"
                aria-roledescription="carousel"
                aria-label="Featured regions of Gilgit-Baltistan"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {heroRegions.map((region, index) => {
                    // Only keep the active slide and the next one mounted. The
                    // browser otherwise downloads every off-screen slide because
                    // they all occupy the same viewport-sized box.
                    if (index !== activeRegionIndexSafe && index !== nextRegionIndex) {
                      return null;
                    }

                    const isActive = index === activeRegionIndexSafe;
                    const imageUrl = region.image?.url;

                    if (!imageUrl) {
                      return (
                        <div
                          key={region._id}
                          className={`absolute inset-0 bg-gradient-to-br from-mountain-900 via-mountain-800 to-mountain-700 transition-opacity duration-700 ease-out ${
                            isActive ? 'opacity-100' : 'opacity-0'
                          }`}
                          aria-hidden="true"
                        />
                      );
                    }

                    return (
                      <img
                        key={region._id}
                        src={cloudinaryImage(imageUrl, {
                          width: 1280,
                          height: 960,
                          crop: 'fill',
                          gravity: 'auto',
                          quality: 'auto:good',
                          format: 'auto',
                        })}
                        srcSet={cloudinarySrcSet(imageUrl, [640, 960, 1280, 1600], {
                          ratio: 4 / 3,
                          crop: 'fill',
                          gravity: 'auto',
                          quality: 'auto:good',
                          format: 'auto',
                        })}
                        sizes="(min-width: 1024px) 640px, 100vw"
                        alt={isActive ? region.name : ''}
                        aria-hidden={!isActive}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading={isActive ? 'eager' : 'lazy'}
                        fetchPriority={isActive ? 'high' : 'low'}
                        decoding="async"
                      />
                    );
                  })}

                  <span className="absolute left-4 top-4 z-10 inline-flex max-w-[calc(100%_-_2rem)] items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-mountain-800 shadow-sm backdrop-blur">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-apricot-500" aria-hidden="true" />
                    <span className="min-w-0 truncate">Discover {activeRegion.name}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveRegionIndex((index) =>
                        (index - 1 + heroRegions.length) % heroRegions.length
                      )
                    }
                    className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white/85 text-mountain-800 shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400"
                    aria-label="Previous featured region"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveRegionIndex((index) => (index + 1) % heroRegions.length)
                    }
                    className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white/85 text-mountain-800 shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400"
                    aria-label="Next featured region"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="px-5 pb-5 pt-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0" aria-live="polite">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-apricot-600">
                        Featured region
                      </p>
                      <p className="mt-1 truncate font-display text-xl font-bold leading-tight text-mountain-900">
                        {activeRegion.name}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-mountain-500">
                        {activeRegion.tagline || 'Sourced from the mountains'}
                      </p>
                    </div>
                    <Link
                      to={activeRegionShopPath}
                      aria-label={`Shop products from ${activeRegion.name}`}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-mountain-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-mountain-800"
                    >
                      Shop {activeRegion.name}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-200 pt-3">
                    <div className="flex items-center gap-1">
                      {heroRegions.map((region, index) => (
                        <button
                          key={region._id}
                          type="button"
                          onClick={() => setActiveRegionIndex(index)}
                          className="group/dot grid h-5 w-3 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400"
                          aria-label={`Show ${region.name}`}
                          aria-current={index === activeRegionIndexSafe ? 'true' : undefined}
                        >
                          <span
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              index === activeRegionIndexSafe
                                ? 'w-3 bg-apricot-500'
                                : 'w-1.5 bg-cream-300 group-hover/dot:bg-apricot-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-semibold tabular-nums tracking-wider text-mountain-400"
                        aria-hidden="true"
                      >
                        {activeRegionIndexSafe + 1} / {heroRegions.length}
                      </span>
                      <a
                        href="#explore-gb"
                        className="text-[11px] font-semibold text-mountain-500 transition-colors hover:text-apricot-600"
                      >
                        All regions
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-12 grid grid-cols-2 gap-2 rounded-2xl border border-cream-200 bg-white/70 p-3 backdrop-blur sm:mt-16 sm:grid-cols-4 sm:gap-3 sm:p-5">
            {HERO_STATS.map((stat) => (
              <HeroStat key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      <section id="featured-products" className="scroll-mt-40 bg-cream-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-apricot-600">
                Handpicked
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-mountain-900 sm:text-3xl">
                Featured Products
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mountain-500">
                Small-batch favourites from the valleys — restocked as the seasons allow.
              </p>
            </div>
            <Link
              to="/shop"
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-apricot-600 transition-colors hover:text-apricot-700"
            >
              Shop all
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {featLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={i >= 4 ? 'hidden sm:block' : ''}>
                  <SkeletonCard />
                </div>
              ))}
            </div>
          )}

          {featError && (
            <ErrorState
              message="Could not load products."
              onRetry={refetchFeat}
            />
          )}

          {!featLoading && !featError && featured.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {featured.map((p, index) => (
                <div key={p._id} className={`h-full ${index >= 4 ? 'hidden sm:block' : ''}`}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}

          {!featLoading && !featError && featured.length === 0 && (
            <div className="rounded-2xl border border-dashed border-cream-300 bg-white/60 p-10 text-center">
              <p className="font-display text-lg font-semibold text-mountain-800">
                Our shelves are being restocked
              </p>
              <p className="mt-1 text-sm text-mountain-500">
                Check back soon for fresh mountain finds.
              </p>
              <Link
                to="/shop"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-apricot-600"
              >
                Browse the shop
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          )}

          {!featLoading && !featError && featured.length > 4 && (
            <div className="mt-8 text-center sm:hidden">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-mountain-200 bg-white px-5 py-3 text-sm font-semibold text-mountain-800 transition-colors hover:border-apricot-300 hover:text-apricot-700"
              >
                Browse all products
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Trust banner ─────────────────────────────────────── */}
      <section className="border-y border-cream-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-apricot-600">
                The Karakoram promise
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-mountain-900 sm:text-3xl">
                Shop with confidence
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mountain-500">
                Real food, fair prices, and a direct line to the people who make it.
              </p>
            </div>
            <Link
              to="/track-order"
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-apricot-600 transition-colors hover:text-apricot-700"
            >
              Track an order
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {PROMISES.map((item) => (
              <div
                key={item.title}
                className="group flex items-start gap-4 rounded-2xl border border-cream-200 bg-cream-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-apricot-200 hover:shadow-sm"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-apricot-600 shadow-sm"
                  aria-hidden="true"
                >
                  <PromiseIcon name={item.icon} />
                </span>
                <div>
                  <h3 className="font-display text-sm font-semibold text-mountain-900 sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-mountain-500 sm:text-sm">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-mountain-400">
            Every order supports a family in Gilgit-Baltistan.
          </p>
        </div>
      </section>

      {/* ── Regions of Gilgit-Baltistan ─────────────────────── */}
      <RegionsCarousel />


    </div>
  );
}
