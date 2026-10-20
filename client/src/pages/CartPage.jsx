// ── Cart Page ─────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { fmtPKR, buildWhatsAppLink } from '../lib/utils';
import ProductImage from '../components/ui/ProductImage';
import SEO from '../components/ui/SEO';

const SHIPPING = 200;

function CartItem({ item }) {
  const { updateQty, removeFromCart } = useCart();

  return (
    <div
      id={`cart-item-${item.key}`}
      className="flex gap-4 py-5 border-b border-cream-200 last:border-0"
    >
      {/* Image */}
      <Link
        to={`/products/${item.productSlug}`}
        className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-cream-200"
      >
        <ProductImage src={item.image} alt={item.productName} />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/products/${item.productSlug}`}
          className="font-display font-semibold text-mountain-900 text-sm hover:text-apricot-600 transition-colors line-clamp-2"
        >
          {item.productName}
        </Link>
        <p className="text-xs text-mountain-500 mt-0.5">{item.variantLabel}</p>

        <div className="flex items-center justify-between mt-3">
          {/* Qty stepper */}
          <div className="flex items-center border border-cream-300 rounded-lg overflow-hidden text-sm">
            <button
              id={`cart-decrement-${item.key}`}
              onClick={() => updateQty(item.key, item.quantity - 1)}
              className="px-3 py-1.5 hover:bg-cream-100 text-mountain-600 font-bold transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="px-3 py-1.5 font-semibold text-mountain-800 border-x border-cream-300 min-w-[36px] text-center">
              {item.quantity}
            </span>
            <button
              id={`cart-increment-${item.key}`}
              onClick={() => updateQty(item.key, item.quantity + 1)}
              className="px-3 py-1.5 hover:bg-cream-100 text-mountain-600 font-bold transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-apricot-600">
              {fmtPKR(item.price * item.quantity)}
            </span>
            <button
              id={`cart-remove-${item.key}`}
              onClick={() => removeFromCart(item.key)}
              className="text-mountain-400 hover:text-red-500 transition-colors"
              aria-label={`Remove ${item.productName} from cart`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, clearCart, subtotal } = useCart();
  const total = subtotal + SHIPPING;

  const waLink = buildWhatsAppLink(items, subtotal);

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <SEO title="Shopping Cart" description="Your shopping cart at Karakoram Store." />
        <p className="text-6xl mb-4">🛒</p>
        <h1 className="font-display font-bold text-2xl text-mountain-900 mb-2">Your cart is empty</h1>
        <p className="text-mountain-500 text-sm mb-8">
          Add some authentic Karakoram products to get started.
        </p>
        <Link
          to="/shop"
          id="cart-shop-btn"
          className="inline-block px-8 py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO
        title={`Cart (${items.length} ${items.length === 1 ? 'item' : 'items'})`}
        description="Review your items and proceed to checkout at Karakoram Store."
      />
      <div className="flex items-center justify-between mb-8">

        <h1 className="font-display font-bold text-3xl text-mountain-900">Your Cart</h1>
        <button
          id="cart-clear-btn"
          onClick={clearCart}
          className="text-sm text-mountain-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items list */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          {items.map((item) => (
            <CartItem key={item.key} item={item} />
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6 h-fit sticky top-24">
          <h2 className="font-display font-semibold text-mountain-900 text-lg mb-5">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-mountain-700">
              <span>Subtotal</span>
              <span className="font-medium">{fmtPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-mountain-700">
              <span>Shipping</span>
              <span className="font-medium">{fmtPKR(SHIPPING)}</span>
            </div>
            <div className="border-t border-cream-200 pt-3 flex justify-between">
              <span className="font-bold text-mountain-900 text-base">Total</span>
              <span className="font-display font-bold text-apricot-600 text-xl">{fmtPKR(total)}</span>
            </div>
          </div>

          <Link
            to="/checkout"
            id="cart-checkout-btn"
            className="mt-6 block w-full text-center py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-apricot-500/30"
          >
            Proceed to Checkout
          </Link>

          <a
            href={waLink}
            id="cart-whatsapp-btn"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order via WhatsApp
          </a>

          <Link
            to="/shop"
            id="cart-continue-btn"
            className="mt-3 block text-center text-sm text-mountain-500 hover:text-apricot-600 transition-colors"
          >
            ← Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
