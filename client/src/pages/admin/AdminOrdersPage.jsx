import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { fmtPKR, fmtDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

const STATUS_TABS = [
  { id: '', label: 'All Orders' },
  { id: 'pending', label: '1. Placed' },
  { id: 'confirmed', label: '2. Confirmed' },
  { id: 'processing', label: '3. Processing' },
  { id: 'packed', label: '4. Packed' },
  { id: 'shipped', label: '5. Shipped' },
  { id: 'out_for_delivery', label: '6. Out for Delivery' },
  { id: 'delivered', label: '7. Delivered' },
  { id: 'cancelled', label: '8. Cancelled' },
  { id: 'returned', label: '9. Returned' },
];

const ORDER_STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'failed', 'refunded'];

const COURIER_PRESETS = [
  { name: 'TCS', url: (cn) => `https://www.tcsexpress.com/tracking?trackingNumber=${cn}` },
  { name: 'Leopards Courier', url: (cn) => `https://leopardscourier.com/tracking?track_number=${cn}` },
  { name: 'Trax', url: (cn) => `https://trax.pk/tracking?tracking_number=${cn}` },
  { name: 'M&P', url: (cn) => `https://mulphilog.com/tracking?track=${cn}` },
  { name: 'Call Courier', url: (cn) => `https://callcourier.com.pk/tracking/?tc=${cn}` },
  { name: 'PostEx', url: (cn) => `https://postex.pk/tracking?cn=${cn}` },
  { name: 'Rider', url: (cn) => `https://withrider.com/tracking/${cn}` },
  { name: 'Pakistan Post', url: () => `http://ep.gov.pk/` },
  { name: 'Other Courier', url: () => '' },
];

export default function AdminOrdersPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalTab, setModalTab] = useState('details'); // 'details' | 'history' | 'notifications'

  // Shipment & status update form state
  const [modalOrderStatus, setModalOrderStatus] = useState('pending');
  const [modalPaymentStatus, setModalPaymentStatus] = useState('pending');
  const [courierName, setCourierName] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [previewProofImage, setPreviewProofImage] = useState(null);

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setModalTab('details');
    setModalOrderStatus(order.orderStatus || 'pending');
    setModalPaymentStatus(order.paymentStatus || 'pending');
    setCourierName(order.shipment?.courierName || '');
    setTrackingId(order.shipment?.trackingId || '');
    setTrackingUrl(order.shipment?.trackingUrl || '');
    setEstimatedDelivery(
      order.shipment?.estimatedDelivery
        ? new Date(order.shipment.estimatedDelivery).toISOString().slice(0, 10)
        : ''
    );
    setAdminNotes(order.adminNotes || '');
    setStatusNote('');
    setNotifyCustomer(true);
  };

  const handleCourierSelect = (name) => {
    setCourierName(name);
    const preset = COURIER_PRESETS.find((p) => p.name === name);
    if (preset && trackingId.trim()) {
      setTrackingUrl(preset.url(trackingId.trim()));
    }
  };

  const handleTrackingIdChange = (id) => {
    setTrackingId(id);
    const preset = COURIER_PRESETS.find((p) => p.name === courierName);
    if (preset && id.trim()) {
      setTrackingUrl(preset.url(id.trim()));
    }
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
    queryKey: ['admin-orders', statusFilter, paymentFilter, search, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment', paymentFilter);
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page);
      params.append('limit', 15);

      const res = await api.get(`/admin/orders?${params.toString()}`);
      return res.data;
    },
  });

  const orders = orderData?.orders || [];
  const totalPages = orderData?.pages || 1;
  const totalOrders = orderData?.total || 0;

  // Update order status & shipment mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/admin/orders/${id}`, payload);
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success(
        `Order #${updated.orderId || updated._id.slice(-6).toUpperCase()} updated successfully`
      );
      setSelectedOrder(updated);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    },
  });

  // Re-send Notification Mutation
  const resendNotificationMutation = useMutation({
    mutationFn: async ({ id, event, channel }) => {
      const res = await api.post(`/admin/orders/${id}/resend-notification`, { event, channel });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Notification dispatched successfully');
      // Refresh selected order to update notificationLog
      api.get(`/admin/orders/${selectedOrder._id}`).then((res) => setSelectedOrder(res.data));
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to dispatch notification');
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      await api.delete(`/admin/orders/${orderId}`);
      return orderId;
    },
    onSuccess: (deletedId) => {
      toast.success(`Order #${deletedId.slice(-6).toUpperCase()} deleted`);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedOrder(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete order');
    },
  });

  const handleSaveOrder = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const payload = {
      orderStatus: modalOrderStatus,
      paymentStatus: modalPaymentStatus,
      shipment: {
        courierName: courierName.trim(),
        trackingId: trackingId.trim(),
        trackingUrl: trackingUrl.trim(),
        estimatedDelivery: estimatedDelivery || null,
      },
      adminNotes: adminNotes.trim(),
      statusNote: statusNote.trim() || undefined,
      notifyCustomer,
    };

    updateOrderMutation.mutate({
      id: selectedOrder._id,
      payload,
    });
  };

  const handleOneClickConfirmPayment = () => {
    if (!selectedOrder) return;
    setModalPaymentStatus('paid');
    setModalOrderStatus('confirmed');
    const note = 'Payment verified by admin via uploaded screenshot. Order confirmed for processing.';
    setStatusNote(note);

    updateOrderMutation.mutate({
      id: selectedOrder._id,
      payload: {
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        shipment: {
          courierName: courierName.trim(),
          trackingId: trackingId.trim(),
          trackingUrl: trackingUrl.trim(),
          estimatedDelivery: estimatedDelivery || null,
        },
        adminNotes: adminNotes.trim(),
        statusNote: note,
        notifyCustomer: true,
      },
    });
  };

  return (
    <div className="space-y-6">
      <SEO title="Orders & Delivery Management - Admin Panel" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Orders & Delivery Management
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage customer purchases, assign couriers, input CN tracking, and trigger delivery notifications.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* Filter Tabs for all 9 Order Statuses */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-mountain-900 text-white shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters & Search Row */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Order ID (KS-...), Customer, Phone, Email, Courier CN..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-apricot-400"
          />
          <svg className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700"
          >
            <option value="">All Payment Statuses</option>
            <option value="pending">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Date range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700"
            title="Start date"
          />
          <span className="text-stone-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700"
            title="End date"
          />

          {(search || paymentFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setPaymentFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-stone-500 hover:text-stone-800 underline px-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-stone-400 text-xs">Loading orders database…</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500 text-xs">{error?.message || 'Failed to load orders'}</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <span className="text-3xl block">📦</span>
            <p className="text-sm font-semibold text-stone-700">No orders match criteria</p>
            <p className="text-xs text-stone-400">Try adjusting your status filter or search parameters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Courier Logistics</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((o) => {
                    const displayId = o.orderId || `#${o._id.slice(-6).toUpperCase()}`;
                    const customerName =
                      o.shippingAddress?.name || o.guestName || o.user?.name || 'Customer';
                    const customerPhone = o.guestPhone || o.shippingAddress?.phone || '—';

                    return (
                      <tr key={o._id} className="hover:bg-stone-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-mountain-900">
                          {displayId}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{customerName}</p>
                          <p className="text-[11px] text-stone-400">{customerPhone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                              o.orderStatus === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.orderStatus === 'shipped'
                                ? 'bg-fuchsia-100 text-fuchsia-800'
                                : o.orderStatus === 'out_for_delivery'
                                ? 'bg-orange-100 text-orange-800'
                                : o.orderStatus === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.orderStatus?.replace('_', ' ') || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {o.shipment?.courierName || o.shipment?.trackingId ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-stone-800 block text-[11px]">
                                {o.shipment.courierName || 'Courier'}
                              </span>
                              {o.shipment.trackingId && (
                                <span className="font-mono text-[10px] text-stone-500 block">
                                  CN: {o.shipment.trackingId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              o.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                          <span className="block text-[10px] text-stone-400 mt-0.5 capitalize">
                            {o.paymentMethod}
                          </span>
                          {o.paymentScreenshot && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded mt-1">
                              <span>📷</span> Proof
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-mountain-900 font-mono">
                          {fmtPKR(o.total)}
                        </td>
                        <td className="px-4 py-3 text-stone-400 text-[11px] whitespace-nowrap">
                          {fmtDate(o.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openOrderDetails(o)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Manage &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="lg:hidden divide-y divide-stone-100">
              {orders.map((o) => {
                const displayId = o.orderId || `#${o._id.slice(-6).toUpperCase()}`;
                const customerName =
                  o.shippingAddress?.name || o.guestName || o.user?.name || 'Customer';
                const customerPhone = o.guestPhone || o.shippingAddress?.phone || '—';

                return (
                  <div key={o._id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-mountain-900 text-xs">
                        {displayId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          o.orderStatus === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.orderStatus?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <div>
                        <p className="font-bold text-stone-900">{customerName}</p>
                        <p className="text-[11px] text-stone-500">{customerPhone}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-mountain-900 block font-mono">{fmtPKR(o.total)}</span>
                        <span className="text-[10px] text-stone-400 capitalize">{o.paymentMethod}</span>
                        {o.paymentScreenshot && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded mt-0.5">
                            <span>📷</span> Proof
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <span className="text-stone-400 text-[11px]">{fmtDate(o.createdAt)}</span>
                      <button
                        onClick={() => openOrderDetails(o)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg transition"
                      >
                        Manage &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
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
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 font-medium transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 font-medium transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order Detail & Shipment Modal ────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold font-display text-mountain-900">
                    Order {selectedOrder.orderId || `#${selectedOrder._id.slice(-6).toUpperCase()}`}
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
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Subtabs: Details vs Status History vs Notifications */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modalTab === 'details'
                    ? 'bg-mountain-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Order & Shipment Control
              </button>
              <button
                type="button"
                onClick={() => setModalTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modalTab === 'history'
                    ? 'bg-mountain-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Status History ({selectedOrder.statusHistory?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('notifications')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modalTab === 'notifications'
                    ? 'bg-mountain-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Notification Log ({selectedOrder.notificationLog?.length || 0})
              </button>
            </div>

            {/* TAB 1: Order & Shipment Control */}
            {modalTab === 'details' && (
              <form onSubmit={handleSaveOrder} className="space-y-5">
                {/* Status & Payment Selection */}
                <div className="p-4 bg-cream-50/80 border border-cream-200 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-mountain-800">
                    1. Lifecycle & Payment Status
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Order Lifecycle Status (9 Stages)
                      </label>
                      <select
                        value={modalOrderStatus}
                        onChange={(e) => setModalOrderStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-apricot-500 capitalize"
                      >
                        {ORDER_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st} className="capitalize">
                            {st.replace('_', ' ')}
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
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-apricot-500 capitalize"
                      >
                        {PAYMENT_STATUS_OPTIONS.map((ps) => (
                          <option key={ps} value={ps} className="capitalize">
                            {ps}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Status Change Note (Logged into audit trail)
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Verified Easypaisa payment; transferred to packing team"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* ── Payment Proof Screenshot Review Card ── */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    selectedOrder.paymentScreenshot
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <span>📷</span> Customer Payment Proof Screenshot
                    </h3>
                    {selectedOrder.paymentScreenshot ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                        Proof Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-stone-400">
                        No Screenshot Uploaded
                      </span>
                    )}
                  </div>

                  {selectedOrder.paymentScreenshot ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Clickable Image Thumbnail */}
                        <div
                          onClick={() => setPreviewProofImage(selectedOrder.paymentScreenshot)}
                          className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-amber-300 hover:border-amber-500 shadow-xs max-w-[150px] shrink-0"
                          title="Click to view full screenshot"
                        >
                          <img
                            src={selectedOrder.paymentScreenshot}
                            alt="Customer Payment Receipt"
                            className="w-full h-24 object-cover object-top group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                            🔍 Zoom
                          </div>
                        </div>

                        <div className="flex-1 space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-stone-700">Uploaded:</span>
                            <span className="text-stone-500">
                              {selectedOrder.paymentScreenshotUploadedAt
                                ? fmtDate(selectedOrder.paymentScreenshotUploadedAt)
                                : 'Recently'}
                            </span>
                          </div>

                          {selectedOrder.transactionId && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-700">TRX ID:</span>
                              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-stone-900">
                                {selectedOrder.transactionId}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setPreviewProofImage(selectedOrder.paymentScreenshot)}
                              className="px-3 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              View Full Screenshot ↗
                            </button>

                            {modalPaymentStatus !== 'paid' && (
                              <button
                                type="button"
                                onClick={handleOneClickConfirmPayment}
                                disabled={updateOrderMutation.isPending}
                                className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <span>✅</span> Verify Payment & Confirm Order
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic">
                      The customer has not uploaded a payment screenshot yet. They can upload it via the tracking portal at <code className="bg-white px-1 py-0.5 rounded border border-stone-200 text-stone-700 font-mono text-[11px]">/track-order</code> or share via WhatsApp.
                    </p>
                  )}
                </div>

                {/* Courier Logistics Assignment */}
                <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                      <span>🚚</span> 2. Courier Assignment & Shipment Logistics
                    </h3>
                    <span className="text-[10px] text-sky-700 font-medium">Customer auto-notified when dispatched</span>
                  </div>

                  {/* Courier Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {COURIER_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleCourierSelect(p.name)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          courierName === p.name
                            ? 'bg-sky-700 text-white shadow-xs'
                            : 'bg-white border border-sky-200 text-sky-800 hover:bg-sky-100'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Courier Company Name
                      </label>
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. TCS, Leopards, Trax"
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Consignment Number (CN) / Tracking ID
                      </label>
                      <input
                        type="text"
                        value={trackingId}
                        onChange={(e) => handleTrackingIdChange(e.target.value)}
                        placeholder="e.g. 784910284"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Courier Tracking Portal URL
                      </label>
                      <input
                        type="url"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Estimated Delivery Date
                      </label>
                      <input
                        type="date"
                        value={estimatedDelivery}
                        onChange={(e) => setEstimatedDelivery(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Internal Admin Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Internal Admin Notes (Only visible to admins)
                  </label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this order, customer preferences, or packing instructions..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>

                {/* Notification Checkbox & Submit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-200">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyCustomer}
                      onChange={(e) => setNotifyCustomer(e.target.checked)}
                      className="w-4 h-4 text-apricot-500 rounded border-stone-300"
                    />
                    <span>Automatically trigger Email & WhatsApp notifications on save</span>
                  </label>

                  <button
                    type="submit"
                    disabled={updateOrderMutation.isPending}
                    className="px-6 py-2.5 bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {updateOrderMutation.isPending ? 'Saving...' : 'Save & Update Order'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Status History Audit Trail */}
            {modalTab === 'history' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Status Transition Audit Trail
                </h3>
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
                    {selectedOrder.statusHistory.map((hist, idx) => (
                      <div key={idx} className="p-3.5 text-xs flex items-start gap-3 bg-white">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-stone-900 capitalize">
                              {hist.status?.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-stone-400">{fmtDate(hist.changedAt)}</span>
                          </div>
                          {hist.note && <p className="text-stone-600 mt-1">{hist.note}</p>}
                          <span className="text-[10px] text-stone-400 mt-1 block">
                            By: {hist.changedBy || 'System'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">No status transitions recorded yet.</p>
                )}
              </div>
            )}

            {/* TAB 3: Customer Notification History Log */}
            {modalTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Dispatched Notifications History
                  </h3>
                  <div className="flex gap-2">
                    {selectedOrder.paymentStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={() =>
                          resendNotificationMutation.mutate({
                            id: selectedOrder._id,
                            event: 'payment_reminder',
                            channel: 'email',
                          })
                        }
                        disabled={resendNotificationMutation.isPending}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                        title="Send 24h Payment Reminder email"
                      >
                        🔔 Send Payment Reminder
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        resendNotificationMutation.mutate({
                          id: selectedOrder._id,
                          event: selectedOrder.orderStatus,
                          channel: 'email',
                        })
                      }
                      disabled={resendNotificationMutation.isPending}
                      className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Re-send Email
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        resendNotificationMutation.mutate({
                          id: selectedOrder._id,
                          event: selectedOrder.orderStatus,
                          channel: 'whatsapp',
                        })
                      }
                      disabled={resendNotificationMutation.isPending}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Re-send WhatsApp
                    </button>
                  </div>
                </div>

                {selectedOrder.notificationLog && selectedOrder.notificationLog.length > 0 ? (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 text-xs">
                    {selectedOrder.notificationLog.map((log, idx) => (
                      <div key={idx} className="p-3.5 flex items-start justify-between gap-3 bg-white">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                log.type === 'email' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {log.type}
                            </span>
                            <span className="font-bold text-stone-900 capitalize">
                              Event: {log.event?.replace('_', ' ')}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                log.success ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {log.success ? '✓ Delivered' : '✗ Failed'}
                            </span>
                          </div>
                          <p className="text-stone-500 text-[11px]">Recipient: {log.recipient}</p>
                          {log.error && <p className="text-rose-600 text-[11px] font-mono">{log.error}</p>}
                        </div>
                        <span className="text-[10px] text-stone-400 whitespace-nowrap">
                          {fmtDate(log.sentAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">No notifications dispatched yet.</p>
                )}
              </div>
            )}

            {/* Customer & Shipping Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                  Customer Contact
                </h4>
                <p className="font-bold text-stone-900">
                  {selectedOrder.user?.name || selectedOrder.guestName || selectedOrder.shippingAddress?.name}
                </p>
                <p className="text-stone-600">
                  {selectedOrder.user?.email || selectedOrder.guestEmail || 'No email provided'}
                </p>
                <p className="text-stone-600">
                  Phone: {selectedOrder.guestPhone || selectedOrder.shippingAddress?.phone}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-semibold">
                    {selectedOrder.user ? 'Registered User' : 'Guest Checkout'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      selectedOrder.whatsappConsent !== false
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    WhatsApp Alerts: {selectedOrder.whatsappConsent !== false ? 'Consented' : 'Declined'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                  Delivery Address
                </h4>
                <p className="text-stone-800 font-medium">{selectedOrder.shippingAddress?.street}</p>
                <p className="text-stone-600">
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.province}{' '}
                  {selectedOrder.shippingAddress?.postalCode || ''}
                </p>
                <p className="text-stone-500 pt-1">
                  Payment: <strong className="text-stone-800 capitalize">{selectedOrder.paymentMethod}</strong>
                </p>
                {selectedOrder.transactionId && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Submitted TRX ID</span>
                    <span className="font-mono font-bold text-emerald-950 text-xs">{selectedOrder.transactionId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Summary Table */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 text-xs">
              <div className="bg-stone-50 px-4 py-2 font-bold text-stone-700 text-[11px] uppercase">
                Order Items ({selectedOrder.items?.length || 0})
              </div>
              {(selectedOrder.items || []).map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-stone-900 block">{item.name}</span>
                    <span className="text-stone-500 text-[11px]">
                      {item.variantLabel} × {item.quantity}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-900">
                    {fmtPKR(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="p-4 bg-stone-50/50 flex justify-between font-bold text-sm text-mountain-900">
                <span>Total Amount:</span>
                <span className="text-apricot-600 font-display font-bold text-base">{fmtPKR(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Modal Close & Delete actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this order record? This cannot be undone.')) {
                    deleteOrderMutation.mutate(selectedOrder._id);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
              >
                Delete Order
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Payment Proof Lightbox Modal for Admin */}
      {previewProofImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
          onClick={() => setPreviewProofImage(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h4 className="font-display font-bold text-mountain-900 text-base">
                  Payment Transfer Screenshot Proof
                </h4>
                {selectedOrder && (
                  <p className="text-xs text-stone-500 font-mono">
                    Order ID: {selectedOrder.orderId || selectedOrder._id} • Customer: {selectedOrder.shippingAddress?.name || selectedOrder.guestName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofImage(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-stone-900/5 p-2 flex items-center justify-center min-h-[300px]">
              <img
                src={previewProofImage}
                alt="Payment Proof Full Resolution"
                className="max-h-[68vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <a
                href={previewProofImage}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold transition"
              >
                Open Original in New Tab ↗
              </a>

              {selectedOrder && modalPaymentStatus !== 'paid' && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProofImage(null);
                    handleOneClickConfirmPayment();
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✅</span> Verify & Confirm Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
