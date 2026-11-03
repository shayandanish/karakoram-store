// ── Wishlist toggle button ───────────────────────────────────
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';

function HeartIcon({ filled = false, className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function WishlistButton({
  product,
  variant = 'icon',
  className = '',
  showLabel = false,
}) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const toast = useToast();

  if (!product?._id) return null;

  const active = isWishlisted(product._id);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const added = toggleWishlist(product);
    toast[added ? 'success' : 'info'](
      added ? `Saved ${product.name} to your wishlist` : `Removed ${product.name} from your wishlist`
    );
  };

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={active ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2 ${
          active
            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            : 'border-cream-300 bg-white text-mountain-700 hover:border-apricot-300 hover:bg-apricot-50 hover:text-apricot-700'
        } ${className}`}
      >
        <HeartIcon filled={active} className="h-5 w-5" />
        <span>{active ? 'Saved' : 'Save'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      title={active ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`inline-flex items-center gap-1.5 rounded-full border p-2 shadow-sm backdrop-blur transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2 ${
        active
          ? 'border-rose-200 bg-white/95 text-rose-600'
          : 'border-cream-200 bg-white/85 text-mountain-500 hover:border-apricot-300 hover:bg-white hover:text-rose-500'
      } ${className}`}
    >
      <HeartIcon filled={active} className="h-[18px] w-[18px]" />
      {showLabel && <span className="text-xs font-semibold">{active ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
