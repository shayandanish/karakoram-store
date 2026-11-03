// ── Cart Context (localStorage-backed with cross-tab sync & revalidation) ─
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { getVariantDiscount } from '../lib/discountUtils';
import api from '../lib/axios';

const CartContext = createContext(null);

const STORAGE_KEY = 'kk_cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_CART':
      return Array.isArray(action.payload) ? action.payload : [];

    case 'ADD': {
      const { product, variant, quantity } = action.payload;
      const key = `${product._id}__${variant.label}`;
      const existing = state.find((i) => i.key === key);
      if (existing) {
        return state.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      const disc = getVariantDiscount(variant);
      const effectivePrice = disc.hasDiscount ? disc.salePrice : Number(variant.price);
      return [
        ...state,
        {
          key,
          productId: product._id,
          productName: product.name,
          productSlug: product.slug,
          image: product.images?.[0]?.url || '',
          variantLabel: variant.label,
          price: effectivePrice,
          originalPrice: disc.hasDiscount ? disc.originalPrice : null,
          discountPercent: disc.hasDiscount ? disc.savingsPct : null,
          discountLabel: disc.badge || '',
          quantity,
        },
      ];
    }
    case 'UPDATE_QTY': {
      const { key, quantity } = action.payload;
      if (quantity <= 0) return state.filter((i) => i.key !== key);
      return state.map((i) => (i.key === key ? { ...i, quantity } : i));
    }
    case 'REMOVE':
      return state.filter((i) => i.key !== action.payload.key);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], loadCart);

  // Synchronize items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage quota or sandboxing
    }
  }, [items]);

  // Cross-tab storage synchronization
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const fresh = e.newValue ? JSON.parse(e.newValue) : [];
          dispatch({ type: 'SET_CART', payload: fresh });
        } catch {
          // ignore malformed payloads
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addToCart = (product, variant, quantity = 1) =>
    dispatch({ type: 'ADD', payload: { product, variant, quantity } });

  const updateQty = (key, quantity) =>
    dispatch({ type: 'UPDATE_QTY', payload: { key, quantity } });

  const removeFromCart = (key) =>
    dispatch({ type: 'REMOVE', payload: { key } });

  const clearCart = () => dispatch({ type: 'CLEAR' });

  /**
   * Revalidates cart items against the latest product prices and available stock.
   * Returns { warnings, hasChanges, updatedItems }.
   */
  const revalidateCart = useCallback(async () => {
    if (!items || items.length === 0) {
      return { warnings: [], hasChanges: false, updatedItems: [] };
    }

    const warnings = [];
    let hasChanges = false;
    const updatedItems = [];

    // Cache products to avoid duplicate API calls if cart has multiple variants of same product
    const productCache = new Map();

    for (const item of items) {
      try {
        const identifier = item.productSlug || item.productId;
        let product = productCache.get(identifier);

        if (!product) {
          const res = await api.get(`/products/${identifier}`);
          product = res.data;
          productCache.set(identifier, product);
        }

        if (!product || !product.isActive) {
          warnings.push(`"${item.productName}" is no longer available and was removed.`);
          hasChanges = true;
          continue; // item excluded
        }

        const variant = product.variants?.find((v) => v.label === item.variantLabel);
        if (!variant) {
          warnings.push(`Variant "${item.variantLabel}" for "${item.productName}" is no longer available.`);
          hasChanges = true;
          continue;
        }

        const disc = getVariantDiscount(variant);
        const latestPrice = disc.hasDiscount ? disc.salePrice : Number(variant.price);
        let adjustedQty = item.quantity;

        if (variant.stock <= 0) {
          warnings.push(`"${item.productName}" (${item.variantLabel}) is currently out of stock.`);
        } else if (item.quantity > variant.stock) {
          warnings.push(`Quantity for "${item.productName}" was reduced to available stock (${variant.stock}).`);
          adjustedQty = variant.stock;
          hasChanges = true;
        }

        if (latestPrice !== item.price) {
          warnings.push(
            `Price for "${item.productName}" (${item.variantLabel}) changed from Rs ${item.price} to Rs ${latestPrice}.`
          );
          hasChanges = true;
        }

        updatedItems.push({
          ...item,
          price: latestPrice,
          originalPrice: disc.hasDiscount ? disc.originalPrice : null,
          discountPercent: disc.hasDiscount ? disc.savingsPct : null,
          discountLabel: disc.badge || '',
          quantity: adjustedQty,
        });
      } catch {
        // If product lookup fails (network or 404), retain existing item without crashing
        updatedItems.push(item);
      }
    }

    if (hasChanges) {
      dispatch({ type: 'SET_CART', payload: updatedItems });
    }

    return { warnings, hasChanges, updatedItems };
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        revalidateCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
