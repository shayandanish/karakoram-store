import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fmtPKR, normalizePkPhone, formatPhoneDisplay } from '../lib/utils';
import api from '../lib/axios';
import SEO from '../components/ui/SEO';

const SHIPPING = 200;

const PROVINCES = [
  'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan',
  'Gilgit-Baltistan', 'Azad Jammu & Kashmir', 'Islamabad Capital Territory',
];

function Field({ id, label, required, children, error, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-mountain-700 mb-1">
        {label} {required && <span className="text-apricot-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-mountain-400 mt-0.5">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white placeholder-mountain-300 text-mountain-800';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const total = subtotal + SHIPPING;

  const [form, setForm] = useState({
    guestName: user?.name || '',
    guestEmail: user?.email || '',
    guestPhone: user?.phone || '',
    street: user?.addresses?.[0]?.street || '',
    city: user?.addresses?.[0]?.city || '',
    province: user?.addresses?.[0]?.province || '',
    postalCode: user?.addresses?.[0]?.postalCode || '',
    transactionId: '',
    notes: '',
    couponCode: '',
  });

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  // WhatsApp updates always go to the contact number above — the same number
  // the courier will use. No second phone field, matching standard checkout UX.
  const normalizedWhatsappPhone = normalizePkPhone(form.guestPhone);
  const whatsappDisplay = form.guestPhone.trim() ? formatPhoneDisplay(form.guestPhone) : '';

  const handleCopyNumber = () => {
    navigator.clipboard?.writeText('03495144486');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const [prefilledForUser, setPrefilledForUser] = useState(null);
  if (user && prefilledForUser !== user._id) {
    setPrefilledForUser(user._id);
    setForm((f) => ({
      ...f,
      guestName: f.guestName || user.name || '',
      guestEmail: f.guestEmail || user.email || '',
      guestPhone: f.guestPhone || user.phone || '',
      street: f.street || user.addresses?.[0]?.street || '',
      city: f.city || user.addresses?.[0]?.city || '',
      province: f.province || user.addresses?.[0]?.province || '',
    }));
  }

  const [errors, setErrors] = useState({});


  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h1 className="font-display font-bold text-2xl text-mountain-900 mb-2">Your cart is empty</h1>
        <Link to="/shop" id="checkout-empty-shop-btn" className="mt-4 inline-block px-8 py-3 bg-apricot-500 text-white font-semibold rounded-full hover:bg-apricot-600 transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.guestName.trim())    e.guestName = 'Name is required';
    if (!form.guestPhone.trim())   e.guestPhone = 'Phone is required';
    else if (!normalizePkPhone(form.guestPhone)) {
      e.guestPhone = 'Enter a valid mobile number, e.g. 0300 1234567';
    }
    if (!form.street.trim())       e.street = 'Street address is required';
    if (!form.city.trim())         e.city = 'City is required';
    if (!form.province)            e.province = 'Province is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');

    const payload = {
      guestName:  form.guestName.trim(),
      guestEmail: form.guestEmail.trim() || undefined,
      guestPhone: form.guestPhone.trim(),
      whatsappConsent,
      whatsappPhone: normalizedWhatsappPhone || form.guestPhone.trim(),
      items: items.map((i) => ({
        product:      i.productId,
        variantLabel: i.variantLabel,
        quantity:     i.quantity,
      })),
      shippingAddress: {
        name:       form.guestName.trim(),
        phone:      form.guestPhone.trim(),
        street:     form.street.trim(),
        city:       form.city.trim(),
        province:   form.province,
        postalCode: form.postalCode.trim() || undefined,
        country:    'Pakistan',
      },
      paymentMethod: 'easypaisa',
      transactionId: form.transactionId?.trim() || undefined,
      couponCode: form.couponCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      const { data } = await api.post('/orders', payload);
      clearCart();
      try {
        localStorage.setItem(
          'karakoram_last_order',
          JSON.stringify({
            orderId: data.orderId || data._id,
            mongoId: data._id,
            phone: data.shippingAddress?.phone || data.guestPhone || form.guestPhone.trim(),
            placedAt: new Date().toISOString(),
          })
        );
      } catch {
        // storage disabled
      }
      navigate('/order-success', { state: { order: data } });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Could not place your order. Please try again.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO
        title="Checkout – Easypaisa Payment"
        description="Secure checkout with Easypaisa. Transfer directly to 03495144486 (Shayan Danish). Order authentic handcrafted goods directly from Hunza."
      />

      {/* Back to Cart Navigation Button */}
      <div className="mb-4">
        <Link
          to="/cart"
          id="checkout-back-to-cart-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Cart</span>
        </Link>
      </div>

      <h1 className="font-display font-bold text-3xl text-mountain-900 mb-8">Checkout</h1>


      <form id="checkout-form" onSubmit={handleSubmit} noValidate>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left – Contact & Shipping */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest info */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-display font-semibold text-mountain-900 text-lg mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-apricot-100 text-apricot-600 rounded-full text-sm font-bold flex items-center justify-center">1</span>
                Contact Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="field-name" label="Full Name" required error={errors.guestName}>
                  <input
                    id="field-name"
                    type="text"
                    value={form.guestName}
                    onChange={set('guestName')}
                    placeholder="e.g. Ali Ahmed"
                    className={inputClass}
                    autoComplete="name"
                  />
                </Field>

                <Field id="field-phone" label="Phone Number" required error={errors.guestPhone} hint="Used for delivery and WhatsApp order updates">
                  <input
                    id="field-phone"
                    type="tel"
                    value={form.guestPhone}
                    onChange={set('guestPhone')}
                    placeholder="03XX XXXXXXX"
                    className={inputClass}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </Field>

                <Field id="field-email" label="Email Address (Recommended for confirmation & invoices)" error={errors.guestEmail} hint="We'll send order invoice & delivery notifications here">
                  <input
                    id="field-email"
                    type="email"
                    value={form.guestEmail}
                    onChange={set('guestEmail')}
                    placeholder="you@example.com"
                    className={inputClass}
                    autoComplete="email"
                  />
                </Field>
              </div>

              {/* WhatsApp order updates — sent to the phone number above */}
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-50/70 px-4 py-3.5">
                <input
                  id="field-whatsapp-consent"
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-mountain-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="min-w-0 text-xs">
                  <label
                    htmlFor="field-whatsapp-consent"
                    className="flex cursor-pointer flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-mountain-800"
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-[#25D366]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>Send order updates on WhatsApp</span>
                    {whatsappDisplay && (
                      <span className="font-mono font-normal text-mountain-500">{whatsappDisplay}</span>
                    )}
                  </label>
                  <p className="mt-1 leading-relaxed text-mountain-500">
                    Order confirmation, dispatch with courier CN, and delivery alerts.
                    {whatsappConsent
                      ? ' No promotional messages.'
                      : ' If unchecked, we will keep you updated by email instead.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Shipping address */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-display font-semibold text-mountain-900 text-lg mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-apricot-100 text-apricot-600 rounded-full text-sm font-bold flex items-center justify-center">2</span>
                Shipping Address
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field id="field-street" label="Street / House No." required error={errors.street}>
                    <input
                      id="field-street"
                      type="text"
                      value={form.street}
                      onChange={set('street')}
                      placeholder="e.g. House 12, Street 4, F-7/2"
                      className={inputClass}
                      autoComplete="street-address"
                    />
                  </Field>
                </div>

                <Field id="field-city" label="City" required error={errors.city}>
                  <input
                    id="field-city"
                    type="text"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="e.g. Islamabad"
                    className={inputClass}
                    autoComplete="address-level2"
                  />
                </Field>

                <Field id="field-province" label="Province" required error={errors.province}>
                  <select
                    id="field-province"
                    value={form.province}
                    onChange={set('province')}
                    className={inputClass}
                    autoComplete="address-level1"
                  >
                    <option value="">Select province</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>

                <Field id="field-postal" label="Postal Code (optional)">
                  <input
                    id="field-postal"
                    type="text"
                    value={form.postalCode}
                    onChange={set('postalCode')}
                    placeholder="e.g. 44000"
                    className={inputClass}
                    autoComplete="postal-code"
                  />
                </Field>
              </div>
            </section>

            {/* Additional */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-display font-semibold text-mountain-900 text-lg mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-apricot-100 text-apricot-600 rounded-full text-sm font-bold flex items-center justify-center">3</span>
                Additional Info
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="field-coupon" label="Coupon Code" hint="Optional discount code">
                  <input
                    id="field-coupon"
                    type="text"
                    value={form.couponCode}
                    onChange={set('couponCode')}
                    placeholder="SAVE10"
                    className={`${inputClass} uppercase`}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field id="field-notes" label="Order Notes (optional)">
                    <textarea
                      id="field-notes"
                      rows={3}
                      value={form.notes}
                      onChange={set('notes')}
                      placeholder="Any special instructions…"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-display font-semibold text-mountain-900 text-lg mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold flex items-center justify-center">4</span>
                Payment Method
              </h2>

              <div className="border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/50 via-white to-stone-50/40 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                {/* Header Badge */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-emerald-600/30">
                      📱
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-stone-900 flex items-center gap-2">
                        Easypaisa Payment
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                          Active
                        </span>
                      </h3>
                      <p className="text-xs text-stone-500">Fast & secure mobile wallet transfer</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                    Direct Transfer
                  </span>
                </div>

                {/* Account Credentials Box */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-emerald-200 shadow-xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Account Title</span>
                      <p className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                        Shayan Danish
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Payable</span>
                      <p className="text-base sm:text-lg font-display font-bold text-apricot-600">{fmtPKR(total)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Easypaisa Mobile Number</span>
                      <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-950 tracking-wider">03495144486</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      id="copy-easypaisa-btn"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-sm hover:shadow-emerald-600/20"
                    >
                      {copiedNumber ? (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy Number</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Steps */}
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3.5 text-xs text-stone-700 space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-[10px]">✓</span>
                    Quick Payment Steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1 leading-relaxed">
                    <li>Open <strong>Easypaisa App</strong> or dial <strong>*786#</strong> on your phone.</li>
                    <li>Send <strong>{fmtPKR(total)}</strong> to <strong>03495144486</strong> (Title: <strong>Shayan Danish</strong>).</li>
                    <li>Enter the 11-digit <strong>TRX ID</strong> or sender number below (or share screenshot on WhatsApp after ordering).</li>
                  </ol>
                </div>

                {/* Optional TRX ID Input */}
                <div className="pt-1">
                  <Field
                    id="field-transaction-id"
                    label="Easypaisa TRX ID / Sender Number (Optional)"
                    hint="Enter your 11-digit transaction ID or the mobile number used to pay."
                  >
                    <input
                      id="field-transaction-id"
                      type="text"
                      value={form.transactionId}
                      onChange={set('transactionId')}
                      placeholder="e.g. 29481948201 or 0349XXXXXXX"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>
          </div>

          {/* Right – Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h2 className="font-display font-semibold text-mountain-900 text-lg mb-5">Order Summary</h2>

              <div className="space-y-3 mb-5">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between gap-2 text-sm">
                    <span className="text-mountain-700 min-w-0 truncate">
                      {item.productName}
                      <span className="text-mountain-400"> × {item.quantity} ({item.variantLabel})</span>
                    </span>
                    <span className="font-medium text-mountain-800 shrink-0">{fmtPKR(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-cream-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-mountain-600">
                  <span>Subtotal</span>
                  <span>{fmtPKR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-mountain-600">
                  <span>Shipping</span>
                  <span>{fmtPKR(SHIPPING)}</span>
                </div>
                <div className="border-t border-cream-200 pt-2 flex justify-between">
                  <span className="font-bold text-mountain-900">Total</span>
                  <span className="font-display font-bold text-apricot-600 text-xl">{fmtPKR(total)}</span>
                </div>
              </div>

              {apiError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              <button
                id="checkout-submit-btn"
                type="submit"
                disabled={submitting}
                className="mt-6 w-full py-4 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-apricot-500/30 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? 'Placing Order…' : `Place Order — ${fmtPKR(total)}`}
              </button>

              <p className="text-xs text-center text-mountain-400 mt-3">
                By placing this order you agree to our return & refund policy.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
