// ── Track Order Page ──────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/axios';
import { fmtPKR, fmtDate, getCleanWhatsAppNumber } from '../lib/utils';
import SEO from '../components/ui/SEO';
import OrderTimeline, { STATUS_MAP } from '../components/ui/OrderTimeline';
import CourierInfoBlock from '../components/ui/CourierInfoBlock';

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [phoneOrEmail, setPhoneOrEmail] = useState(searchParams.get('phone') || searchParams.get('email') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Payment proof upload states
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [trxInput, setTrxInput] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadProofError, setUploadProofError] = useState('');
  const [uploadProofSuccess, setUploadProofSuccess] = useState('');
  const [isReplacingProof, setIsReplacingProof] = useState(false);
  const [fullImageModal, setFullImageModal] = useState(false);
  const fileInputRef = useRef(null);

  const wa = getCleanWhatsAppNumber();

  const handleCopyId = () => {
    if (!order) return;
    navigator.clipboard?.writeText(order.orderId || order._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadProofError('Please choose a valid image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadProofError('Image file size must be less than 5MB');
      return;
    }

    setUploadProofError('');
    setScreenshotFile(file);
    const url = URL.createObjectURL(file);
    setScreenshotPreview(url);
  };

  const handleUploadPaymentProof = async (e) => {
    e.preventDefault();
    if (!screenshotFile) {
      setUploadProofError('Please choose an image of your payment receipt');
      return;
    }
    if (!order) return;

    setUploadingProof(true);
    setUploadProofError('');
    setUploadProofSuccess('');

    try {
      const formData = new FormData();
      formData.append('screenshot', screenshotFile);
      if (trxInput.trim()) {
        formData.append('transactionId', trxInput.trim());
      }

      const contact = phoneOrEmail.trim() || order.shippingAddress?.phone || order.guestPhone || order.guestEmail || '';
      if (contact.includes('@')) {
        formData.append('email', contact);
      } else {
        formData.append('phone', contact);
      }

      const targetId = order.orderId || order._id;
      const res = await api.post(`/orders/${encodeURIComponent(targetId)}/payment-screenshot`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadProofSuccess('Payment screenshot submitted successfully! Our team will verify and confirm your order shortly.');
      setOrder((prev) => ({
        ...prev,
        paymentScreenshot: res.data.paymentScreenshot,
        paymentScreenshotUploadedAt: res.data.paymentScreenshotUploadedAt,
        transactionId: res.data.transactionId || prev.transactionId,
        statusHistory: [
          ...(prev.statusHistory || []),
          {
            status: prev.orderStatus,
            changedAt: new Date(),
            note: 'Customer uploaded payment proof screenshot. Awaiting admin verification.',
            changedBy: 'Customer',
          },
        ],
      }));

      setScreenshotFile(null);
      setScreenshotPreview('');
      setIsReplacingProof(false);
    } catch (err) {
      setUploadProofError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to upload screenshot. Please try again or share it via WhatsApp.'
      );
    } finally {
      setUploadingProof(false);
    }
  };

  // Auto-submit if URL contains orderId & contact query params
  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    const urlPhone = searchParams.get('phone');
    const urlEmail = searchParams.get('email');
    const contact = urlPhone || urlEmail;

    if (urlOrderId && contact && !order && !loading) {
      setOrderId(urlOrderId);
      setPhoneOrEmail(contact);

      (async () => {
        setLoading(true);
        setError('');
        try {
          const params = { orderId: urlOrderId.trim() };
          if (contact.includes('@')) {
            params.email = contact.trim();
          } else {
            params.phone = contact.trim();
          }
          const res = await api.get('/orders/track', { params });
          setOrder(res.data);
        } catch (err) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              'Order not found. Please verify your Order ID and phone/email.'
          );
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim() || !phoneOrEmail.trim()) {
      setError('Please enter both your Order ID and Phone Number / Email.');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const contact = phoneOrEmail.trim();
      const params = { orderId: orderId.trim() };
      if (contact.includes('@')) {
        params.email = contact;
      } else {
        params.phone = contact;
      }

      const res = await api.get('/orders/track', { params });
      setOrder(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Order not found. Please verify your Order ID and contact details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusConfig = STATUS_MAP[order?.orderStatus?.toLowerCase()] || STATUS_MAP.pending;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO
        title="Track Your Order - Live Delivery Progress"
        description="Track the status of your Karakoram Store order in real-time. View courier details, CN tracking, and delivery timelines."
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
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-apricot-100 text-apricot-700 text-xs font-bold mb-3 shadow-2xs">
          <span>📦</span> Live Order & Courier Tracking
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-mountain-900 mb-2">
          Track Your Delivery
        </h1>
        <p className="text-mountain-600 text-sm max-w-md mx-auto">
          Enter your Order ID (e.g. KS-2026-001001) and the phone or email used during checkout to view real-time status.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 mb-8 border border-cream-200">
        <form onSubmit={handleTrack} noValidate className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="track-order-id" className="block text-xs font-bold text-mountain-800 uppercase tracking-wider mb-1.5">
                Order ID <span className="text-apricot-500">*</span>
              </label>
              <input
                id="track-order-id"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. KS-2026-001001"
                required
                className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300 font-mono"
              />
            </div>

            <div>
              <label htmlFor="track-contact" className="block text-xs font-bold text-mountain-800 uppercase tracking-wider mb-1.5">
                Phone Number or Email <span className="text-apricot-500">*</span>
              </label>
              <input
                id="track-contact"
                type="text"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="0349... or you@example.com"
                required
                className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2"
            >
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            id="track-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl text-sm transition shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Checking Order Records…
              </>
            ) : (
              'Track Package Live'
            )}
          </button>
        </form>
      </div>

      {/* Tracking Result */}
      {order && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-cream-200 space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-mountain-900 via-mountain-800 to-mountain-900 px-6 sm:px-8 py-5 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-mountain-300 uppercase tracking-wider mb-0.5">Order ID</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-white tracking-wide">
                  {order.orderId || `#${order._id.slice(-8).toUpperCase()}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white rounded transition cursor-pointer"
                >
                  {copiedId ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatusConfig.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusConfig.dot}`} />
                {currentStatusConfig.label}
              </span>
              <div className="text-right hidden sm:block">
                <p className="text-[11px] text-mountain-300">Order Placed</p>
                <p className="text-xs font-medium text-white">{fmtDate(order.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Visual Timeline Stepper */}
            <div>
              <h2 className="font-display font-bold text-mountain-900 text-base mb-4 flex items-center gap-2">
                <span>📍</span> Order Journey Timeline
              </h2>
              <div className="p-5 sm:p-6 bg-cream-50/70 border border-cream-200 rounded-2xl">
                <OrderTimeline currentStatus={order.orderStatus} statusHistory={order.statusHistory} />
              </div>
            </div>

            {/* ── Easypaisa Payment Verification & Screenshot Upload Section ── */}
            <div className="bg-white rounded-3xl border-2 border-apricot-200/90 p-5 sm:p-7 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cream-200">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-apricot-100 flex items-center justify-center text-xl shrink-0">
                    📱
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-mountain-900 text-sm sm:text-base">
                      Easypaisa Payment Proof & Screenshot
                    </h3>
                    <p className="text-mountain-500 text-xs">
                      Verify your transfer by uploading your transaction screenshot for quick admin confirmation.
                    </p>
                  </div>
                </div>

                <div>
                  {order.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Payment Verified ✓
                    </span>
                  ) : order.paymentScreenshot ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      Proof Under Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Screenshot Required
                    </span>
                  )}
                </div>
              </div>

              {/* Success / Error Messages */}
              {uploadProofSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <span>{uploadProofSuccess}</span>
                </div>
              )}

              {uploadProofError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>{uploadProofError}</span>
                </div>
              )}

              {/* Case 1: Payment Already Marked Paid */}
              {order.paymentStatus === 'paid' ? (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                      <span>🎉</span> Payment Verified & Confirmed
                    </p>
                    <p className="text-emerald-700">
                      Your payment of <strong className="text-emerald-950 font-mono font-bold">{fmtPKR(order.total)}</strong> has been verified by our team. Your order is confirmed and moving into production and packaging.
                    </p>
                  </div>
                  {order.paymentScreenshot && (
                    <button
                      type="button"
                      onClick={() => setFullImageModal(true)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-100 transition shrink-0 cursor-pointer"
                    >
                      View Verified Receipt
                    </button>
                  )}
                </div>
              ) : order.paymentScreenshot && !isReplacingProof ? (
                /* Case 2: Screenshot Already Uploaded, Awaiting Admin Verification */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                        <span>⏳</span> Proof Uploaded & Awaiting Admin Verification
                      </span>
                      {order.paymentScreenshotUploadedAt && (
                        <span className="text-[11px] text-sky-700">
                          Uploaded on {fmtDate(order.paymentScreenshotUploadedAt)}
                        </span>
                      )}
                    </div>

                    <p className="text-sky-800 text-xs">
                      Thank you! We have received your payment screenshot. Our finance team checks incoming transfers against bank logs. Once approved, your order status will automatically turn to <strong>Confirmed</strong> and dispatch will begin.
                    </p>

                    {order.transactionId && (
                      <p className="text-xs text-sky-900">
                        Submitted TRX ID: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-sky-200">{order.transactionId}</strong>
                      </p>
                    )}

                    {/* Screenshot Preview Thumbnail */}
                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div
                        onClick={() => setFullImageModal(true)}
                        className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-sky-300 hover:border-sky-500 shadow-sm transition max-w-[200px]"
                        title="Click to view full screenshot"
                      >
                        <img
                          src={order.paymentScreenshot}
                          alt="Payment Proof"
                          className="w-full h-32 object-cover object-top group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                          <span>🔍</span> Click to Enlarge
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setFullImageModal(true)}
                          className="px-4 py-2 bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🖼️</span> View Full Size Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplacingProof(true);
                            setUploadProofSuccess('');
                            setUploadProofError('');
                          }}
                          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🔄</span> Re-upload / Change Screenshot
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Case 3: Need to Upload Screenshot (or replacing) */
                <form onSubmit={handleUploadPaymentProof} className="space-y-4">
                  {/* Easypaisa Transfer Details Box */}
                  <div className="p-4 rounded-2xl bg-cream-50/90 border border-cream-200 grid sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-mountain-400 font-bold uppercase tracking-wider block text-[10px]">
                        Account Title
                      </span>
                      <strong className="text-mountain-900 text-sm">Shayan Danish</strong>
                    </div>

                    <div>
                      <span className="text-mountain-400 font-bold uppercase tracking-wider block text-[10px]">
                        Easypaisa Account Number
                      </span>
                      <strong className="text-mountain-900 text-sm font-mono">03495144486</strong>
                    </div>

                    <div>
                      <span className="text-mountain-400 font-bold uppercase tracking-wider block text-[10px]">
                        Exact Amount to Transfer
                      </span>
                      <strong className="text-apricot-600 text-base font-bold font-display">{fmtPKR(order.total)}</strong>
                    </div>
                  </div>

                  {/* Upload Drop Zone & Controls */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-mountain-800 uppercase tracking-wider">
                      Select Payment Screenshot (JPG, PNG, WebP) <span className="text-apricot-500">*</span>
                    </label>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                        screenshotPreview
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-cream-300 hover:border-apricot-400 bg-cream-50/40 hover:bg-white'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {screenshotPreview ? (
                        <div className="flex flex-col items-center gap-2">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot preview"
                            className="max-h-44 rounded-xl border border-cream-300 shadow-xs object-contain"
                          />
                          <p className="text-xs font-bold text-emerald-800">
                            ✓ {screenshotFile?.name} ({(screenshotFile?.size / 1024).toFixed(1)} KB)
                          </p>
                          <p className="text-[11px] text-mountain-500">
                            Click here to choose a different image
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-3xl block mb-1">📸</span>
                          <p className="text-xs font-bold text-mountain-900">
                            Click to select payment screenshot
                          </p>
                          <p className="text-[11px] text-mountain-500">
                            Take a screenshot of your successful Easypaisa transfer screen and attach it here (max 5MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional TRX ID Input */}
                  <div>
                    <label htmlFor="track-trx-id" className="block text-xs font-bold text-mountain-800 uppercase tracking-wider mb-1">
                      Transaction ID / TRX Number (Optional)
                    </label>
                    <input
                      id="track-trx-id"
                      type="text"
                      value={trxInput}
                      onChange={(e) => setTrxInput(e.target.value)}
                      placeholder="e.g. 29384019284"
                      className="w-full border border-cream-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300 font-mono"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={uploadingProof || !screenshotFile}
                      className="px-6 py-3 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {uploadingProof ? (
                        <>
                          <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Uploading Payment Proof…
                        </>
                      ) : (
                        '📤 Submit Payment Proof'
                      )}
                    </button>

                    {isReplacingProof && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplacingProof(false);
                          setScreenshotFile(null);
                          setScreenshotPreview('');
                        }}
                        className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Courier Shipment Details Block (if assigned) */}
            {order.shipment && (order.shipment.courierName || order.shipment.trackingId) && (
              <div>
                <h3 className="font-display font-bold text-mountain-900 text-sm mb-2.5">
                  Courier Dispatch & Logistics
                </h3>
                <CourierInfoBlock shipment={order.shipment} />
              </div>
            )}

            {/* Status History Audit Trail */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-cream-200 p-5">
                <h3 className="font-display font-bold text-mountain-900 text-sm mb-3 flex items-center gap-2">
                  <span>⏱️</span> Tracking Activity Log
                </h3>
                <div className="space-y-3">
                  {order.statusHistory.map((hist, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs border-b border-cream-100 last:border-none pb-2.5 last:pb-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-mountain-900 capitalize">
                            {hist.status?.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-mountain-400">{fmtDate(hist.changedAt)}</span>
                        </div>
                        {hist.note && <p className="text-mountain-600 mt-0.5">{hist.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Summary & Delivery Destination */}
            <div className="grid md:grid-cols-2 gap-6 pt-2">
              {/* Delivery destination */}
              <div className="bg-cream-50/60 rounded-2xl p-5 border border-cream-200 text-xs space-y-1.5">
                <span className="text-mountain-400 font-bold uppercase tracking-wider block mb-1">
                  📦 Delivering To
                </span>
                <p className="font-bold text-mountain-900 text-sm">{order.shippingAddress?.name}</p>
                <p className="text-mountain-600">{order.shippingAddress?.street}</p>
                <p className="text-mountain-600">
                  {order.shippingAddress?.city}, {order.shippingAddress?.province}{' '}
                  {order.shippingAddress?.postalCode || ''}
                </p>
                <p className="text-mountain-700 font-medium pt-1">
                  📞 Phone: {order.shippingAddress?.phone}
                </p>
              </div>

              {/* Order total & payment */}
              <div className="bg-cream-50/60 rounded-2xl p-5 border border-cream-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="text-mountain-400 font-bold uppercase tracking-wider block mb-1">
                    💳 Payment Overview
                  </span>
                  <p className="font-bold text-mountain-900 capitalize">
                    {order.paymentMethod === 'easypaisa' ? 'Easypaisa Mobile Transfer' : order.paymentMethod}
                  </p>
                  <p className="text-mountain-600 mt-1">
                    Status:{' '}
                    <span className={`font-bold capitalize ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {order.paymentStatus || 'Pending'}
                    </span>
                  </p>
                </div>
                <div className="pt-3 border-t border-cream-200 flex items-center justify-between mt-3">
                  <span className="font-bold text-mountain-900 text-sm">Total Amount:</span>
                  <span className="font-display font-bold text-xl text-apricot-600">{fmtPKR(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Items Ordered List */}
            <div className="border-t border-cream-200 pt-5">
              <h3 className="font-display font-bold text-mountain-900 text-sm mb-3">
                Items in this Consignment ({order.items?.length || 0})
              </h3>
              <div className="divide-y divide-cream-100">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-mountain-900">{item.name}</span>
                      <span className="text-mountain-500 block text-[11px]">
                        {item.variantLabel} × {item.quantity}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-mountain-900">
                      {fmtPKR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp Assistance Button */}
            {wa && (
              <div className="pt-3 flex justify-end">
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(
                    `Assalam o Alaikum! Tracking update inquiry for Order ${order.orderId || order._id}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  <span>💬</span>
                  <span>Ask Support on WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper Footer */}
      <div className="mt-8 text-center text-xs text-mountain-500">
        Need help locating your order?{' '}
        <Link to="/contact" className="text-apricot-600 hover:text-apricot-700 underline font-medium">
          Contact our support team
        </Link>{' '}
        or check your customer dashboard under{' '}
        <Link to="/my-orders" className="text-apricot-600 hover:text-apricot-700 underline font-medium">
          My Orders
        </Link>.
      </div>

      {/* Full-Screen Payment Proof Lightbox Modal */}
      {fullImageModal && order?.paymentScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setFullImageModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
              <div>
                <h4 className="font-display font-bold text-mountain-900 text-sm">
                  Payment Transfer Screenshot Proof
                </h4>
                <p className="text-[11px] text-mountain-500 font-mono">
                  Order ID: {order.orderId || order._id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFullImageModal(false)}
                className="w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 text-mountain-700 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-cream-50 p-2 flex items-center justify-center">
              <img
                src={order.paymentScreenshot}
                alt="Payment Proof Full"
                className="max-h-[70vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-mountain-500">
                {order.paymentScreenshotUploadedAt && `Uploaded: ${fmtDate(order.paymentScreenshotUploadedAt)}`}
              </span>
              <a
                href={order.paymentScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-apricot-500 hover:bg-apricot-600 text-white rounded-xl font-bold transition"
              >
                Open Original in New Tab ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
