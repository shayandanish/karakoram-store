// ── Cart Context (localStorage-backed) ───────────────────────
import { createContext, useContext, useReducer, useEffect } from 'react';
import { getVariantDiscount } from '../lib/discountUtils';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product, variant, quantity = 1) =>
    dispatch({ type: 'ADD', payload: { product, variant, quantity } });

  const updateQty = (key, quantity) =>
    dispatch({ type: 'UPDATE_QTY', payload: { key, quantity } });

  const removeFromCart = (key) =>
    dispatch({ type: 'REMOVE', payload: { key } });

  const clearCart = () => dispatch({ type: 'CLEAR' });

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, updateQty, removeFromCart, clearCart, totalItems, subtotal }}>
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
