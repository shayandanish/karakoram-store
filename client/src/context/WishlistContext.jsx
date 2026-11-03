// ── Wishlist Context (localStorage-backed) ───────────────────
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getBestVariantDiscount } from '../lib/discountUtils';

const WishlistContext = createContext(null);

const STORAGE_KEY = 'kk_wishlist';

function loadWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.productId);
  } catch {
    return [];
  }
}

/** Normalise a full product document into the small snapshot we persist. */
function toWishlistItem(product) {
  const best = getBestVariantDiscount(product.variants || []);
  return {
    productId: product._id,
    name: product.name,
    slug: product.slug,
    image: product.images?.[0]?.url || '',
    alt: product.images?.[0]?.alt || product.name,
    price: best?.salePrice ?? null,
    originalPrice: best?.hasDiscount ? best.originalPrice : null,
    category: product.category?.name || '',
    addedAt: Date.now(),
  };
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(loadWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or unavailable — wishlist simply won't persist */
    }
  }, [items]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setItems(loadWishlist());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isWishlisted = useCallback(
    (productId) => items.some((item) => item.productId === productId),
    [items]
  );

  const addToWishlist = useCallback((product) => {
    if (!product?._id) return false;
    setItems((prev) => {
      if (prev.some((item) => item.productId === product._id)) return prev;
      return [toWishlistItem(product), ...prev];
    });
    return true;
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  /** Returns true when the product was added, false when it was removed. */
  const toggleWishlist = useCallback(
    (product) => {
      if (!product?._id) return false;

      const exists = items.some((item) => item.productId === product._id);
      if (exists) {
        setItems((prev) => prev.filter((item) => item.productId !== product._id));
        return false;
      }

      setItems((prev) => {
        if (prev.some((item) => item.productId === product._id)) return prev;
        return [toWishlistItem(product), ...prev];
      });
      return true;
    },
    [items]
  );

  const clearWishlist = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
    }),
    [items, isWishlisted, addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
};
