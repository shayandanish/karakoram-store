import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { fmtPKR, fmtDate } from '../../lib/utils';
import SEO from '../../components/ui/SEO';

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
  });

  return (
    <div className="space-y-8">
      <SEO title="Dashboard - Admin Panel" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Real-time performance metrics and store inventory status.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 text-stone-500 ${isFetching ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{isFetching ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between">
          <p>Failed to load dashboard metrics: {error?.response?.data?.message || error?.message}</p>
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold underline hover:text-rose-950 ml-4"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 bg-stone-200 rounded-md animate-pulse w-3/4 mb-1" />
          ) : (
            <div className="text-2xl font-bold font-display text-mountain-900 tracking-tight">
              {fmtPKR(stats?.totalRevenue || 0)}
            </div>
          )}
          <p className="text-xs text-stone-500 mt-1">Paid orders to date</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 bg-stone-200 rounded-md animate-pulse w-1/2 mb-1" />
          ) : (
            <div className="text-2xl font-bold font-display text-mountain-900 tracking-tight">
              {stats?.totalOrders ?? 0}
            </div>
          )}
          <p className="text-xs text-stone-500 mt-1">Across all order statuses</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-500" />
        </div>

        {/* Pending Orders */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Pending Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 bg-stone-200 rounded-md animate-pulse w-1/3 mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-mountain-900 tracking-tight">
                {stats?.pendingOrders ?? 0}
              </span>
              {(stats?.pendingOrders || 0) > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Needs Attention
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-stone-500 mt-1">Awaiting fulfillment</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
        </div>

        {/* Low-Stock Products */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Low-Stock Items
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 bg-stone-200 rounded-md animate-pulse w-1/3 mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-mountain-900 tracking-tight">
                {stats?.lowStockCount ?? stats?.lowStockProducts?.length ?? 0}
              </span>
              {(stats?.lowStockCount || stats?.lowStockProducts?.length || 0) > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Stock &lt; 10
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-stone-500 mt-1">Variants below threshold</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-rose-500" />
        </div>
      </div>

      {/* ── Two Column: Low-Stock Products + Recent Orders ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders (2 Columns on large) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display text-mountain-900">
                Recent Orders
              </h2>
              <p className="text-xs text-stone-500">Latest customer purchases</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-apricot-600 hover:text-apricot-700 flex items-center gap-1 transition"
            >
              <span>View All Orders</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !stats?.recentOrders || stats.recentOrders.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">
              No recent orders found.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
                    <tr>
                      <th className="py-3 px-5">Order ID</th>
                      <th className="py-3 px-5">Customer</th>
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Total</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {stats.recentOrders.map((order) => {
                      const customerName =
                        order.user?.name ||
                        order.guestName ||
                        order.shippingAddress?.name ||
                        'Customer';
                      return (
                        <tr key={order._id} className="hover:bg-stone-50/80 transition">
                          <td className="py-3.5 px-5 font-mono text-xs font-medium text-mountain-800">
                            #{order._id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="font-medium text-stone-900 block truncate max-w-[140px]">
                              {customerName}
                            </span>
                            <span className="text-[11px] text-stone-500 block truncate max-w-[140px]">
                              {order.guestPhone || order.shippingAddress?.phone || order.user?.email}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-xs text-stone-600">
                            {fmtDate(order.createdAt)}
                          </td>
                          <td className="py-3.5 px-5 font-semibold text-mountain-900 text-xs">
                            {fmtPKR(order.total)}
                          </td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                order.orderStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.orderStatus === 'shipped'
                                  ? 'bg-sky-100 text-sky-800'
                                  : order.orderStatus === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <Link
                              to={`/admin/orders?search=${order._id}`}
                              className="text-xs font-semibold text-apricot-600 hover:text-apricot-800"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View */}
              <div className="sm:hidden divide-y divide-stone-100">
                {stats.recentOrders.map((order) => {
                  const customerName =
                    order.user?.name ||
                    order.guestName ||
                    order.shippingAddress?.name ||
                    'Customer';
                  return (
                    <div key={order._id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-mountain-900">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            order.orderStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.orderStatus === 'shipped'
                              ? 'bg-sky-100 text-sky-800'
                              : order.orderStatus === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-medium text-stone-900">{customerName}</span>
                        <span className="font-semibold text-mountain-900">{fmtPKR(order.total)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-stone-500 pt-1">
                        <span>{fmtDate(order.createdAt)}</span>
                        <Link
                          to={`/admin/orders?search=${order._id}`}
                          className="font-semibold text-apricot-600 hover:text-apricot-700"
                        >
                          Manage Order &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Low-Stock Alert List (1 Column on large) */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display text-mountain-900 flex items-center gap-2">
                <span>Low-Stock Inventory</span>
                {(stats?.lowStockProducts?.length || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </h2>
              <p className="text-xs text-stone-500">Items with stock under 10 units</p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-apricot-600 hover:text-apricot-700 transition"
            >
              All Items
            </Link>
          </div>

          <div className="p-4 flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !stats?.lowStockProducts || stats.lowStockProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-stone-500 text-xs">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-stone-700">Healthy Stock Levels</p>
                <p className="mt-0.5 text-stone-500">All product variants currently have 10+ items in stock.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.lowStockProducts.map((p) => {
                  const criticalVariants = (p.variants || []).filter((v) => v.stock < 10);
                  return (
                    <div
                      key={p._id}
                      className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/80 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/admin/products/${p._id}/edit`}
                          className="text-xs font-bold text-mountain-900 hover:text-apricot-600 truncate block"
                        >
                          {p.name}
                        </Link>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {criticalVariants.map((v) => (
                            <span
                              key={v.label}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                v.stock === 0
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {v.label}: {v.stock} left
                            </span>
                          ))}
                        </div>
                      </div>

                      <Link
                        to={`/admin/products/${p._id}/edit`}
                        className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg shadow-2xs shrink-0 transition"
                      >
                        Restock
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
