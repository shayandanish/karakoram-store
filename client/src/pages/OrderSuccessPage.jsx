import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { fmtPKR, fmtDate, getCleanWhatsAppNumber } from '../lib/utils';
import SEO from '../components/ui/SEO';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;
  const [copiedNumber, setCopiedNumber] = useState(false);

  const handleCopyNumber = () => {
    navigator.clipboard?.writeText('03495144486');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

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
  const waNumber = getCleanWhatsAppNumber();
  const shortId = order._id ? order._id.slice(-8).toUpperCase() : '';
  const waReceiptMsg = encodeURIComponent(
    `Assalam o Alaikum! I have placed Order #${shortId} for ${fmtPKR(order.total)} on Karakoram Store.\n` +
    `Payment Method: Easypaisa to Shayan Danish (03495144486).\n` +
    (order.transactionId ? `TRX ID: ${order.transactionId}\n` : '') +
    `Please confirm receipt of my payment.`
  );
  const waReceiptUrl = `https://wa.me/${waNumber}?text=${waReceiptMsg}`;

  const isEasypaisa = order.paymentMethod === 'easypaisa' || !order.paymentMethod || order.paymentMethod === 'COD';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <SEO
        title={`Order Confirmed #${shortId}`}
        description="Your Karakoram Store order has been confirmed with Easypaisa payment."
      />

      {/* Success banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-5">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-3xl text-mountain-900 mb-2">Order Placed Successfully! 🎉</h1>
        <p className="text-mountain-600 text-sm">
          Thank you for choosing Karakoram Store. Complete your payment via Easypaisa to get your parcel dispatched.
        </p>
      </div>

      {/* Easypaisa Payment Instructions Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-4 border-b border-emerald-400/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <h2 className="font-display font-bold text-lg text-white">Easypaisa Payment Transfer</h2>
              <p className="text-emerald-100 text-xs">Please send the exact amount to the account below</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 shadow-xs">
            {fmtPKR(order.total)}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 bg-emerald-800/40 rounded-xl p-4 border border-emerald-400/30">
          <div>
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider mb-0.5">Account Title</p>
            <p className="text-white font-bold text-base">Shayan Danish</p>
          </div>
          <div>
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider mb-0.5">Account Number</p>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono font-bold text-lg tracking-wider">03495144486</span>
              <button
                type="button"
                onClick={handleCopyNumber}
                id="success-copy-easypaisa-btn"
                className="px-2.5 py-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                {copiedNumber ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {order.transactionId && (
          <div className="mt-3.5 px-4 py-2.5 bg-white/10 rounded-xl text-xs flex items-center justify-between">
            <span className="text-emerald-100">Submitted TRX ID / Sender:</span>
            <span className="font-mono font-bold text-white">{order.transactionId}</span>
          </div>
        )}

        <div className="mt-5">
          <a
            href={waReceiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="success-whatsapp-receipt-btn"
            className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-white hover:bg-cream-100 active:scale-98 text-emerald-800 font-bold text-sm transition-all shadow-md"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Send Payment Screenshot on WhatsApp
          </a>
        </div>
      </div>

      {/* Order details card */}
      <div id="order-success-card" className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-mountain-800 to-mountain-700 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-mountain-300 text-xs mb-0.5">Order ID</p>
            <p className="text-white font-mono text-sm font-semibold">#{shortId}</p>
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
            <p className="text-mountain-400 text-xs mb-1">Payment Method</p>
            <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
              {order.paymentMethod === 'easypaisa' ? 'Easypaisa' : order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod || 'Easypaisa'}
            </span>
            <p className="text-mountain-400 text-xs mt-3 mb-1">Order Status</p>
            <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold capitalize">
              {order.orderStatus || 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 mb-8">
        <h3 className="font-display font-semibold text-mountain-800 mb-3 flex items-center gap-2">
          <span>📋</span> What Happens Next?
        </h3>
        <ul className="space-y-2.5 text-sm text-mountain-700">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold mt-0.5">1.</span>
            Transfer <strong>{fmtPKR(order.total)}</strong> to Easypaisa account <strong>03495144486</strong> (Shayan Danish).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold mt-0.5">2.</span>
            Send the payment screenshot or TRX ID to our WhatsApp team for quick verification.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold mt-0.5">3.</span>
            Once payment is verified, your order will be packed and dispatched within 24 hours (3–5 business days delivery nationwide).
          </li>
        </ul>
      </div>

      {/* Client Dashboard Access Notice */}
      <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-apricot-100 text-apricot-700 flex items-center justify-center text-xl shrink-0">
            📦
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-mountain-900">Saved in Your Client Dashboard</h4>
            <p className="text-xs text-mountain-600 mt-0.5">
              Check live status, payment confirmation, and delivery milestones anytime under My Orders.
            </p>
          </div>
        </div>
        <Link
          to="/my-orders"
          id="success-open-dashboard-btn"
          className="px-5 py-2.5 rounded-xl bg-apricot-500 hover:bg-apricot-600 active:scale-95 text-white font-bold text-xs transition shadow-sm whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span>Open My Orders &rarr;</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3.5 justify-center">
        <Link
          to="/my-orders"
          id="success-dashboard-primary-btn"
          className="px-7 py-3.5 bg-mountain-900 hover:bg-mountain-800 text-white font-bold rounded-full transition shadow-sm text-sm flex items-center gap-2"
        >
          <span>📦</span>
          <span>View in My Orders</span>
        </Link>
        <Link
          to={`/track-order?orderId=${order._id}&phone=${phoneParam}`}
          id="success-track-btn"
          className="px-7 py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full transition shadow-sm text-sm"
        >
          Track Live Progress
        </Link>
        <Link
          to="/shop"
          id="success-continue-btn"
          className="px-7 py-3.5 bg-white border border-cream-300 text-mountain-700 font-semibold rounded-full hover:bg-cream-100 transition text-sm"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
