import { useLocation, Link } from 'react-router-dom';
import { fmtPKR, fmtDate } from '../lib/utils';
import SEO from '../components/ui/SEO';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <SEO title="Order Confirmed" description="Order confirmation at Karakoram Store." />
        <p className="text-5xl mb-4">✅</p>
        <h1 className="font-display font-bold text-2xl text-mountain-900 mb-2">Order Placed!</h1>
        <p className="text-mountain-500 text-sm mb-8">Thank you for your order.</p>
        <Link
          to="/shop"
          id="success-shop-btn"
          className="inline-block px-8 py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const phoneParam = order.shippingAddress?.phone || order.guestPhone || '';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <SEO
        title={`Order Confirmed #${order._id?.slice(-8).toUpperCase()}`}
        description="Your Karakoram Store order has been confirmed with Cash on Delivery."
      />

      {/* Success banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-3xl text-mountain-900 mb-2">Order Confirmed! 🎉</h1>
        <p className="text-mountain-600 text-sm">
          Thank you for shopping with Karakoram Store. We'll contact you soon to confirm delivery.
        </p>
      </div>

      {/* Order details card */}
      <div id="order-success-card" className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-mountain-800 to-mountain-700 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-mountain-300 text-xs mb-0.5">Order ID</p>
            <p className="text-white font-mono text-sm font-semibold">#{order._id?.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-mountain-300 text-xs mb-0.5">Date</p>
            <p className="text-white text-sm font-medium">{fmtDate(order.createdAt)}</p>
          </div>
        </div>

        {/* Items */}
        <div className="p-6 space-y-3 border-b border-cream-200">
          <h2 className="font-display font-semibold text-mountain-900 text-sm mb-3">Items Ordered</h2>
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div className="text-mountain-700 min-w-0">
                <span className="font-medium">{item.name}</span>
                <span className="text-mountain-400"> — {item.variantLabel} × {item.quantity}</span>
              </div>
              <span className="font-medium text-mountain-800 shrink-0 ml-4">
                {fmtPKR(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 space-y-2 text-sm border-b border-cream-200">
          <div className="flex justify-between text-mountain-600">
            <span>Subtotal</span>
            <span>{fmtPKR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-mountain-600">
            <span>Shipping</span>
            <span>{fmtPKR(order.shippingCost)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{fmtPKR(order.discount)}</span>
            </div>
          )}
          <div className="border-t border-cream-200 pt-2 flex justify-between">
            <span className="font-bold text-mountain-900">Total</span>
            <span className="font-display font-bold text-apricot-600 text-xl">{fmtPKR(order.total)}</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className="px-6 py-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-mountain-400 text-xs mb-1">Delivery to</p>
            <p className="text-mountain-800 font-medium">{order.shippingAddress?.name}</p>
            <p className="text-mountain-600">{order.shippingAddress?.street}</p>
            <p className="text-mountain-600">
              {order.shippingAddress?.city}, {order.shippingAddress?.province}
            </p>
          </div>
          <div>
            <p className="text-mountain-400 text-xs mb-1">Payment</p>
            <span className="inline-block bg-apricot-100 text-apricot-700 px-3 py-1 rounded-full text-xs font-semibold">
              {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}
            </span>
            <p className="text-mountain-400 text-xs mt-3 mb-1">Status</p>
            <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold capitalize">
              {order.orderStatus || 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-apricot-50 border border-apricot-100 rounded-2xl p-5 mb-8">
        <h3 className="font-display font-semibold text-mountain-800 mb-3">What's Next?</h3>
        <ul className="space-y-2 text-sm text-mountain-700">
          <li className="flex items-start gap-2">
            <span className="text-apricot-500 mt-0.5">📞</span>
            Our team will call you to confirm your order within 24 hours.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-apricot-500 mt-0.5">🚚</span>
            Delivery typically takes 3–5 business days across Pakistan.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-apricot-500 mt-0.5">💵</span>
            Pay in cash when your parcel arrives at your door.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          to={`/track-order?orderId=${order._id}&phone=${phoneParam}`}
          id="success-track-btn"
          className="px-8 py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full transition-colors shadow-sm"
        >
          Track This Order
        </Link>
        <Link
          to="/shop"
          id="success-continue-btn"
          className="px-8 py-3.5 bg-white border border-cream-300 text-mountain-700 font-semibold rounded-full hover:bg-cream-100 transition-colors"
        >
          Continue Shopping
        </Link>
        <Link
          to="/"
          id="success-home-btn"
          className="px-8 py-3.5 bg-cream-200 text-mountain-800 font-semibold rounded-full hover:bg-cream-300 transition-colors"
        >
          Back to Home
        </Link>
      </div>

    </div>
  );
}
