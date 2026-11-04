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
import { cloudinaryImage, cloudinarySrcSet, fmtPKR } from '../lib/utils';

// Shown while the city/region API is loading or if no region images exist.
const HERO_REGION_FALLBACK = [
  { _id: 'hero-hunza', name: 'Hunza Valley', tagline: 'Heaven on Earth', image: { url: '/regions/hunza-960.webp' } },
  { _id: 'hero-nagar', name: 'Nagar Valley', tagline: 'Land of Glaciers & Orchards', image: { url: '/regions/nagar.webp' } },
  { _id: 'hero-ghizer', name: 'Ghizer Valley', tagline: "Gilgit-Baltistan's Green Crown", image: { url: '/regions/ghizer.webp' } },
  { _id: 'hero-astore', name: 'Astore Valley', tagline: 'In the Shadow of Nanga Parbat', image: { url: '/regions/astore.webp' } },
  { _id: 'hero-diamer', name: 'Diamer Valley', tagline: 'Gateway to the Killer Mountain', image: { url: '/regions/diamer.webp' } },
  { _id: 'hero-skardu', name: 'Skardu', tagline: 'Base Camp to the Giants', image: { url: '/regions/skardu.webp' } },
];

// Show a small, already-optimized Hunza image immediately while the city API
// loads. It is replaced by the matching Cloudinary photo as soon as the API
// responds, so the hero never starts as an empty block.
const HERO_LOADING_REGION = {
  _id: 'hero-loading',
  name: 'Hunza Valley',
  tagline: 'Heaven on Earth',
  image: { url: '/regions/hunza-960.webp' },
};

function ArrowRightIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PromiseIcon({ name, className = 'h-5 w-5' }) {
  if (name === 'truck') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5V16H3V7.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10h3.6a1 1 0 01.8.4l1.2 1.6a1 1 0 01.2.6V16h-5.8" />
        <circle cx="7" cy="18" r="1.75" />
        <circle cx="17" cy="18" r="1.75" />
      </svg>
    );
  }

  if (name === 'wallet') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M16 13h2" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 19l6-9 3.5 5L16 9l5 10H3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5L9 5l1.5 2.5" />
    </svg>
  );
}

export default function HomePage() {
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [regionsPaused, setRegionsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { settings, paymentMethods, enableCod } = useSiteSettings();
  const pageCopy = settings.pageContent.home;
  const sectionOrder = pageCopy.sectionOrder || ['hero','categories','featured','promises','regions'];
  const orderOf = (section) => sectionOrder.indexOf(section) + 1;

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

  // Keep the admin-defined display order; fall back to the name.
  const sortedCategories = [...categories].sort(
    (a, b) =>
      (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name)
  );
  const categoryTiles = sortedCategories.slice(0, 8);

  const otherPaymentNames = paymentMethods
    .filter((method) => method.enabled && method.id !== 'cod' && method.name)
    .map((method) => method.name);

  const paymentSummary = [
    ...otherPaymentNames,
    enableCod ? 'Cash on delivery' : '',
  ].filter(Boolean);

  const minDeliveryDays = Math.max(1, Number(settings.deliveryMinDays) || 2);
  const maxDeliveryDays = Math.max(minDeliveryDays, Number(settings.deliveryMaxDays) || 5);

  const sourcingText = /gilgit[\s-]?baltistan/i.test(
    `${settings.storeDescription} ${settings.storeTagline}`
  )
    ? 'Sourced from Gilgit-Baltistan'
    : settings.storeTagline;

  const promises = [
    {
      icon: 'truck',
      title: 'Delivery',
      desc: settings.deliveryZones?.length
        ? 'Shipping rates and delivery times are set by your city.'
        : `Flat ${fmtPKR(settings.shippingFee)} shipping, delivered in ${minDeliveryDays}–${maxDeliveryDays} working days.`,
    },
    {
      icon: 'wallet',
      title: 'Payment',
      desc: paymentSummary.length
        ? `${paymentSummary.join(' · ')}.`
        : 'Available payment options are shown at checkout.',
    },
    {
      icon: 'mountain',
      title: 'Sourcing',
      desc: sourcingText,
    },
  ];

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
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener?.('change', updatePreference);
    return () => mediaQuery.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || regionsPaused || heroRegions.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveRegionIndex((index) => (index + 1) % heroRegions.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroRegions.length, prefersReducedMotion, regionsPaused]);

  return (
    <div className="flex flex-col bg-cream-100">
      <SEO
        title="Goods from Gilgit-Baltistan"
        description="Browse dry fruits, natural honey, herbs, handicrafts, and more sourced from Gilgit-Baltistan, Pakistan."
        canonicalUrl="/"
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section id="hero" style={{ order: orderOf('hero') }} className="border-b border-cream-200">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot-600">
              {settings.storeTagline}
            </p>

            <h1 className="mt-4 max-w-xl font-display text-4xl leading-[1.12] text-mountain-900 sm:text-5xl lg:text-6xl">
              {pageCopy.heroTitle}
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-mountain-600">
              {pageCopy.heroDescription}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                to="/shop"
                id="hero-shop-btn"
                className="group inline-flex items-center gap-2 bg-apricot-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-apricot-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2"
              >
                  {pageCopy.heroButton}
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/about"
                className="text-sm font-semibold text-mountain-700 underline-offset-4 transition-colors hover:text-apricot-700 hover:underline"
              >
                Our story
              </Link>
            </div>
          </div>

          {/* Regional imagery carousel */}
          <figure className="m-0">
            <div
              className="relative aspect-[4/3] overflow-hidden bg-cream-200"
              role="region"
              aria-roledescription="carousel"
              aria-label="Regions of Gilgit-Baltistan"
              onMouseEnter={() => setRegionsPaused(true)}
              onMouseLeave={() => setRegionsPaused(false)}
              onFocusCapture={() => setRegionsPaused(true)}
              onBlurCapture={() => setRegionsPaused(false)}
            >
              {heroRegions.map((region, index) => {
                // Only keep the active slide and the next one mounted so the
                // browser does not download every off-screen region photo.
                if (index !== activeRegionIndexSafe && index !== nextRegionIndex) {
                  return null;
                }

                const isActive = index === activeRegionIndexSafe;
                const imageUrl = region.image?.url;

                if (!imageUrl) {
                  return (
                    <div
                      key={region._id}
                      className={`absolute inset-0 bg-mountain-900 transition-opacity duration-700 ease-out ${
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
                    srcSet={cloudinarySrcSet(imageUrl, [480, 640, 960, 1280], {
                      ratio: 4 / 3,
                      crop: 'fill',
                      gravity: 'auto',
                      quality: 'auto:good',
                      format: 'auto',
                    })}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    alt={isActive ? region.name : ''}
                    aria-hidden={!isActive}
                    width={1280}
                    height={960}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading={isActive ? 'eager' : 'lazy'}
                    fetchPriority={isActive ? 'high' : 'low'}
                    decoding="async"
                  />
                );
              })}

              {heroRegions.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveRegionIndex((index) =>
                        (index - 1 + heroRegions.length) % heroRegions.length
                      )
                    }
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 border border-cream-300 bg-white/90 p-2 text-mountain-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
                    aria-label="Previous featured region"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveRegionIndex((index) => (index + 1) % heroRegions.length)
                    }
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 border border-cream-300 bg-white/90 p-2 text-mountain-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
                    aria-label="Next featured region"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-cream-200 pt-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-mountain-500">
                {activeRegion.name}
                <span className="ml-2 tabular-nums text-mountain-400" aria-hidden="true">
                  {activeRegionIndexSafe + 1} / {heroRegions.length}
                </span>
              </span>
              <Link
                to={activeRegionShopPath}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-apricot-700 transition-colors hover:text-apricot-800"
              >
                Shop {activeRegion.name}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      {pageCopy.visibility.categories && categoryTiles.length > 0 && (
        <section id="categories" style={{ order: orderOf('categories') }} aria-labelledby="categories-heading" className="border-b border-cream-200">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot-600">
                  Browse
                </p>
                <h2 id="categories-heading" className="mt-2 font-display text-2xl text-mountain-900 sm:text-3xl">
                  {pageCopy.categoryTitle}
                </h2>
              </div>
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-apricot-700 transition-colors hover:text-apricot-800"
              >
                All products
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <ul className="grid grid-cols-2 border-l border-t border-cream-200 sm:grid-cols-3 lg:grid-cols-4">
              {categoryTiles.map((category) => (
                <li key={category._id}>
                  <Link
                    to={`/shop?category=${encodeURIComponent(category.slug)}`}
                    className="group flex h-full min-h-[9.5rem] flex-col justify-between border-b border-r border-cream-200 bg-white p-4 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apricot-500 sm:p-5"
                  >
                    <span className="font-display text-base leading-snug text-mountain-900 sm:text-lg">
                      {category.name}
                    </span>
                    <span className="mt-4 flex items-end justify-between gap-3">
                      {category.description ? (
                        <span className="line-clamp-2 text-xs leading-relaxed text-mountain-500">
                          {category.description}
                        </span>
                      ) : (
                        <span />
                      )}
                      <ArrowRightIcon className="h-4 w-4 shrink-0 text-mountain-400 transition-transform group-hover:translate-x-0.5 group-hover:text-apricot-600" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── New arrivals ─────────────────────────────────────── */}
      {pageCopy.visibility.featured && <section id="featured-products" style={{ order: orderOf('featured') }} className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot-600">
                The shop
              </p>
              <h2 className="mt-2 font-display text-2xl text-mountain-900 sm:text-3xl">
                {pageCopy.featuredTitle}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mountain-500">
                The latest additions, restocked as the seasons allow.
              </p>
            </div>
            <Link
              to="/shop"
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-apricot-700 transition-colors hover:text-apricot-800"
            >
              Shop all
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {featLoading && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((p, index) => (
                <div key={p._id} className={`h-full ${index >= 4 ? 'hidden sm:block' : ''}`}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}

          {!featLoading && !featError && featured.length === 0 && (
            <div className="border border-dashed border-cream-300 bg-white p-10 text-center">
              <p className="font-display text-lg text-mountain-800">
                Our shelves are being restocked
              </p>
              <p className="mt-1 text-sm text-mountain-500">
                Check back soon for fresh mountain finds.
              </p>
              <Link
                to="/shop"
                className="mt-5 inline-flex items-center gap-2 bg-apricot-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-apricot-700"
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
                className="inline-flex items-center gap-2 border border-cream-300 bg-white px-5 py-3 text-sm font-semibold text-mountain-800 transition-colors hover:border-apricot-500 hover:text-apricot-700"
              >
                Browse all products
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>}

      {/* ── Practical details ────────────────────────────────── */}
      {pageCopy.visibility.promises && <section style={{ order: orderOf('promises') }} aria-labelledby="promise-heading" className="border-b border-cream-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <h2 id="promise-heading" className="sr-only">
            Delivery, payment, and sourcing
          </h2>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {promises.map((item) => (
              <div key={item.title} className="flex items-start gap-3 border-t border-mountain-200 pt-4">
                <span className="mt-0.5 text-apricot-600" aria-hidden="true">
                  <PromiseIcon name={item.icon} />
                </span>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mountain-900">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mountain-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {/* ── Regions of Gilgit-Baltistan ─────────────────────── */}
      {pageCopy.visibility.regions && <div style={{ order: orderOf('regions') }}><RegionsCarousel /></div>}
    </div>
  );
}
