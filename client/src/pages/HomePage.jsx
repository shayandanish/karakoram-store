// ── Home Page ─────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import ProductCard from '../components/ui/ProductCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';

// ── Category icons (emoji fallback) ──────────────────────────
const CATEGORY_ICONS = {
  'dry-fruits': '🍑',
  'organic-oils': '🫙',
  'natural-herbs': '🌿',
  'seasonal-fruits': '🍒',
  'handmade-wallets': '👛',
  'traditional-caps': '👑',
  'cultural-apparel': '🧥',
  'handmade-cushions': '🛋️',
  handicrafts: '🏺',
  honey: '🍯',
  spices: '🌶️',
  nuts: '🥜',
  default: '🏔️',
};

function CategoryCard({ category }) {
  const icon = category.icon || CATEGORY_ICONS[category.slug] || CATEGORY_ICONS.default;
  return (
    <Link
      to={`/shop?category=${category._id}`}
      id={`category-card-${category.slug}`}
      className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-apricot-100 to-cream-300 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="font-display font-semibold text-mountain-800 text-sm text-center">
        {category.name}
      </span>
    </Link>
  );
}

// ── Stat badge ────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-display font-bold text-3xl text-apricot-400">{value}</p>
      <p className="text-mountain-300 text-sm mt-1">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const {
    data: categoriesData,
    isLoading: catsLoading,
    error: catsError,
    refetch: refetchCats,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
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

  return (
    <div>
      <SEO
        title="Authentic Gifts & Organic Food from Hunza"
        description="Shop authentic handcrafted goods from Hunza, Gilgit-Baltistan. Pure sun-dried apricots, organic honey, Pakol caps, and handmade leather accessories."
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        id="hero"

        className="relative overflow-hidden bg-gradient-to-br from-mountain-900 via-mountain-800 to-mountain-700 text-white"
      >
        {/* Background decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-apricot-500/10 blur-3xl" />
          <div className="absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-mountain-600/30 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 bg-apricot-500/20 border border-apricot-400/30 text-apricot-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <span>🏔️</span>
              From Hunza, Gilgit-Baltistan
            </p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
              Treasures of the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-apricot-300 to-apricot-500">
                Karakoram
              </span>
            </h1>
            <p className="text-mountain-200 text-lg leading-relaxed mb-8 max-w-xl">
              Discover authentic dried fruits, organic honey, rare spices, and
              handcrafted goods — sourced directly from artisans in the world's
              highest mountain range.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/shop"
                id="hero-shop-btn"
                className="px-7 py-3.5 bg-apricot-500 hover:bg-apricot-400 text-white font-semibold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-apricot-500/30 hover:-translate-y-0.5"
              >
                Shop Now
              </Link>
              <Link
                to="/shop?sort=-ratingAverage"
                id="hero-popular-btn"
                className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full border border-white/20 backdrop-blur-sm transition-all duration-200"
              >
                Most Popular
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-mountain-600 pt-8">
            <Stat value="100+" label="Products" />
            <Stat value="5000+" label="Happy customers" />
            <Stat value="GB" label="Gilgit-Baltistan" />
            <Stat value="COD" label="Cash on Delivery" />
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-apricot-500 text-xs font-semibold uppercase tracking-widest mb-2">Browse by</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-mountain-900">Categories</h2>
          </div>
          <Link to="/shop" className="text-sm text-apricot-600 hover:text-apricot-700 font-medium transition-colors">
            View all →
          </Link>
        </div>

        {catsLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {catsError && (
          <ErrorState
            message="Could not load categories."
            onRetry={refetchCats}
          />
        )}

        {!catsLoading && !catsError && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat._id} category={cat} />
            ))}
          </div>
        )}
      </section>

      {/* ── Trust banner ─────────────────────────────────────── */}
      <section className="bg-apricot-50 border-y border-apricot-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: '🚚', title: 'Nationwide Delivery', desc: 'Flat Rs. 200 shipping across Pakistan' },
              { icon: '🤝', title: 'Cash on Delivery', desc: 'Pay when you receive your order' },
              { icon: '🏔️', title: 'Straight from Source', desc: 'Directly from Hunza artisans & farmers' },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-2">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="font-display font-semibold text-mountain-800">{item.title}</h3>
                <p className="text-sm text-mountain-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      <section id="featured-products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-apricot-500 text-xs font-semibold uppercase tracking-widest mb-2">Handpicked</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-mountain-900">Featured Products</h2>
          </div>
          <Link to="/shop" className="text-sm text-apricot-600 hover:text-apricot-700 font-medium transition-colors">
            Shop all →
          </Link>
        </div>

        {featLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {featError && (
          <ErrorState
            message="Could not load products."
            onRetry={refetchFeat}
          />
        )}

        {!featLoading && !featError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
