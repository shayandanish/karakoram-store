// ── Track Order Page ──────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/axios';
import { fmtPKR, fmtDate, getCleanWhatsAppNumber } from '../lib/utils';
import SEO from '../components/ui/SEO';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Received & awaiting confirmation' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Verified & packing in Hunza' },
  { key: 'shipped', label: 'Dispatched', desc: 'On its way with courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Safely arrived at your door' },
];

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wa = getCleanWhatsAppNumber();

  // Auto-submit if URL contains orderId & phone query params
  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    const urlPhone = searchParams.get('phone');
    if (urlOrderId && urlPhone && !order && !loading) {
      setOrderId(urlOrderId);
      setPhone(urlPhone);
      (async () => {
        setLoading(true);
        setError('');
        try {
          const res = await api.get('/orders/track', { params: { orderId: urlOrderId, phone: urlPhone } });
          setOrder(res.data);
        } catch (err) {
          setError(err.response?.data?.message || err.response?.data?.error || 'Order not found.');
        } finally {
          setLoading(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      setError('Please enter both your Order ID and Phone Number.');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await api.get('/orders/track', {
        params: {
          orderId: orderId.trim(),
          phone: phone.trim(),
        },
      });
      setOrder(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Order not found. Please verify your Order ID and phone number.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepKey) => {
    if (!order) return 'upcoming';
    const status = order.orderStatus?.toLowerCase() || 'pending';
    if (status === 'cancelled') return 'cancelled';

    const orderIndex = STATUS_STEPS.findIndex((s) => s.key === status);
    const stepIndex = STATUS_STEPS.findIndex((s) => s.key === stepKey);

    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Track Your Order"
        description="Track the status of your Karakoram Store order. Enter your Order ID and phone number for real-time delivery updates."
      />

      {/* Back to Shop Navigation Button */}
      <div className="mb-6">
        <Link
          to="/shop"
          id="track-back-to-shop-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Shop</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-apricot-100 text-apricot-700 text-xs font-semibold mb-3">
          <span>📦</span> Real-time Tracking
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-mountain-900 mb-3">
          Track Your Order
        </h1>
        <p className="text-mountain-600 text-sm max-w-md mx-auto">
          Enter your Order ID (from your confirmation) and the contact phone number used during checkout.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-8 border border-cream-200">
        <form onSubmit={handleTrack} noValidate className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="track-order-id" className="block text-sm font-medium text-mountain-800 mb-1">
                Order ID <span className="text-apricot-500">*</span>
              </label>
              <input
                id="track-order-id"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 65fa2b..."
                required
                className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
              />
            </div>

            <div>
              <label htmlFor="track-phone" className="block text-sm font-medium text-mountain-800 mb-1">
                Phone Number <span className="text-apricot-500">*</span>
              </label>
              <input
                id="track-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +92 3XX XXXXXXX"
                required
                className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            id="track-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-semibold rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Locating Order…
              </>
            ) : (
              'Track Package'
            )}
          </button>
        </form>
      </div>

      {/* Tracking Result */}
      {order && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-cream-200 animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-mountain-900 to-mountain-800 px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-mountain-300">Order ID</p>
              <p className="font-mono text-base font-bold">#{order._id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-mountain-300">Order Date</p>
              <p className="text-sm font-medium">{fmtDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="p-6 sm:p-8 border-b border-cream-200">
            <h2 className="font-display font-semibold text-mountain-900 text-base mb-6">Delivery Progress</h2>

            {order.orderStatus?.toLowerCase() === 'cancelled' ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                This order was cancelled. Please contact support via WhatsApp if you have questions.
              </div>
            ) : (
              <div className="relative">
                <ol className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {STATUS_STEPS.map((step) => {
                    const status = getStepStatus(step.key);
                    return (
                      <li key={step.key} className="flex sm:flex-col items-center gap-3 text-left sm:text-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                            status === 'completed'
                              ? 'bg-green-500 text-white shadow-sm'
                              : status === 'current'
                              ? 'bg-apricot-500 text-white ring-4 ring-apricot-100 shadow-md animate-pulse'
                              : 'bg-cream-200 text-mountain-400'
                          }`}
                        >
                          {status === 'completed' ? '✓' : '•'}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              status === 'current'
                                ? 'text-apricot-600 font-bold'
                                : status === 'completed'
                                ? 'text-mountain-900'
                                : 'text-mountain-400'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-mountain-500 hidden sm:block mt-0.5">{step.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>

          {/* Items Summary */}
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="font-display font-semibold text-mountain-900 text-base">Items in this Parcel</h2>
            <div className="divide-y divide-cream-200">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-sm">
                  <div className="min-w-0 pr-4">
                    <p className="font-medium text-mountain-800 truncate">{item.name}</p>
                    <p className="text-xs text-mountain-500">
                      Variant: {item.variantLabel} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium text-mountain-900 shrink-0">
                    {fmtPKR(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-cream-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-mountain-500">
                  Total Amount ({order.paymentMethod === 'easypaisa' ? 'Easypaisa' : order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod || 'Easypaisa'})
                </p>
                <p className="font-display font-bold text-2xl text-apricot-600">{fmtPKR(order.total)}</p>
              </div>

              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(
                    `Hello! Inquiring about order #${order._id} tracking status.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Ask on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Helper link */}
      <div className="mt-8 text-center text-xs text-mountain-500">
        Need assistance with your purchase?{' '}
        <Link to="/contact" className="text-apricot-600 hover:text-apricot-700 underline font-medium">
          Contact our support team
        </Link>
      </div>
    </div>
  );
}
