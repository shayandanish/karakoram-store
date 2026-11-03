import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fmtPKR } from '../lib/utils';
import { COUNTRY_CODES, validatePhoneNumber, validateEmail } from '../lib/phoneUtils';
import { getDeliveryRate } from '../lib/deliveryRates';
import api from '../lib/axios';
import SEO from '../components/ui/SEO';
import TrustBadges from '../components/ui/TrustBadges';
import { useSiteSettings } from '../hooks/useSiteSettings';

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

const PAYMENT_CARD_STYLES = {
  easypaisa: {
    card: 'border-stone-300 from-white to-stone-50',
    icon: 'bg-white border border-stone-200',
    badge: 'bg-stone-100 text-stone-700',
    directBadge: 'text-stone-700 bg-white border-stone-200',
    account: 'border-stone-200',
    verified: 'bg-stone-100 text-stone-700',
    number: 'text-stone-900',
    copy: 'bg-stone-800 hover:bg-stone-900 hover:shadow-stone-900/20',
    steps: 'bg-stone-50 border-stone-200',
    stepIcon: 'bg-stone-700',
    stepTitle: 'text-stone-900',
  },
  jazzcash: {
    card: 'border-stone-300 from-white to-stone-50',
    icon: 'bg-white border border-stone-200',
    badge: 'bg-stone-100 text-stone-700',
    directBadge: 'text-stone-700 bg-white border-stone-200',
    account: 'border-stone-200',
    verified: 'bg-stone-100 text-stone-700',
    number: 'text-stone-900',
    copy: 'bg-stone-800 hover:bg-stone-900 hover:shadow-stone-900/20',
    steps: 'bg-stone-50 border-stone-200',
    stepIcon: 'bg-stone-700',
    stepTitle: 'text-stone-900',
  },
};

export default function CheckoutPage() {
  const { items, subtotal, clearCart, revalidateCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [cartIsChecking, setCartIsChecking] = useState(true);
  const [cartNotice, setCartNotice] = useState('');
  const [cartCheckError, setCartCheckError] = useState('');
  const [revalidating, setRevalidating] = useState(false);
  const enabledPaymentMethods = settings.paymentMethods.filter((method) => method.enabled);

  useEffect(() => {
    let active = true;
    revalidateCart()
      .then(({ warnings }) => {
        if (!active) return;
        setCartCheckError('');
        if (warnings.length) {
          setCartNotice('Your cart changed. Review the updated prices and availability before placing the order.');
        }
      })
      .catch(() => {
        if (active) setCartCheckError('Unable to verify current prices and stock. Please try again.');
      })
      .finally(() => {
        if (active) setCartIsChecking(false);
      });

    return () => { active = false; };
  }, [items.length, revalidateCart]);

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
  const deliveryRate = getDeliveryRate(settings, form.city, form.province);
  const shippingFee = deliveryRate.shippingFee;
  const total = subtotal + shippingFee;

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [dialCode, setDialCode] = useState('+92');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('easypaisa');
  const selectedPaymentMethod =
    enabledPaymentMethods.find((method) => method.id === selectedPaymentMethodId) ||
    enabledPaymentMethods[0];
  const paymentCardStyles = PAYMENT_CARD_STYLES[selectedPaymentMethod?.id];
  const isMobileWallet = Boolean(paymentCardStyles);

  const handleCopyNumber = () => {
    if (!selectedPaymentMethod?.accountNumber) return;
    navigator.clipboard?.writeText(selectedPaymentMethod.accountNumber);
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
  const [emailWarning, setEmailWarning] = useState('');


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
    if (k === 'guestEmail') setEmailWarning('');
  };

  const validate = () => {
    const e = {};
    setEmailWarning(''); // clear any previous warning

    if (!form.guestName.trim())    e.guestName = 'Name is required';

    // Phone — required, country-code aware
    if (!form.guestPhone.trim()) {
      e.guestPhone = 'Phone number is required';
    } else {
      const { valid, error } = validatePhoneNumber(form.guestPhone, dialCode);
      if (!valid) e.guestPhone = error;
    }

    // Email — optional but validated when provided
    if (form.guestEmail.trim()) {
      const { valid, error, warning } = validateEmail(form.guestEmail);
      if (!valid) {
        e.guestEmail = error;
      } else if (warning) {
        setEmailWarning(warning);
      }
    }

    if (!form.street.trim())       e.street = 'Street address is required';
    if (!form.city.trim())         e.city = 'City is required';
    if (!form.province)            e.province = 'Province is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCartCheckError('');
    setCartNotice('');
    if (!selectedPaymentMethod) {
      setApiError('No payment methods are currently available. Please contact the store.');
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');

    setRevalidating(true);
    try {
      const cartCheck = await revalidateCart();
      if (!cartCheck.canCheckout) {
        setCartNotice(
          cartCheck.warnings.join(' ') ||
          'Your cart changed. Review the updated prices and availability before placing the order.'
        );
        setSubmitting(false);
        return;
      }
    } catch {
      setCartCheckError('Unable to verify current prices and stock. Please try again.');
      setSubmitting(false);
      return;
    } finally {
      setRevalidating(false);
    }

    // Normalize the phone to E.164 format before sending to server
    const { normalized: normalizedPhone } = validatePhoneNumber(form.guestPhone, dialCode);
    const phoneToSend = normalizedPhone || form.guestPhone.trim();

    const payload = {
      guestName:  form.guestName.trim(),
      guestEmail: form.guestEmail.trim() || undefined,
      guestPhone: phoneToSend,
      items: items.map((i) => ({
        product:      i.productId,
        variantLabel: i.variantLabel,
        quantity:     i.quantity,
      })),
      shippingAddress: {
        name:       form.guestName.trim(),
        phone:      phoneToSend,
        street:     form.street.trim(),
        city:       form.city.trim(),
        province:   form.province,
        postalCode: form.postalCode.trim() || undefined,
        country:    'Pakistan',
      },
      paymentMethod: selectedPaymentMethod?.id,
      transactionId:
        selectedPaymentMethod?.id !== 'cod'
          ? form.transactionId?.trim() || undefined
          : undefined,
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
            phone: data.shippingAddress?.phone || data.guestPhone || phoneToSend,
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
        title="Checkout"
        description={`Choose a payment option and place your order with ${settings.storeName}.`}
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

      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-mountain-900">Checkout</h1>
        <p className="mt-1 text-sm text-mountain-500">{settings.storeTagline}</p>
      </div>

      {/* Progress indicator */}
      <ol className="mb-8 flex flex-wrap items-center gap-y-2 text-xs" aria-label="Checkout progress">
        {[
          { id: 'cart', label: 'Cart', state: 'done' },
          { id: 'details', label: 'Details', state: 'current' },
          { id: 'payment', label: 'Payment', state: 'upcoming' },
          { id: 'done', label: 'Confirmation', state: 'upcoming' },
        ].map((step, index, steps) => (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-current={step.state === 'current' ? 'step' : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                step.state === 'done'
                  ? 'bg-emerald-100 text-emerald-700'
                  : step.state === 'current'
                    ? 'bg-apricot-500 text-white shadow-sm'
                    : 'bg-cream-200 text-mountain-400'
              }`}
            >
              {step.state === 'done' ? '✓' : index + 1}
            </span>
            <span
              className={
                step.state === 'upcoming'
                  ? 'font-medium text-mountain-400'
                  : 'font-semibold text-mountain-800'
              }
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className="mx-1 h-px w-5 bg-cream-300 sm:w-9" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>


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

                <Field
                  id="field-phone"
                  label="Phone Number"
                  required
                  error={errors.guestPhone}
                  hint={
                    dialCode === '+92'
                      ? 'Pakistani format: 03XX-XXXXXXX · Used for courier delivery updates'
                      : `Enter subscriber digits without the country code · Courier updates sent here`
                  }
                >
                  <div className="flex gap-2">
                    {/* Country code selector */}
                    <select
                      value={dialCode}
                      onChange={(e) => {
                        setDialCode(e.target.value);
                        setErrors((er) => ({ ...er, guestPhone: '' }));
                      }}
                      className="shrink-0 border border-cream-300 rounded-xl px-2 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800"
                      aria-label="Country code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    {/* Phone number input */}
                    <input
                      id="field-phone"
                      type="tel"
                      value={form.guestPhone}
                      onChange={set('guestPhone')}
                      placeholder={
                        dialCode === '+92'
                          ? '03XX XXXXXXX'
                          : COUNTRY_CODES.find((c) => c.code === dialCode)?.example ?? 'XXXXXXXXX'
                      }
                      className={`${inputClass} flex-1`}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                </Field>

                <Field id="field-email" label="Email Address (Recommended for confirmation & invoices)" error={errors.guestEmail} hint="We'll send order invoice & delivery notifications here">
                  <input
                    id="field-email"
                    type="email"
                    value={form.guestEmail}
                    onChange={set('guestEmail')}
                    onBlur={() => {
                      if (!form.guestEmail.trim()) return;
                      const { valid, error, warning } = validateEmail(form.guestEmail);
                      if (!valid) setErrors((er) => ({ ...er, guestEmail: error }));
                      else setEmailWarning(warning || '');
                    }}
                    placeholder="you@gmail.com"
                    className={inputClass}
                    autoComplete="email"
                  />
                  {emailWarning && !errors.guestEmail && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <span>⚠️</span> {emailWarning}
                    </p>
                  )}
                </Field>
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

              {enabledPaymentMethods.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  No payment methods are currently available. Please contact the store.
                </p>
              ) : (
                <>
                  <fieldset className="mb-5 grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Choose a payment method</legend>
                    {enabledPaymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                          selectedPaymentMethod?.id === method.id
                            ? 'border-apricot-400 bg-apricot-50/50'
                            : 'border-cream-200 hover:border-apricot-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethod?.id === method.id}
                          onChange={() => {
                            setSelectedPaymentMethodId(method.id);
                            setCopiedNumber(false);
                          }}
                          className="mt-1 accent-apricot-500"
                        />
                        <span>
                          <span className="block font-semibold text-mountain-900">{method.name}</span>
                          <span className="mt-0.5 block text-xs text-mountain-500">
                            {method.id === 'cod' ? 'Pay when your order arrives' : 'Manual payment'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </>
              )}

              {isMobileWallet && selectedPaymentMethod.accountNumber && (
              <div className={`border-2 bg-gradient-to-br via-white rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 ${paymentCardStyles.card}`}>
                {/* Header Badge */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {selectedPaymentMethod.id === 'jazzcash' ? (
                      <div className={`w-14 h-12 rounded-xl flex items-center justify-center p-1 shadow-sm ${paymentCardStyles.icon}`}>
                        <img src="/jazzcash-logo.svg" alt="JazzCash" className="h-full w-full object-contain" />
                      </div>
                    ) : selectedPaymentMethod.id === 'easypaisa' ? (
                      <div className={`w-24 h-12 rounded-xl flex items-center justify-center p-2 shadow-sm ${paymentCardStyles.icon}`}>
                        <img src="/easypaisa-logo.png" alt="Easypaisa" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-sm ${paymentCardStyles.icon}`}>
                        📱
                      </div>
                    )}
                    <div>
                      <h3 className="font-display font-bold text-base text-stone-900 flex items-center gap-2">
                        {selectedPaymentMethod.name} Payment
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${paymentCardStyles.badge}`}>
                          Active
                        </span>
                      </h3>
                      <p className="text-xs text-stone-500">Fast & secure mobile wallet transfer</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold border px-2.5 py-1 rounded-lg ${paymentCardStyles.directBadge}`}>
                    Direct Transfer
                  </span>
                </div>

                {/* Account Credentials Box */}
                <div className={`bg-white rounded-xl p-4 sm:p-5 border shadow-xs space-y-3.5 ${paymentCardStyles.account}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Account Title</span>
                      <p className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                        {selectedPaymentMethod.accountName || selectedPaymentMethod.name}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${paymentCardStyles.verified}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Account Number / IBAN</span>
                      <p className={`text-xl sm:text-2xl font-mono font-bold tracking-wider ${paymentCardStyles.number}`}>{selectedPaymentMethod.accountNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      id="copy-payment-account-btn"
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold active:scale-95 text-white transition-all shadow-sm ${paymentCardStyles.copy}`}
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
                <div className={`border rounded-xl p-3.5 text-xs text-stone-700 space-y-2 ${paymentCardStyles.steps}`}>
                  <p className={`font-bold flex items-center gap-1.5 ${paymentCardStyles.stepTitle}`}>
                    <span className={`w-4 h-4 rounded-full text-white inline-flex items-center justify-center text-[10px] ${paymentCardStyles.stepIcon}`}>✓</span>
                    Quick Payment Steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1 leading-relaxed">
                    <li>Use <strong>{selectedPaymentMethod.name}</strong> to send the exact payable amount.</li>
                    <li>Transfer <strong>{fmtPKR(total)}</strong> to <strong>{selectedPaymentMethod.accountNumber}</strong> (Title: <strong>{selectedPaymentMethod.accountName || selectedPaymentMethod.name}</strong>).</li>
                    <li>Enter your transaction reference below or upload a payment screenshot after placing your order.</li>
                  </ol>
                  {selectedPaymentMethod.instructions && (
                    <p className="border-t border-current/10 pt-2 text-stone-600">
                      {selectedPaymentMethod.instructions}
                    </p>
                  )}
                </div>

                {/* Optional TRX ID Input */}
                <div className="pt-1">
                  <Field
                    id="field-transaction-id"
                    label={`${selectedPaymentMethod.name} transaction reference (Optional)`}
                    hint="Enter the transaction reference from your payment provider."
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
              )}

              {selectedPaymentMethod && (!isMobileWallet || !selectedPaymentMethod.accountNumber) && (
                <div className="rounded-2xl border border-cream-200 bg-cream-50/70 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-mountain-900">
                        {selectedPaymentMethod.name}
                      </h3>
                      <p className="mt-1 text-xs text-mountain-600">
                        {selectedPaymentMethod.instructions}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-apricot-600">{fmtPKR(total)}</span>
                  </div>
                  {selectedPaymentMethod.id !== 'cod' && (
                    <>
                      {(selectedPaymentMethod.accountName || selectedPaymentMethod.accountNumber) && (
                        <div className="mt-4 rounded-xl border border-cream-200 bg-white p-4">
                          {selectedPaymentMethod.accountName && (
                            <p className="text-sm text-mountain-700">
                              <span className="text-xs text-mountain-400">Account name</span>
                              <span className="block font-semibold">{selectedPaymentMethod.accountName}</span>
                            </p>
                          )}
                          {selectedPaymentMethod.accountNumber && (
                            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                              <p className="text-sm text-mountain-700">
                                <span className="text-xs text-mountain-400">Account number / IBAN</span>
                                <span className="block font-mono font-bold">{selectedPaymentMethod.accountNumber}</span>
                              </p>
                              <button
                                type="button"
                                onClick={handleCopyNumber}
                                className="rounded-lg bg-mountain-900 px-3 py-2 text-xs font-semibold text-white hover:bg-mountain-800"
                              >
                                {copiedNumber ? 'Copied' : 'Copy account'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-4">
                        <Field
                          id="field-transaction-id"
                          label="Transaction ID / reference (optional)"
                          hint="You can upload payment proof after placing the order."
                        >
                          <input
                            id="field-transaction-id"
                            type="text"
                            value={form.transactionId}
                            onChange={set('transactionId')}
                            placeholder="Enter your transaction reference"
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                  <span>Delivery</span>
                  <span>{fmtPKR(shippingFee)}</span>
                </div>
                <p className="text-xs leading-relaxed text-mountain-500" aria-live="polite">
                  {deliveryRate.zoneName
                    ? `${deliveryRate.zoneName} delivery · `
                    : 'Standard delivery · '}
                  Estimated in {deliveryRate.minDays}–{deliveryRate.maxDays} days after placing your order.
                </p>
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
              {cartNotice && (
                <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {cartNotice}
                </div>
              )}
              {cartCheckError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {cartCheckError}
                </div>
              )}

              <button
                id="checkout-submit-btn"
                type="submit"
                disabled={submitting || revalidating || cartIsChecking}
                className="mt-6 w-full py-4 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-apricot-500/30 disabled:cursor-not-allowed text-sm"
              >
                {cartIsChecking || revalidating
                  ? 'Checking cart…'
                  : submitting
                    ? 'Placing Order…'
                    : `Place Order — ${fmtPKR(total)}`}
              </button>

              <p className="text-xs text-center text-mountain-400 mt-3">
                By placing this order you agree to our return & refund policy.
              </p>

              <TrustBadges variant="inline" className="mt-5 border-t border-cream-200 pt-4" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
