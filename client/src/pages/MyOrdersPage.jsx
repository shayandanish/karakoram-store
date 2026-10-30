// ── Client Orders Dashboard ───────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { fmtPKR, fmtDate, getCleanWhatsAppNumber } from '../lib/utils';
import ProductImage from '../components/ui/ProductImage';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';
import OrderTimeline, { STATUS_MAP } from '../components/ui/OrderTimeline';
import CourierInfoBlock from '../components/ui/CourierInfoBlock';

const STATUS_CONFIG = {
  pending: {
    bg: 'bg-amber-100 text-amber-900 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Order Placed',
    step: 1,
    desc: 'We received your order and are verifying details.',
  },
  confirmed: {
    bg: 'bg-blue-100 text-blue-900 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Confirmed',
    step: 2,
    desc: 'Order verified and queued for fulfillment.',
  },
  processing: {
    bg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    dot: 'bg-indigo-500',
    label: 'Processing',
    step: 3,
    desc: 'Authentic items being prepared by artisans.',
  },
  packed: {
    bg: 'bg-purple-100 text-purple-900 border-purple-200',
    dot: 'bg-purple-500',
    label: 'Packed',
    step: 4,
    desc: 'Quality checked & securely packed for shipping.',
  },
  shipped: {
    bg: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
    dot: 'bg-fuchsia-500',
    label: 'Dispatched',
    step: 5,
    desc: 'Handed over to courier from Hunza / Gilgit.',
  },
  out_for_delivery: {
    bg: 'bg-orange-100 text-orange-900 border-orange-200',
    dot: 'bg-orange-500',
    label: 'Out for Delivery',
    step: 6,
    desc: 'Rider is delivering your parcel to your address today.',
  },
  delivered: {
    bg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Delivered',
    step: 7,
    desc: 'Package delivered safely to your address.',
  },
  cancelled: {
    bg: 'bg-rose-100 text-rose-900 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Cancelled',
    step: 0,
    desc: 'This order was cancelled.',
  },
  returned: {
    bg: 'bg-stone-200 text-stone-800 border-stone-300',
    dot: 'bg-stone-500',
    label: 'Returned',
    step: 0,
    desc: 'Return recorded for this parcel.',
  },
};

// ── Printable Invoice Receipt Modal ──────────────────────────────
function InvoiceModal({ order, onClose }) {
  if (!order) return null;
  const displayId = order.orderId || (order._id ? `#${order._id.slice(-8).toUpperCase()}` : '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mountain-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-cream-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-cream-100 text-mountain-400 hover:text-mountain-800 transition"
          aria-label="Close invoice"
        >
          ✕
        </button>

        {/* Invoice Header */}
        <div className="border-b border-cream-200 pb-5 mb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-display font-bold text-mountain-900 text-lg">Karakoram</span>
              <span className="text-apricot-600 text-xs font-semibold tracking-widest uppercase">Store</span>
            </div>
            <p className="text-xs text-mountain-500">Official Purchase Receipt</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-sm font-bold text-mountain-900">{displayId}</span>
            <p className="text-xs text-mountain-500 mt-0.5">{fmtDate(order.createdAt)}</p>
          </div>
        </div>

        {/* Customer & Shipping Details */}
        <div className="grid sm:grid-cols-2 gap-4 text-xs bg-cream-50 p-4 rounded-2xl mb-5">
          <div>
            <p className="text-mountain-400 font-semibold uppercase tracking-wider mb-1">Delivering To</p>
            <p className="font-bold text-mountain-900">{order.shippingAddress?.name}</p>
            <p className="text-mountain-600">{order.shippingAddress?.street}</p>
            <p className="text-mountain-600">
              {order.shippingAddress?.city}, {order.shippingAddress?.province}{' '}
              {order.shippingAddress?.postalCode || ''}
            </p>
            <p className="text-mountain-600 mt-1">Phone: {order.shippingAddress?.phone}</p>
          </div>
          <div>
            <p className="text-mountain-400 font-semibold uppercase tracking-wider mb-1">Payment Method</p>
            <p className="font-bold text-mountain-900">
              {order.paymentMethod === 'easypaisa' ? 'Easypaisa Transfer' : order.paymentMethod}
            </p>
            <p className="text-mountain-600 capitalize">Payment Status: {order.paymentStatus || 'Pending'}</p>
            {order.transactionId && (
              <p className="text-mountain-700 mt-1 font-mono font-medium">TRX ID: {order.transactionId}</p>
            )}
            <p className="text-mountain-600 mt-1">Order Status: <span className="capitalize font-semibold">{order.orderStatus}</span></p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="divide-y divide-cream-200 border-y border-cream-200 py-2 mb-4">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-2.5 flex justify-between text-xs">
              <div className="pr-4">
                <span className="font-bold text-mountain-900">{item.name}</span>
                <span className="text-mountain-500 block text-[11px]">
                  {item.variantLabel} × {item.quantity}
                </span>
              </div>
              <span className="font-mono font-bold text-mountain-900 shrink-0">
                {fmtPKR(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-xs border-b border-cream-200 pb-4 mb-6">
          <div className="flex justify-between text-mountain-600">
            <span>Subtotal</span>
            <span className="font-mono">{fmtPKR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-mountain-600">
            <span>Shipping across Pakistan</span>
            <span className="font-mono">{fmtPKR(order.shippingCost)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Coupon Discount</span>
              <span className="font-mono">−{fmtPKR(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-mountain-900 pt-2 border-t border-cream-200">
            <span>Total Paid / Payable</span>
            <span className="font-display text-apricot-600 font-bold text-base">{fmtPKR(order.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-mountain-900 hover:bg-mountain-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print Invoice</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-cream-200 hover:bg-cream-300 text-mountain-800 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Interactive Single Order Card ────────────────────────────────
function OrderCard({ order, onOpenInvoice }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const wa = getCleanWhatsAppNumber();
  const displayId = order.orderId || (order._id ? `#${order._id.slice(-8).toUpperCase()}` : '');
  const statusInfo = STATUS_CONFIG[order.orderStatus?.toLowerCase()] || STATUS_CONFIG.pending;
  const isEasypaisa = order.paymentMethod === 'easypaisa' || !order.paymentMethod || order.paymentMethod === 'COD';
  const isPaymentPending = order.paymentStatus === 'pending';

  const handleCopyId = () => {
    navigator.clipboard?.writeText(order.orderId || order._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText('03495144486');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const phoneParam = order.shippingAddress?.phone || order.guestPhone || '';
  const waMessage = encodeURIComponent(
    `Assalam o Alaikum! Inquiring about Order ${displayId} for ${fmtPKR(order.total)} at Karakoram Store.`
  );

  return (
    <article
      id={`order-card-${order._id}`}
      className="bg-white rounded-3xl shadow-sm border border-cream-200 overflow-hidden transition-all duration-200 hover:shadow-md"
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cream-100/90 via-white to-cream-100/60 px-6 py-4 border-b border-cream-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-mountain-400 uppercase tracking-wider">Order ID</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[10px] text-apricot-600 hover:underline font-semibold cursor-pointer"
                title="Copy Full Order ID"
              >
                {copiedId ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-sm sm:text-base font-bold text-mountain-900 tracking-wide">
              {displayId}
            </p>
          </div>
          <span className="text-cream-300 hidden sm:inline">•</span>
          <div className="hidden sm:block">
            <p className="text-[11px] font-bold text-mountain-400 uppercase tracking-wider">Placed On</p>
            <p className="text-xs sm:text-sm font-medium text-mountain-700">{fmtDate(order.createdAt)}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
            {statusInfo.label}
          </span>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPaymentPending
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isEasypaisa ? 'Easypaisa' : order.paymentMethod}
            <span className="ml-1 text-[10px] font-normal uppercase opacity-75">
              • {order.paymentStatus || 'pending'}
            </span>
          </span>
        </div>
      </div>

      {/* Visual Progress Stepper */}
      {order.orderStatus !== 'cancelled' && (
        <div className="px-6 py-5 bg-cream-50/50 border-b border-cream-200">
          <OrderTimeline currentStatus={order.orderStatus} statusHistory={order.statusHistory} compact />
          <p className="text-center text-xs text-mountain-500 mt-3">{statusInfo.desc}</p>
        </div>
      )}

      {/* Courier Shipment Details Block (if assigned) */}
      {order.shipment && (order.shipment.courierName || order.shipment.trackingId) && (
        <div className="px-6 pt-5">
          <CourierInfoBlock shipment={order.shipment} />
        </div>
      )}

      {/* Easypaisa Payment Verification Helper (if pending) */}
      {isPaymentPending && isEasypaisa && (
        <div className="m-6 p-4 bg-gradient-to-r from-emerald-50 via-cream-50 to-amber-50 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <span>📱</span> Easypaisa Payment Pending
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Action Needed
                </span>
              </div>
              <p className="text-xs text-mountain-600">
                Please transfer <strong className="text-apricot-600">{fmtPKR(order.total)}</strong> to{' '}
                <strong className="text-stone-900">03495144486</strong> (Title: <strong>Shayan Danish</strong>)
              </p>
              {order.transactionId && (
                <p className="text-[11px] text-mountain-500 font-mono">
                  Your submitted TRX ID: <strong className="text-mountain-800">{order.transactionId}</strong>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyAccount}
                className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl transition"
              >
                {copiedAccount ? '✓ Copied Number' : 'Copy 03495144486'}
              </button>
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(
                    `Assalam o Alaikum! I am sharing my Easypaisa payment proof for Order #${shortId} (Rs. ${order.total}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <span>WhatsApp Receipt</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="p-6 divide-y divide-cream-200">
        <h3 className="text-xs font-bold text-mountain-400 uppercase tracking-wider mb-3">
          Ordered Products ({order.items?.length || 0})
        </h3>
        {order.items?.map((item, idx) => (
          <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-cream-200 overflow-hidden shrink-0 border border-cream-200">
                <ProductImage src={item.image} alt={item.name} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-mountain-900 truncate text-sm">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-cream-200 text-mountain-700 font-medium">
                    {item.variantLabel}
                  </span>
                  <span className="text-xs text-mountain-400">× {item.quantity}</span>
                </div>
              </div>
            </div>
            <span className="font-bold text-mountain-900 shrink-0 font-mono text-sm">
              {fmtPKR(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Details & Action Bar */}
      <div className="px-6 py-4 bg-cream-50/70 border-t border-cream-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mountain-500">
            Destination:{' '}
            <strong className="text-mountain-800">
              {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.province}
            </strong>
          </p>
          <p className="text-xs text-mountain-500 mt-0.5">
            Total:{' '}
            <span className="font-display font-bold text-base text-apricot-600">{fmtPKR(order.total)}</span>
            <span className="text-[11px] text-mountain-400 ml-1">(incl. flat Rs. 200 delivery)</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/track-order?orderId=${encodeURIComponent(order.orderId || order._id)}&phone=${encodeURIComponent(phoneParam)}`}
            className="px-4 py-2 bg-apricot-500 hover:bg-apricot-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <span>📍</span>
            <span>Live Tracking</span>
          </Link>

          <button
            type="button"
            onClick={() => onOpenInvoice(order)}
            className="px-3.5 py-2 bg-white border border-cream-300 hover:bg-cream-100 text-mountain-800 rounded-xl text-xs font-semibold transition"
          >
            View Invoice
          </button>

          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1"
            >
              <span>Support</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Main Page Component ──────────────────────────────────────────
export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Guest lookup state (so unauthenticated clients can check orders without login walls)
  const [guestOrderId, setGuestOrderId] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOrder, setGuestOrder] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  // Auto-check for recently placed order in browser session
  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('karakoram_last_order');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.orderId && parsed.phone) {
            setGuestOrderId(parsed.orderId);
            setGuestPhone(parsed.phone);
            lookupGuestOrder(parsed.orderId, parsed.phone);
          }
        }
      } catch {
        // ignore storage access errors
      }
    }
  }, [user]);

  const lookupGuestOrder = async (oid, ph) => {
    if (!oid || !ph) return;
    setGuestLoading(true);
    setGuestError('');
    try {
      const res = await api.get('/orders/track', {
        params: { orderId: oid.trim(), phone: ph.trim() },
      });
      setGuestOrder(res.data);
    } catch (err) {
      setGuestError(
        err.response?.data?.message || 'Order not found. Please verify Order ID and Phone.'
      );
    } finally {
      setGuestLoading(false);
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!guestOrderId.trim() || !guestPhone.trim()) {
      setGuestError('Please enter both Order ID and Phone number.');
      return;
    }
    lookupGuestOrder(guestOrderId, guestPhone);
  };

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then((r) => r.data),
    enabled: !!user,
  });

  // Calculate quick metrics
  const metrics = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return {
      total: list.length,
      pending: list.filter((o) => o.paymentStatus === 'pending' || o.orderStatus === 'pending').length,
      shipped: list.filter((o) => o.orderStatus === 'shipped').length,
      delivered: list.filter((o) => o.orderStatus === 'delivered').length,
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let list = Array.isArray(orders) ? orders : [];

    if (filter === 'pending') {
      list = list.filter((o) => o.paymentStatus === 'pending' || o.orderStatus === 'pending');
    } else if (filter === 'shipped') {
      list = list.filter((o) => o.orderStatus === 'shipped');
    } else if (filter === 'delivered') {
      list = list.filter((o) => o.orderStatus === 'delivered');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) => {
        const idMatch = o._id?.toLowerCase().includes(q);
        const cityMatch = o.shippingAddress?.city?.toLowerCase().includes(q);
        const itemMatch = o.items?.some((i) => i.name?.toLowerCase().includes(q) || i.variantLabel?.toLowerCase().includes(q));
        const trxMatch = o.transactionId?.toLowerCase().includes(q);
        return idMatch || cityMatch || itemMatch || trxMatch;
      });
    }

    return list;
  }, [orders, filter, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <SEO
        title="Client Orders Dashboard – Karakoram Store"
        description="View all your past and live Karakoram Store orders, Easypaisa payment verification, and delivery tracking."
      />

      {/* Invoice Modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      )}

      {/* Back to Shop Navigation Button */}
      <div className="mb-4">
        <Link
          to="/shop"
          id="orders-back-to-shop-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-7 h-7 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Shop</span>
        </Link>
      </div>

      {/* Header & Client Profile Hero */}
      <div className="bg-gradient-to-br from-mountain-900 via-mountain-800 to-mountain-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-apricot-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-apricot-500 to-apricot-400 text-white font-bold text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-apricot-500/20 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || '📦'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
                  {user ? 'My Orders Dashboard' : 'Track & Check Your Order'}
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {user ? 'Client Hub' : 'Order Lookup'}
                </span>
              </div>
              <p className="text-mountain-300 text-xs sm:text-sm mt-0.5">
                {user
                  ? `Welcome, ${user.name} (${user.email})`
                  : 'Look up live status, Easypaisa receipt verification, and shipment details'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/shop"
              className="px-5 py-2.5 rounded-xl bg-apricot-500 hover:bg-apricot-600 active:scale-95 text-white text-xs font-bold transition shadow-sm"
            >
              Browse Shop &rarr;
            </Link>
            {!user && (
              <Link
                to="/login"
                state={{ from: '/my-orders' }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* KPI Metric Chips (when logged in) */}
        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-mountain-700/60">
            <div
              onClick={() => setFilter('all')}
              className={`p-3 rounded-2xl cursor-pointer transition border ${
                filter === 'all'
                  ? 'bg-white/20 border-white/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="text-mountain-300 text-[11px] font-semibold uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold font-mono text-white mt-0.5">{metrics.total}</p>
            </div>

            <div
              onClick={() => setFilter('pending')}
              className={`p-3 rounded-2xl cursor-pointer transition border ${
                filter === 'pending'
                  ? 'bg-amber-500/30 border-amber-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="text-amber-300 text-[11px] font-semibold uppercase tracking-wider">Awaiting Verification</p>
              <p className="text-2xl font-bold font-mono text-white mt-0.5">{metrics.pending}</p>
            </div>

            <div
              onClick={() => setFilter('shipped')}
              className={`p-3 rounded-2xl cursor-pointer transition border ${
                filter === 'shipped'
                  ? 'bg-purple-500/30 border-purple-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="text-purple-300 text-[11px] font-semibold uppercase tracking-wider">Dispatched</p>
              <p className="text-2xl font-bold font-mono text-white mt-0.5">{metrics.shipped}</p>
            </div>

            <div
              onClick={() => setFilter('delivered')}
              className={`p-3 rounded-2xl cursor-pointer transition border ${
                filter === 'delivered'
                  ? 'bg-emerald-500/30 border-emerald-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-bold font-mono text-white mt-0.5">{metrics.delivered}</p>
            </div>
          </div>
        )}
      </div>

      {/* Guest Direct Order Lookup (NO lock screen!) */}
      {!authLoading && !user && (
        <div className="space-y-6 mb-10">
          {/* Quick Lookup Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-sm">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-apricot-100 text-apricot-700 text-xs font-bold mb-2">
                  <span>🔍</span> Instant Order Finder
                </span>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-mountain-900">
                  Check Your Order Status
                </h2>
                <p className="text-xs sm:text-sm text-mountain-500 mt-1">
                  Enter the Order ID from your confirmation screen and the phone number used at checkout.
                </p>
              </div>

              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guest-order-id" className="block text-xs font-bold text-mountain-700 mb-1">
                      Order ID <span className="text-apricot-500">*</span>
                    </label>
                    <input
                      id="guest-order-id"
                      type="text"
                      value={guestOrderId}
                      onChange={(e) => setGuestOrderId(e.target.value)}
                      placeholder="e.g. 6addacdf46ea..."
                      className="w-full text-xs px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-apricot-400 font-mono text-mountain-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="guest-phone" className="block text-xs font-bold text-mountain-700 mb-1">
                      Phone Number <span className="text-apricot-500">*</span>
                    </label>
                    <input
                      id="guest-phone"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="e.g. 0349XXXXXXX"
                      className="w-full text-xs px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-apricot-400 text-mountain-900"
                    />
                  </div>
                </div>

                {guestError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{guestError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-mountain-400">
                    Already have an account?{' '}
                    <Link to="/login" state={{ from: '/my-orders' }} className="text-apricot-600 font-bold hover:underline">
                      Sign In
                    </Link>{' '}
                    to sync all past orders.
                  </p>

                  <button
                    type="submit"
                    disabled={guestLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    {guestLoading ? 'Searching Order…' : 'Check Order Status →'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Display Found Guest Order */}
          {guestOrder && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-display font-bold text-mountain-900 text-base">
                  Found Order Details
                </h3>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  ✓ Verified Match
                </span>
              </div>
              <OrderCard order={guestOrder} onOpenInvoice={setSelectedInvoiceOrder} />
            </div>
          )}
        </div>
      )}

      {/* Loading Skeletons */}
      {(authLoading || (user && isLoading)) && (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-56 bg-white rounded-3xl animate-pulse border border-cream-200" />
          ))}
        </div>
      )}

      {/* Error State */}
      {user && error && <ErrorState message={error.message} onRetry={refetch} />}

      {/* Main Content when user logged in and query finished */}
      {user && !isLoading && !error && (
        <div className="space-y-6">
          {/* Controls Bar: Filters & Search */}
          {orders.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-cream-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {[
                  { id: 'all', label: 'All Orders', count: metrics.total },
                  { id: 'pending', label: 'Pending', count: metrics.pending },
                  { id: 'shipped', label: 'Dispatched', count: metrics.shipped },
                  { id: 'delivered', label: 'Delivered', count: metrics.delivered },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                      filter === tab.id
                        ? 'bg-mountain-900 text-white shadow-xs'
                        : 'bg-cream-100 hover:bg-cream-200 text-mountain-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        filter === tab.id ? 'bg-white/25 text-white' : 'bg-cream-300 text-mountain-800'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Order ID, product, city…"
                  className="w-full text-xs pl-8 pr-7 py-2 bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-apricot-400 text-mountain-800 placeholder-mountain-400"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-mountain-400">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-xs text-mountain-400 hover:text-mountain-800"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Orders List */}
          {filteredOrders.length > 0 && (
            <div className="space-y-6">
              {filteredOrders.map((ord) => (
                <OrderCard key={ord._id} order={ord} onOpenInvoice={setSelectedInvoiceOrder} />
              ))}
            </div>
          )}

          {/* Zero Search Results State */}
          {orders.length > 0 && filteredOrders.length === 0 && (
            <div className="bg-white rounded-3xl p-10 text-center border border-cream-200 shadow-sm">
              <p className="text-4xl mb-3">🔍</p>
              <h3 className="font-display font-bold text-lg text-mountain-900 mb-1">
                No orders match your filter
              </h3>
              <p className="text-xs text-mountain-500 mb-4">
                Try clearing your search query or switching to "All Orders".
              </p>
              <button
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
                className="px-5 py-2 rounded-xl bg-apricot-500 hover:bg-apricot-600 text-white font-bold text-xs transition"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Empty Orders State (New Account) */}
          {orders.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-cream-200 shadow-sm max-w-lg mx-auto">
              <div className="w-20 h-20 bg-apricot-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                🏔️
              </div>
              <h2 className="font-display font-bold text-2xl text-mountain-900 mb-2">
                No Orders Placed Yet
              </h2>
              <p className="text-mountain-500 text-xs sm:text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                You haven't placed any orders with this account yet. When you order, your live tracking, Easypaisa receipts, and delivery timeline will appear here automatically!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/shop"
                  className="px-7 py-3 bg-apricot-500 hover:bg-apricot-600 text-white font-bold rounded-full text-xs transition shadow-sm"
                >
                  Start Shopping
                </Link>
                <Link
                  to="/track-order"
                  className="px-6 py-3 bg-cream-100 hover:bg-cream-200 text-mountain-800 font-semibold rounded-full text-xs transition"
                >
                  Track an Existing Order
                </Link>
              </div>
            </div>
          )}

          {/* Quick Help Footer */}
          <div className="p-5 bg-gradient-to-r from-cream-100 via-white to-cream-100 rounded-2xl border border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-mountain-600">
            <div className="flex items-center gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <p className="font-bold text-mountain-900">How Order Tracking Works</p>
                <p className="text-mountain-500 text-[11px]">
                  Orders are dispatched within 24 hours of Easypaisa payment verification and take 3–5 days across Pakistan.
                </p>
              </div>
            </div>
            <Link
              to="/contact"
              className="text-apricot-600 hover:text-apricot-700 font-bold whitespace-nowrap underline"
            >
              Need Support? Contact Us &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
