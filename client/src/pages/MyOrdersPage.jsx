// ── My Orders Page ───────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { fmtPKR, fmtDate, getCleanWhatsAppNumber } from '../lib/utils';
import ProductImage from '../components/ui/ProductImage';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';


const STATUS_BADGES = {
  pending:   { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100',  text: 'text-blue-800',  label: 'Confirmed' },
  shipped:   { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dispatched' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  cancelled: { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Cancelled' },
};

function OrderCard({ order }) {
  const statusInfo = STATUS_BADGES[order.orderStatus?.toLowerCase()] || STATUS_BADGES.pending;
  const wa = getCleanWhatsAppNumber();

  return (
    <article
      id={`order-card-${order._id}`}
      className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden transition-all hover:shadow-md"
    >
      {/* Top Header */}
      <div className="bg-cream-100/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-cream-200">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-semibold text-mountain-400 uppercase tracking-wider">Order ID</p>
            <p className="font-mono text-sm font-bold text-mountain-900">#{order._id?.slice(-8).toUpperCase()}</p>
          </div>
          <span className="text-cream-300">•</span>
          <div>
            <p className="text-[11px] font-semibold text-mountain-400 uppercase tracking-wider">Placed On</p>
            <p className="text-sm text-mountain-700">{fmtDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
            {statusInfo.label}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-cream-200 text-mountain-700 font-medium">
            {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="p-6 divide-y divide-cream-200">
        {order.items?.map((item, idx) => (
          <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-cream-200 overflow-hidden shrink-0">
                <ProductImage src={item.image} alt={item.name} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-mountain-900 truncate">{item.name}</p>
                <p className="text-xs text-mountain-500">
                  Variant: <span className="text-mountain-700">{item.variantLabel}</span> × {item.quantity}
                </p>
              </div>
            </div>
            <span className="font-semibold text-mountain-900 shrink-0">
              {fmtPKR(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Info & Actions */}
      <div className="px-6 py-4 bg-cream-50/50 border-t border-cream-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mountain-500">
            Delivering to: <span className="font-medium text-mountain-800">{order.shippingAddress?.city}, {order.shippingAddress?.province}</span>
          </p>
          <p className="text-xs text-mountain-500 mt-0.5">
            Total: <span className="font-display font-bold text-base text-apricot-600">{fmtPKR(order.total)}</span> (incl. Rs. 200 delivery)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/track-order?orderId=${order._id}&phone=${order.shippingAddress?.phone || ''}`}
            className="px-4 py-2 bg-white border border-cream-300 hover:bg-cream-100 text-mountain-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Track Status
          </Link>
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(
                `Hello! Regarding my order #${order._id}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              WhatsApp Support
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then((r) => r.data),
    enabled: !!user,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="My Orders"
        description="View your order history, delivery progress, and past purchases at Karakoram Store."
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-mountain-900 mb-1">
            My Orders
          </h1>
          <p className="text-mountain-600 text-sm">
            {user ? `Welcome back, ${user.name}` : 'Order history & status'}
          </p>
        </div>

        <Link
          to="/shop"
          className="px-5 py-2.5 rounded-full bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-bold transition-all shadow-sm"
        >
          Browse Shop →
        </Link>
      </div>

      {/* Auth state check */}
      {authLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!authLoading && !user && (
        <div className="bg-white rounded-3xl p-10 text-center border border-cream-200 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-apricot-100 flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          <h2 className="font-display font-bold text-xl text-mountain-900 mb-2">
            Sign In to View Orders
          </h2>
          <p className="text-mountain-600 text-sm mb-6">
            Log in to view your complete order history, or use our guest tracking tool if you checked out as a guest.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              state={{ from: '/my-orders' }}
              className="px-6 py-3 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full text-sm transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/track-order"
              className="px-6 py-3 bg-white border border-cream-300 hover:bg-cream-100 text-mountain-800 font-semibold rounded-full text-sm transition-colors"
            >
              Track Guest Order
            </Link>
          </div>
        </div>
      )}

      {/* Authenticated queries */}
      {user && isLoading && (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {user && error && (
        <ErrorState message={error.message} onRetry={refetch} />
      )}

      {user && !isLoading && !error && orders?.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-cream-200 shadow-sm">
          <p className="text-5xl mb-4">🏔️</p>
          <h2 className="font-display font-bold text-2xl text-mountain-900 mb-2">
            No Orders Yet
          </h2>
          <p className="text-mountain-500 text-sm max-w-sm mx-auto mb-6">
            You haven't placed any orders yet. Discover authentic dried fruits, nuts, and handicrafts from Hunza.
          </p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full transition-colors text-sm shadow-sm"
          >
            Start Shopping
          </Link>
        </div>
      )}

      {user && !isLoading && !error && orders?.length > 0 && (
        <div className="space-y-6">
          {orders.map((ord) => (
            <OrderCard key={ord._id} order={ord} />
          ))}
        </div>
      )}
    </div>
  );
}
