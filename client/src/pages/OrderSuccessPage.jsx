import { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { fmtPKR, fmtDate, getCleanWhatsAppNumber } from '../lib/utils';
import SEO from '../components/ui/SEO';
import OrderTimeline from '../components/ui/OrderTimeline';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyNumber = () => {
    navigator.clipboard?.writeText('03495144486');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleCopyId = () => {
    if (!order) return;
    navigator.clipboard?.writeText(order.orderId || order._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const estRangeStr = useMemo(() => {
    if (!order) return '';
    const createdDate = order.createdAt ? new Date(order.createdAt) : new Date(0);
    const estDateStart = new Date(createdDate.getTime() + 3 * 24 * 3600 * 1000);
    const estDateEnd = new Date(createdDate.getTime() + 5 * 24 * 3600 * 1000);
    return `${estDateStart.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })} – ${estDateEnd.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [order?.createdAt]);

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <SEO title="Order Confirmed" description="Order confirmation at Karakoram Store." />
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
          ✓
        </div>
        <h1 className="font-display font-bold text-2xl text-mountain-900 mb-2">Order Confirmed!</h1>
        <p className="text-mountain-500 text-sm mb-8">Thank you for shopping with Karakoram Store.</p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/my-orders"
            className="px-6 py-3 bg-mountain-900 hover:bg-mountain-800 text-white font-semibold rounded-xl text-sm transition"
          >
            Go to My Orders
          </Link>
          <Link
            to="/shop"
            className="px-6 py-3 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-xl text-sm transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const phoneParam = order.shippingAddress?.phone || order.guestPhone || '';
  const waNumber = getCleanWhatsAppNumber();
  const displayId = order.orderId || (order._id ? `#${order._id.slice(-8).toUpperCase()}` : '');

  const waReceiptMsg = encodeURIComponent(
    `Assalam o Alaikum! I have placed Order ${displayId} for ${fmtPKR(order.total)} on Karakoram Store.\n` +
    `Payment Method: Easypaisa to Shayan Danish (03495144486).\n` +
    (order.transactionId ? `TRX ID: ${order.transactionId}\n` : '') +
    `Please confirm receipt of my payment.`
  );
  const waReceiptUrl = `https://wa.me/${waNumber}?text=${waReceiptMsg}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title={`Order Confirmed ${displayId}`}
        description="Your Karakoram Store order has been confirmed."
      />

      <div className="max-w-5xl mx-auto space-y-6">

        {/* 1. Top Hero Confirmation Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-0 opacity-70 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-md shrink-0">
                ✓
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Order Placed & Logged
                </div>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                  Thank you for your order, {order.shippingAddress?.name || order.guestName || 'Valued Customer'}!
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  We have received your order and sent a confirmation invoice to{' '}
                  <strong className="text-slate-800">{order.guestEmail || order.user?.email || 'your email'}</strong>.
                </p>
              </div>
            </div>

            {/* Quick Order Info Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex sm:flex-col justify-between sm:justify-center items-end text-right shrink-0">
              <span className="text-xs text-slate-400 font-medium">Order Reference</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-base text-slate-900">{displayId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                  title="Copy Order ID"
                >
                  {copiedId ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">Placed on {fmtDate(order.createdAt)}</span>
            </div>
          </div>

          {/* Delivery & Tracking Highlights Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-lg">
                🚚
              </div>
              <div>
                <p className="font-bold text-slate-800">Estimated Delivery</p>
                <p className="text-slate-500">{estRangeStr} (3–5 Days)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                📬
              </div>
              <div>
                <p className="font-bold text-slate-800">Order Updates</p>
                <p className="text-slate-500">Email Confirmation Sent</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                🛡️
              </div>
              <div>
                <p className="font-bold text-slate-800">Direct from Artisans</p>
                <p className="text-slate-500">Authentic Gilgit-Baltistan</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Visual Progress Tracker (Audionic & Daraz Order Tracker Timeline) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Order Progress Timeline</h2>
              <p className="text-slate-500 text-xs mt-0.5">Track your order journey from our mountain workshops to your doorstep.</p>
            </div>
            <Link
              to={`/track-order?orderId=${encodeURIComponent(order.orderId || order._id)}&phone=${encodeURIComponent(phoneParam)}`}
              className="text-xs font-bold text-apricot-600 hover:text-apricot-700 flex items-center gap-1"
            >
              <span>Live Tracking View</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <OrderTimeline
            currentStatus={order.orderStatus || 'pending'}
            statusHistory={order.statusHistory || []}
          />
        </div>

        {/* 3. Two-Column Main Content: Details + Payment & Invoice */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Payment & Next Steps (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Easypaisa Payment Instructions Card */}
            <div className="bg-gradient-to-br from-[#0c5940] via-[#09774e] to-[#044c33] text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-4 border-b border-emerald-500/40">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <div>
                    <h2 className="font-display font-bold text-lg text-white">Easypaisa Payment Transfer</h2>
                    <p className="text-emerald-100 text-xs">Send exact amount to complete and verify your order</p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-emerald-900 shadow-sm">
                  Payable: {fmtPKR(order.total)}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5 bg-emerald-950/40 rounded-2xl p-4 border border-emerald-400/20 backdrop-blur-xs">
                <div>
                  <p className="text-emerald-200 text-[11px] font-bold uppercase tracking-wider mb-0.5">Account Title</p>
                  <p className="text-white font-bold text-base">Shayan Danish</p>
                  <span className="inline-block px-2 py-0.5 text-[10px] bg-emerald-500/30 text-emerald-100 rounded-full font-medium mt-1">Verified Merchant</span>
                </div>
                <div>
                  <p className="text-emerald-200 text-[11px] font-bold uppercase tracking-wider mb-0.5">Account Number</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono font-bold text-lg tracking-wider">03495144486</span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg transition shadow-xs"
                    >
                      {copiedNumber ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {order.transactionId && (
                <div className="mt-3.5 px-4 py-2.5 bg-white/10 rounded-xl text-xs flex items-center justify-between border border-white/10">
                  <span className="text-emerald-100">Submitted TRX ID / Sender:</span>
                  <span className="font-mono font-bold text-white">{order.transactionId}</span>
                </div>
              )}

              <div className="mt-5">
                <a
                  href={waReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-white hover:bg-emerald-50 active:scale-98 text-emerald-900 font-bold text-sm transition-all shadow-md"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#25D366]">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>Share Payment Screenshot on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Delivery & Recipient Address Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="font-display font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                <span>📍</span>
                <span>Shipping & Delivery Details</span>
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Recipient Name</span>
                  <p className="font-bold text-slate-800 text-sm">{order.shippingAddress?.name || order.guestName}</p>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mt-3 mb-1">Phone Number</span>
                  <p className="font-medium text-slate-700">{order.shippingAddress?.phone || order.guestPhone}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Delivery Address</span>
                  <p className="font-medium text-slate-700 leading-relaxed">
                    {order.shippingAddress?.street}
                    <br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.province}
                    {order.shippingAddress?.postalCode ? ` - ${order.shippingAddress.postalCode}` : ''}
                    <br />
                    Pakistan
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps Guidance */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6">
              <h3 className="font-display font-bold text-amber-950 text-sm mb-3 flex items-center gap-2">
                <span>📋</span> What Happens Next?
              </h3>
              <ol className="space-y-2.5 text-xs text-amber-900">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span><strong>Payment Verification:</strong> Transfer {fmtPKR(order.total)} to Easypaisa (03495144486) or wait for our team to contact you on your number.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span><strong>Packing & QC:</strong> Our quality inspection team packs your mountain items with seal-proof protective packaging.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span><strong>Dispatched with Courier Tracking:</strong> You will receive Email & tracking notifications with your Courier Consignment # (CN).</span>
                </li>
              </ol>
            </div>

          </div>

          {/* Right Column: Order Invoice & Quick Actions (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Order Receipt / Summary Card */}
            <div id="printable-order-receipt" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">Order Summary</h3>
                  <p className="text-slate-500 text-xs mt-0.5">{order.items?.length || 0} item(s) in this purchase</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Print official receipt"
                >
                  <span>🖨️</span>
                  <span>Print Receipt</span>
                </button>
              </div>

              {/* Items List */}
              <div className="p-6 divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                        📦
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {item.variantLabel ? `Variant: ${item.variantLabel} • ` : ''}Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
                      {fmtPKR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Breakdown */}
              <div className="p-6 bg-slate-50/70 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{fmtPKR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping Fee (Nationwide)</span>
                  <span className="font-semibold text-slate-900">{fmtPKR(order.shippingCost)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Applied</span>
                    <span>−{fmtPKR(order.discount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-base">
                  <span className="font-bold text-slate-900">Total Amount</span>
                  <span className="font-display font-extrabold text-apricot-600 text-xl">
                    {fmtPKR(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <Link
                to={`/track-order?orderId=${encodeURIComponent(order.orderId || order._id)}&phone=${encodeURIComponent(phoneParam)}`}
                className="w-full py-3.5 px-6 bg-apricot-500 hover:bg-apricot-600 active:scale-98 text-white font-bold rounded-2xl text-center text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>🔍</span>
                <span>Track Order Status</span>
              </Link>

              <Link
                to="/my-orders"
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold rounded-2xl text-center text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>📦</span>
                <span>View in My Orders</span>
              </Link>

              <Link
                to="/shop"
                className="w-full py-3 px-6 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-2xl text-center text-sm transition flex items-center justify-center gap-1.5"
              >
                <span>🛍️ Continue Shopping</span>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
