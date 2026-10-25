import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { fmtPKR, fmtDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

const STATUS_TABS = [
  { id: '', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const ORDER_STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'failed', 'refunded'];

export default function AdminOrdersPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Status edit state for selected order modal
  const [modalOrderStatus, setModalOrderStatus] = useState('pending');
  const [modalPaymentStatus, setModalPaymentStatus] = useState('pending');

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setModalOrderStatus(order.orderStatus);
    setModalPaymentStatus(order.paymentStatus);
  };

  // Fetch Orders
  const {
    data: orderData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-orders', statusFilter, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('page', page);
      params.append('limit', 15);

      const res = await api.get(`/admin/orders?${params.toString()}`);
      return res.data;
    },
  });

  const orders = orderData?.orders || [];
  const totalPages = orderData?.pages || 1;
  const totalOrders = orderData?.total || 0;

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, orderStatus, paymentStatus }) => {
      const res = await api.put(`/admin/orders/${id}`, {
        orderStatus,
        paymentStatus,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success(`Order #${updated._id.slice(-6).toUpperCase()} updated successfully`);
      setSelectedOrder(updated);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    },
  });

  const handleUpdateStatus = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    updateStatusMutation.mutate({
      id: selectedOrder._id,
      orderStatus: modalOrderStatus,
      paymentStatus: modalPaymentStatus,
    });
  };

  return (
    <div className="space-y-6">
      <SEO title="Orders Management - Admin Panel" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Orders & Shipments
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Track customer deliveries, verify payment receipts, and manage order lifecycles.
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === tab.id
                ? 'bg-mountain-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order ID (full or partial), phone number, or customer name..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition"
          />
          <svg
            className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {search && (
          <button
            onClick={() => {
              setSearch('');
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 rounded-xl transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Orders List Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-700">
            <p className="text-sm">Failed to load orders: {error?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-100 rounded-lg hover:bg-rose-200"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <p className="text-base font-semibold text-stone-700 font-display">No orders found</p>
            <p className="text-xs text-stone-500 mt-1">
              {search || statusFilter
                ? 'Try clearing your search query or switching status tabs.'
                : 'No customer orders have been placed yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ─────────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
                  <tr>
                    <th className="py-3 px-5">Order ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Order Status</th>
                    <th className="py-3 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((o) => {
                    const customerName =
                      o.user?.name || o.guestName || o.shippingAddress?.name || 'Customer';
                    const customerPhone =
                      o.guestPhone || o.shippingAddress?.phone || '—';
                    const itemCount = (o.items || []).reduce((sum, i) => sum + i.quantity, 0);

                    return (
                      <tr key={o._id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 px-5 font-mono text-xs font-bold text-mountain-800">
                          #{o._id.slice(-6).toUpperCase()}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-stone-600 whitespace-nowrap">
                          {fmtDate(o.createdAt)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-900 block truncate max-w-[150px]">
                            {customerName}
                          </span>
                          <span className="text-[11px] text-stone-500 block truncate max-w-[150px]">
                            {customerPhone}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-stone-600">
                          {itemCount} item{itemCount === 1 ? '' : 's'}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-bold text-mountain-900">
                          {fmtPKR(o.total)}
                          <span className="block text-[10px] font-semibold text-emerald-700">
                            {o.paymentMethod === 'easypaisa' ? 'Easypaisa' : o.paymentMethod}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              o.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.paymentStatus === 'failed' || o.paymentStatus === 'refunded'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              o.orderStatus === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.orderStatus === 'shipped'
                                ? 'bg-sky-100 text-sky-800'
                                : o.orderStatus === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.orderStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => openOrderDetails(o)}
                            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Stacked Cards ─────────────────────────── */}
            <div className="lg:hidden divide-y divide-stone-100">
              {orders.map((o) => {
                const customerName =
                  o.user?.name || o.guestName || o.shippingAddress?.name || 'Customer';
                const customerPhone =
                  o.guestPhone || o.shippingAddress?.phone || '—';
                const itemCount = (o.items || []).reduce((sum, i) => sum + i.quantity, 0);

                return (
                  <div key={o._id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-mountain-900">
                        #{o._id.slice(-6).toUpperCase()}
                      </span>
                      <div className="flex gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            o.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            o.orderStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.orderStatus === 'shipped'
                              ? 'bg-sky-100 text-sky-800'
                              : o.orderStatus === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.orderStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline text-xs">
                      <div>
                        <span className="font-semibold text-stone-900 block">{customerName}</span>
                        <span className="text-[11px] text-stone-500">{customerPhone}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-mountain-900 text-sm block">{fmtPKR(o.total)}</span>
                        <span className="text-[10px] font-semibold text-emerald-700 block">
                          {o.paymentMethod === 'easypaisa' ? 'Easypaisa' : o.paymentMethod}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                      <span>{fmtDate(o.createdAt)} • {itemCount} item{itemCount === 1 ? '' : 's'}</span>
                      <button
                        onClick={() => openOrderDetails(o)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition"
                      >
                        Inspect Details &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-stone-500">
                  Showing page <strong className="text-stone-900">{page}</strong> of{' '}
                  <strong className="text-stone-900">{totalPages}</strong> ({totalOrders} orders)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 font-medium transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 font-medium transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order Details Modal / Drawer ─────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-display text-mountain-900">
                    Order #{selectedOrder._id.slice(-6).toUpperCase()}
                  </h2>
                  <span className="text-xs font-mono text-stone-400">
                    ({selectedOrder._id})
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Placed on {fmtDate(selectedOrder.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Update Form */}
            <form
              onSubmit={handleUpdateStatus}
              className="p-4 bg-apricot-50/50 border border-apricot-200/80 rounded-xl space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-apricot-800">
                Update Order & Payment Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Fulfillment / Order Status
                  </label>
                  <select
                    value={modalOrderStatus}
                    onChange={(e) => setModalOrderStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-apricot-500 focus:outline-hidden capitalize"
                  >
                    {ORDER_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st} className="capitalize">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={modalPaymentStatus}
                    onChange={(e) => setModalPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-apricot-500 focus:outline-hidden capitalize"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((ps) => (
                      <option key={ps} value={ps} className="capitalize">
                        {ps}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-semibold rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Save Status Update'}
                </button>
              </div>
            </form>

            {/* Customer & Shipping info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                  Customer Contact
                </h4>
                <p className="font-medium text-stone-900">
                  {selectedOrder.user?.name || selectedOrder.guestName || selectedOrder.shippingAddress?.name}
                </p>
                <p className="text-stone-600">
                  {selectedOrder.user?.email || selectedOrder.guestEmail || 'No email provided'}
                </p>
                <p className="text-stone-600">
                  Phone: {selectedOrder.guestPhone || selectedOrder.shippingAddress?.phone}
                </p>
                <span className="inline-block mt-1 text-[10px] bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-medium">
                  {selectedOrder.user ? 'Registered User Account' : 'Guest Checkout'}
                </span>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                  Shipping Address
                </h4>
                <p className="text-stone-700">{selectedOrder.shippingAddress?.street}</p>
                <p className="text-stone-700">
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.province}{' '}
                  {selectedOrder.shippingAddress?.postalCode || ''}
                </p>
                <p className="text-stone-700">{selectedOrder.shippingAddress?.country || 'Pakistan'}</p>
                <p className="text-stone-500 pt-1">
                  Method:{' '}
                  <strong className="text-stone-800">
                    {selectedOrder.paymentMethod === 'easypaisa' ? 'Easypaisa' : selectedOrder.paymentMethod?.toUpperCase()}
                  </strong>
                </p>
                {selectedOrder.transactionId && (
                  <div className="text-stone-700 text-xs bg-emerald-50 border border-emerald-200/80 rounded-lg p-2.5 mt-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Easypaisa TRX ID / Sender Number</span>
                    <strong className="font-mono text-emerald-950 text-sm">{selectedOrder.transactionId}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Notes if any */}
            {selectedOrder.notes && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong className="block mb-0.5">Customer Delivery Notes:</strong>
                {selectedOrder.notes}
              </div>
            )}

            {/* Ordered Items Table */}
            <div className="space-y-3">
              <h4 className="font-bold font-display text-mountain-900 text-sm">
                Ordered Items ({selectedOrder.items?.length || 0})
              </h4>
              <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-stone-400">No img</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-mountain-900 truncate">{item.name}</p>
                        <p className="text-stone-500 text-[11px]">Variant: {item.variantLabel}</p>
                        <p className="text-stone-500 text-[11px]">
                          {fmtPKR(item.price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-mountain-900 text-sm shrink-0">
                      {fmtPKR(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{fmtPKR(selectedOrder.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping Cost</span>
                <span>{fmtPKR(selectedOrder.shippingCost || 0)}</span>
              </div>
              {(selectedOrder.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                  <span>- {fmtPKR(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-mountain-900 pt-2 border-t border-stone-200">
                <span>Total Amount</span>
                <span>{fmtPKR(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
