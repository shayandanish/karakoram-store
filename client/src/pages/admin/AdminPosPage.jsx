import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../lib/axios';
import { fmtPKR } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import OrderInvoiceModal from '../../components/admin/OrderInvoiceModal';

export default function AdminPosPage() {
  const toast = useToast();

  // Catalog state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart state: array of { product, variant, quantity, customPrice }
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Post-sale receipt modal
  const [receiptOrder, setReceiptOrder] = useState(null);

  const searchInputRef = useRef(null);

  // Fetch products & categories
  const fetchCatalog = async () => {
    try {
      setLoadingProducts(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/admin/products', {
          params: { limit: 100, active: 'true' },
        }),
        api.get('/categories'),
      ]);
      setProducts(prodRes.data?.products || []);
      setCategories(catRes.data || []);
    } catch (err) {
      toast.error('Failed to load store catalog for POS');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (selectedCategory !== 'all') {
        const catId = typeof prod.category === 'object' ? prod.category?._id : prod.category;
        if (catId !== selectedCategory) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesSku = prod.variants?.some((v) => v.label.toLowerCase().includes(q));
        if (!matchesName && !matchesSku) return false;
      }
      return true;
    });
  }, [products, selectedCategory, search]);

  // Add variant to cart
  const addToCart = (product, variant) => {
    if (variant.stock <= 0) {
      toast.error(`"${variant.label}" is currently out of stock`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product._id === product._id && item.variant.label === variant.label
      );

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.quantity >= variant.stock) {
          toast.error(`Cannot add more. Available stock is ${variant.stock}`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
        return updated;
      }

      // Calculate effective price taking discount into account
      let effectivePrice = variant.price;
      if (variant.discountPercent && variant.discountPercent > 0) {
        effectivePrice = Math.max(1, Math.round(variant.price * (1 - variant.discountPercent / 100)));
      }

      return [
        ...prev,
        {
          product,
          variant,
          price: effectivePrice,
          quantity: 1,
        },
      ];
    });
  };

  // Adjust quantity in cart
  const updateQuantity = (index, delta) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      if (newQty > item.variant.stock) {
        toast.error(`Max available stock for this variant is ${item.variant.stock}`);
        return prev;
      }

      const updated = [...prev];
      updated[index] = { ...item, quantity: newQty };
      return updated;
    });
  };

  // Remove from cart
  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the active register cart?')) {
      setCart([]);
      setTenderedAmount('');
      setDiscountAmount('');
      setOrderNotes('');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discount = Math.max(0, Number(discountAmount) || 0);
  const total = Math.max(0, subtotal - discount);
  const tendered = Number(tenderedAmount) || 0;
  const changeDue = paymentMethod === 'cash' && tendered > total ? tendered - total : 0;

  // Process checkout
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Register cart is empty. Add items before checking out.');
      return;
    }

    if (paymentMethod === 'cash' && tendered > 0 && tendered < total) {
      toast.error(`Cash tendered (Rs. ${tendered}) is less than total bill (Rs. ${total})`);
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product._id,
          variantLabel: item.variant.label,
          quantity: item.quantity,
          price: item.price,
        })),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '',
        paymentMethod,
        discount,
        notes: orderNotes.trim() || 'In-store POS counter sale',
      };

      const res = await api.post('/admin/pos/checkout', payload);
      const createdOrder = res.data;

      toast.success(`Sale completed! Receipt #${createdOrder.orderId || createdOrder._id}`);

      // Open print invoice / receipt modal
      setReceiptOrder(createdOrder);

      // Reset cart
      setCart([]);
      setDiscountAmount('');
      setTenderedAmount('');
      setOrderNotes('');

      // Refresh stock in catalog
      fetchCatalog();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'POS checkout failed. Check stock availability.';
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-mountain-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⚡
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-mountain-900 tracking-tight">
              POS Counter Register
            </h1>
          </div>
          <p className="text-xs text-mountain-500 mt-1">
            Fast walk-in retail billing. Sales automatically deduct inventory stock and update accounting reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCatalog}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-mountain-700 hover:bg-stone-50 transition shadow-2xs"
            title="Refresh product stock from server"
          >
            <span>🔄</span> Refresh Stock
          </button>
        </div>
      </div>

      {/* ── Main Two-Column POS Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Product Selection Grid (7 cols) ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products or variant label by name..."
                className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-mountain-800 focus:bg-white text-mountain-900 placeholder-stone-400 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${
                  selectedCategory === 'all'
                    ? 'bg-mountain-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${
                    selectedCategory === cat._id
                      ? 'bg-mountain-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="bg-stone-50/60 p-3 rounded-2xl border border-stone-200 min-h-[460px] max-h-[720px] overflow-y-auto">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-2">
                <div className="w-8 h-8 border-2 border-stone-300 border-t-mountain-800 rounded-full animate-spin" />
                <span className="text-xs font-medium">Loading store products…</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                <span className="text-3xl mb-2">📦</span>
                <p className="text-xs font-bold text-mountain-800">No matching items found</p>
                <p className="text-[11px] text-stone-400">Try adjusting your search query or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((prod) => {
                  const primaryImg = prod.images?.find((i) => i.isPrimary)?.url || prod.images?.[0]?.url || '';
                  const totalStock = prod.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;

                  return (
                    <div
                      key={prod._id}
                      className="bg-white rounded-xl border border-stone-200 p-2.5 shadow-2xs hover:border-mountain-400 transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="w-full h-24 bg-stone-100 rounded-lg overflow-hidden mb-2 relative">
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl font-bold">
                              🛍️
                            </div>
                          )}
                          <span
                            className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              totalStock > 5
                                ? 'bg-emerald-600 text-white'
                                : totalStock > 0
                                ? 'bg-amber-500 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}
                          </span>
                        </div>

                        {/* Product Title */}
                        <h4 className="text-xs font-bold text-mountain-900 line-clamp-2 leading-tight mb-1">
                          {prod.name}
                        </h4>
                      </div>

                      {/* Variants buttons */}
                      <div className="mt-2 space-y-1">
                        {prod.variants?.map((v) => {
                          const isOOS = v.stock <= 0;
                          let effPrice = v.price;
                          if (v.discountPercent && v.discountPercent > 0) {
                            effPrice = Math.max(1, Math.round(v.price * (1 - v.discountPercent / 100)));
                          }

                          return (
                            <button
                              key={v.label}
                              type="button"
                              disabled={isOOS}
                              onClick={() => addToCart(prod, v)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                                isOOS
                                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-60'
                                  : 'bg-stone-50 hover:bg-mountain-900 hover:text-white text-mountain-800 border border-stone-200'
                              }`}
                            >
                              <span className="truncate max-w-[90px]">{v.label}</span>
                              <span className="font-bold font-mono shrink-0">
                                {fmtPKR(effPrice)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Active Cart & Checkout (5 cols) ── */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          {/* Cart Header */}
          <div className="bg-stone-50 px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🛒</span>
              <h3 className="text-sm font-bold text-mountain-900 font-display">
                Current Sale Cart
              </h3>
              <span className="bg-mountain-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 transition"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[300px] divide-y divide-stone-100 min-h-[140px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                <span className="text-3xl mb-2">🧾</span>
                <p className="text-xs font-bold text-mountain-800">No items in register cart</p>
                <p className="text-[11px] text-stone-400 text-center max-w-[200px]">
                  Click products on the left catalog grid to add them to this sale
                </p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.product._id}-${item.variant.label}`} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-mountain-900 truncate">{item.product.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                      <span className="bg-stone-100 px-1.5 py-0.2 rounded font-medium text-stone-700">
                        {item.variant.label}
                      </span>
                      <span>× {fmtPKR(item.price)}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-white text-stone-700 hover:bg-stone-200 font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-bold font-mono text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-white text-stone-700 hover:bg-stone-200 font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="text-right shrink-0 min-w-[70px]">
                    <p className="font-bold font-mono text-mountain-900">
                      {fmtPKR(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(idx)}
                      className="text-[10px] text-red-500 hover:text-red-700 mt-0.5 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Customer & Payment Inputs ── */}
          <form onSubmit={handleCheckout} className="border-t border-stone-200 bg-stone-50/50 p-4 space-y-3">
            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-mountain-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0300..."
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-mountain-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'cash', label: '💵 Cash' },
                  { id: 'card', label: '💳 Card' },
                  { id: 'easypaisa', label: '📱 Easypaisa' },
                  { id: 'jazzcash', label: '📱 JazzCash' },
                  { id: 'bank_transfer', label: '🏦 Bank' },
                  { id: 'other', label: '🔖 Other' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition ${
                      paymentMethod === pm.id
                        ? 'bg-mountain-900 text-white border-mountain-900 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tendered & Discount Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {paymentMethod === 'cash' ? (
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Cash Tendered (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    placeholder={String(total)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-mountain-800 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Sale Reference / Note
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="TRX # or remark"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-mountain-800 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Discount (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-mountain-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Change Due Highlight (Cash only) */}
            {paymentMethod === 'cash' && changeDue > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800">Change Due to Customer:</span>
                <span className="font-mono font-bold text-emerald-900 text-sm">
                  {fmtPKR(changeDue)}
                </span>
              </div>
            )}

            {/* Financial Summary */}
            <div className="pt-2 border-t border-stone-200 space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">{fmtPKR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono font-semibold">− {fmtPKR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-stone-200 text-mountain-900">
                <span className="font-bold text-sm">Grand Total:</span>
                <span className="font-display font-bold text-xl text-apricot-600">
                  {fmtPKR(total)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="submit"
              disabled={processing || cart.length === 0}
              className="w-full py-3 bg-mountain-900 hover:bg-mountain-950 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Sale…</span>
                </>
              ) : (
                <>
                  <span>🖨️</span>
                  <span>Complete Sale & Print Receipt ({fmtPKR(total)})</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Printable Thermal / A4 Receipt Modal ── */}
      {receiptOrder && (
        <OrderInvoiceModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

