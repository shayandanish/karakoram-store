// ── Wishlist Page ─────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { fmtPKR, cloudinaryImage } from '../lib/utils';
import SEO from '../components/ui/SEO';
import { useSiteSettings } from '../hooks/useSiteSettings';

function WishlistItem({ item }) {
  const { removeFromWishlist } = useWishlist();
  const toast = useToast();

  const thumb = item.image
    ? cloudinaryImage(item.image, { width: 320, crop: 'limit', quality: 'auto:good', format: 'auto' })
    : '';

  return (
    <li className="flex gap-4 rounded-2xl border border-cream-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <Link
        to={`/products/${item.slug}`}
        className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-100"
        aria-label={`View ${item.name}`}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.alt || item.name}
            width={80}
            height={96}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl" aria-hidden="true">
            🏔️
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        {item.category && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-apricot-600">
            {item.category}
          </p>
        )}
        <Link
          to={`/products/${item.slug}`}
          className="line-clamp-2 font-display text-sm font-semibold text-mountain-900 hover:text-apricot-600"
        >
          {item.name}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="text-sm font-bold text-apricot-600">
            {item.price !== null && item.price !== undefined ? `From ${fmtPKR(item.price)}` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              removeFromWishlist(item.productId);
              toast.info(`Removed ${item.name} from your wishlist`);
            }}
            className="rounded-lg p-1.5 text-mountain-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            aria-label={`Remove ${item.name} from wishlist`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlist();
  const { settings } = useSiteSettings();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:py-24">
        <SEO title="Wishlist" description={`Your saved products at ${settings.storeName}.`} canonicalUrl="/wishlist" />
        <p className="mb-4 text-6xl" aria-hidden="true">💚</p>
        <h1 className="mb-2 font-display text-2xl font-bold text-mountain-900">Your wishlist is empty</h1>
        <p className="mb-8 text-sm text-mountain-500">
          Tap the heart on any product to save it here for later.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/shop"
            className="inline-block rounded-full bg-apricot-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-apricot-600"
          >
            Browse the shop
          </Link>
          <Link
            to="/shop?sale=true"
            className="inline-block rounded-full border border-cream-300 bg-white px-6 py-3.5 text-sm font-semibold text-mountain-700 transition-colors hover:border-apricot-300 hover:text-apricot-700"
          >
            See what&apos;s on sale
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title={`Wishlist (${items.length})`}
        description={`Products you saved at ${settings.storeName}.`}
        canonicalUrl="/wishlist"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-mountain-900">Your Wishlist</h1>
          <p className="mt-1 text-sm text-mountain-500">
            {items.length} saved {items.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <button
          type="button"
          onClick={clearWishlist}
          className="text-sm text-mountain-400 transition-colors hover:text-rose-600"
        >
          Clear all
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <WishlistItem key={item.productId} item={item} />
        ))}
      </ul>

      <div className="mt-8">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm font-semibold text-apricot-700 hover:text-apricot-800"
        >
          ← Continue shopping
        </Link>
      </div>
    </div>
  );
}
