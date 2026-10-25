import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { fmtPKR, fmtDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteModalCoupon, setDeleteModalCoupon] = useState(null);
  const [currentTime] = useState(() => Date.now());

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [expiry, setExpiry] = useState('');
  const [usageLimit, setUsageLimit] = useState('100');
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  // Format ISO string to datetime-local input string YYYY-MM-DDTHH:MM
  const formatForInput = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openAddModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('percentage');
    setValue('');
    setMinOrderAmount('0');
    // Default 30 days ahead
    const future = new Date();
    future.setDate(future.getDate() + 30);
    setExpiry(formatForInput(future.toISOString()));
    setUsageLimit('100');
    setIsActive(true);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCoupon(c);
    setCode(c.code || '');
    setDiscountType(c.discountType || 'percentage');
    setValue(String(c.value || ''));
    setMinOrderAmount(String(c.minOrderAmount || '0'));
    setExpiry(formatForInput(c.expiry));
    setUsageLimit(String(c.usageLimit || '1'));
    setIsActive(c.isActive !== undefined ? c.isActive : true);
    setFormErrors({});
    setModalOpen(true);
  };

  // ── Queries & Mutations ───────────────────────────────────────
  const {
    data: coupons = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await api.get('/admin/coupons');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCoupon) {
        const res = await api.put(`/admin/coupons/${editingCoupon._id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/admin/coupons', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save coupon');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/coupons/${id}`);
    },
    onSuccess: () => {
      toast.success('Coupon deleted');
      setDeleteModalCoupon(null);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete coupon');
    },
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode || trimmedCode.length < 3 || trimmedCode.length > 20) {
      errs.code = 'Coupon code must be 3 to 20 characters';
    }
    if (!value || isNaN(Number(value)) || Number(value) <= 0) {
      errs.value = 'Discount value must be greater than 0';
    }
    if (discountType === 'percentage' && Number(value) > 100) {
      errs.value = 'Percentage discount cannot exceed 100%';
    }
    if (!expiry) {
      errs.expiry = 'Expiry date and time are required';
    }
    if (!usageLimit || isNaN(Number(usageLimit)) || Number(usageLimit) < 1) {
      errs.usageLimit = 'Usage limit must be at least 1';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      code: trimmedCode,
      discountType,
      value: Number(value),
      minOrderAmount: Number(minOrderAmount) || 0,
      expiry: new Date(expiry).toISOString(),
      usageLimit: parseInt(usageLimit, 10),
      isActive,
    };

    saveMutation.mutate(payload);
  };

  const filteredCoupons = coupons.filter((c) => {
    if (!search.trim()) return true;
    return c.code?.toLowerCase().includes(search.toLowerCase().trim());
  });

  return (
    <div className="space-y-6">
      <SEO title="Coupons - Admin Panel" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Discount Coupons
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Create promotional codes, seasonal discounts, and customer savings incentives.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-apricot-500 hover:bg-apricot-600 text-white rounded-xl text-sm font-semibold shadow-xs transition active:scale-95 focus:ring-2 focus:ring-apricot-400 focus:outline-hidden self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupons by promo code..."
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
      </div>

      {/* Coupons Table / Cards */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-700">
            <p className="text-sm">Failed to load coupons: {error?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-100 rounded-lg hover:bg-rose-200"
            >
              Retry
            </button>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <p className="text-base font-semibold text-stone-700 font-display">No coupons found</p>
            <p className="text-xs text-stone-500 mt-1">
              {search ? 'Try clearing your search query.' : 'Click "Create Coupon" to issue a discount code.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ─────────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
                  <tr>
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Min. Spend</th>
                    <th className="py-3 px-4">Usage</th>
                    <th className="py-3 px-4">Expiry</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCoupons.map((c) => {
                    const isExpired = new Date(c.expiry).getTime() < currentTime;
                    const isExhausted = c.usedCount >= c.usageLimit;

                    return (
                      <tr key={c._id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 px-5 font-mono text-sm font-bold text-apricot-600">
                          {c.code}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-stone-900 text-xs">
                          {c.discountType === 'percentage'
                            ? `${c.value}% Off`
                            : `${fmtPKR(c.value)} Off`}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-stone-600">
                          {c.minOrderAmount ? fmtPKR(c.minOrderAmount) : 'None'}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-stone-600">
                          <span className="font-semibold text-stone-900">{c.usedCount || 0}</span> / {c.usageLimit}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-stone-600">
                          <span className={isExpired ? 'text-rose-600 font-semibold' : ''}>
                            {fmtDate(c.expiry)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isExpired || !c.isActive || isExhausted
                                ? 'bg-stone-100 text-stone-600 border border-stone-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isExpired
                              ? 'Expired'
                              : isExhausted
                              ? 'Exhausted'
                              : c.isActive
                              ? 'Active'
                              : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteModalCoupon(c)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Stacked Cards ─────────────────────────── */}
            <div className="md:hidden divide-y divide-stone-100">
              {filteredCoupons.map((c) => {
                const isExpired = new Date(c.expiry).getTime() < currentTime;
                const isExhausted = c.usedCount >= c.usageLimit;

                return (
                  <div key={c._id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-apricot-600">
                        {c.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isExpired || !c.isActive || isExhausted
                            ? 'bg-stone-100 text-stone-600'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isExpired
                          ? 'Expired'
                          : isExhausted
                          ? 'Exhausted'
                          : c.isActive
                          ? 'Active'
                          : 'Disabled'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-500 block text-[11px]">Benefit:</span>
                        <span className="font-semibold text-stone-900">
                          {c.discountType === 'percentage'
                            ? `${c.value}% Off`
                            : `${fmtPKR(c.value)} Off`}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">Redemptions:</span>
                        <span className="font-semibold text-stone-900">
                          {c.usedCount || 0} / {c.usageLimit}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-stone-500 pt-2 border-t border-stone-100">
                      <span>Expires: {fmtDate(c.expiry)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 bg-stone-100 text-stone-700 font-semibold rounded-md"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteModalCoupon(c)}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Coupon Modal ──────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-lg font-bold font-display text-mountain-900">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="e.g. HUNZA10"
                  className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
                {formErrors.code && (
                  <p className="text-rose-600 text-xs mt-1">{formErrors.code}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed PKR (Rs.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Value <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? '10' : '500'}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                  {formErrors.value && (
                    <p className="text-rose-600 text-[11px] mt-1">{formErrors.value}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Min. Order (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Usage Limit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                  {formErrors.usageLimit && (
                    <p className="text-rose-600 text-[11px] mt-1">{formErrors.usageLimit}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Expiry Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
                {formErrors.expiry && (
                  <p className="text-rose-600 text-xs mt-1">{formErrors.expiry}</p>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-apricot-600 rounded-sm border-stone-300 focus:ring-apricot-500"
                />
                <span className="text-xs font-medium text-stone-800">Coupon is active and redeemable</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {saveMutation.isPending ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Coupon Modal ──────────────────────────── */}
      {deleteModalCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold font-display text-mountain-900">
                Delete Coupon
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Are you sure you want to delete promo code{' '}
                <strong className="text-stone-900 font-mono">"{deleteModalCoupon.code}"</strong>?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalCoupon(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-3 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModalCoupon._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
