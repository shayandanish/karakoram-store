import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fmtPKR } from '../lib/utils';
import { COUNTRY_CODES, validatePhoneNumber, validateEmail } from '../lib/phoneUtils';
import { getDeliveryRate } from '../lib/deliveryRates';
import api from '../lib/axios';
import SEO from '../components/ui/SEO';
import ProductImage from '../components/ui/ProductImage';
import { useSiteSettings } from '../hooks/useSiteSettings';

const PROVINCES = [
  'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan',
  'Gilgit-Baltistan', 'Azad Jammu & Kashmir', 'Islamabad Capital Territory',
];

const FIELD_IDS = {
  guestName: 'field-name',
  guestPhone: 'field-phone',
  guestEmail: 'field-email',
  street: 'field-street',
  city: 'field-city',
  province: 'field-province',
};

function Field({ id, label, required, children, error, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-mountain-700">
        {label}
        {required && (
          <span className="ml-0.5 text-apricot-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-mountain-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-relaxed text-red-600"
        >
          <span aria-hidden="true">•</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const controlProps = (id, { error, hint, required } = {}) => ({
  id,
  'aria-invalid': error ? 'true' : undefined,
  'aria-required': required ? 'true' : undefined,
  'aria-describedby':
    [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') ||
    undefined,
});

const inputClass =
  'w-full min-w-0 scroll-mt-32 rounded-lg border border-cream-300 bg-white px-3.5 py-2.5 text-sm text-mountain-900 placeholder:text-mountain-400 transition-colors focus:border-apricot-500 focus:outline-none focus:ring-2 focus:ring-apricot-500/35';

const copyButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-cream-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-mountain-800 transition-colors hover:border-apricot-400 hover:text-apricot-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500/40 focus-visible:ring-offset-1';

const MOBILE_WALLET_LOGOS = {
  easypaisa: {
    src: '/easypaisa-logo.png',
    alt: 'Easypaisa',
    className: 'h-7 w-auto max-w-[96px]',
  },
  jazzcash: {
    src: '/jazzcash-logo.svg',
    alt: 'JazzCash',
    className: 'h-8 w-auto max-w-[56px]',
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
    whatsappConsent: false,
  });
  const deliveryRate = getDeliveryRate(settings, form.city, form.province);
  const shippingFee = deliveryRate.shippingFee;
  const total = subtotal + shippingFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [dialCode, setDialCode] = useState('+92');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('easypaisa');
  const selectedPaymentMethod =
    enabledPaymentMethods.find((method) => method.id === selectedPaymentMethodId) ||
    enabledPaymentMethods[0];
  const walletLogo = MOBILE_WALLET_LOGOS[selectedPaymentMethod?.id];
  const isMobileWallet = Boolean(walletLogo);

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
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="mb-4 text-4xl" aria-hidden="true">
          🛒
        </p>
        <h1 className="mb-2 font-display text-2xl font-bold text-mountain-900">Your cart is empty</h1>
        <p className="text-sm text-mountain-500">Add an item to your cart before checking out.</p>
        <Link
          to="/shop"
          id="checkout-empty-shop-btn"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-apricot-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-apricot-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-apricot-500/30 focus-visible:ring-offset-2"
        >
          Shop now
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

    // Email — required for order confirmation and tracking updates
    if (!form.guestEmail.trim()) {
      e.guestEmail = 'Email address is required for your order confirmation and tracking updates.';
    } else {
      const { valid, warning } = validateEmail(form.guestEmail);
      if (!valid) {
        e.guestEmail = 'Enter a valid email address to receive your order confirmation and tracking updates.';
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
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstInvalidId = FIELD_IDS[Object.keys(errs)[0]];
      if (firstInvalidId) {
        window.requestAnimationFrame(() => document.getElementById(firstInvalidId)?.focus());
      }
      return;
    }

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
      whatsappConsent: form.whatsappConsent,
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <SEO
        title="Checkout"
        description={`Choose a payment option and place your order with ${settings.storeName}.`}
      />

      <div className="mb-6">
        <Link
          to="/cart"
          id="checkout-back-to-cart-btn"
          className="group inline-flex items-center gap-2 rounded-md text-xs font-semibold text-mountain-600 transition-colors hover:text-apricot-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500/40 focus-visible:ring-offset-2"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cream-300 bg-white text-mountain-700 transition-colors group-hover:border-apricot-400 group-hover:text-apricot-700" aria-hidden="true">
            ←
          </span>
          <span>Back to cart</span>
        </Link>
      </div>

      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold text-mountain-900 sm:text-4xl">Checkout</h1>
        <p className="mt-1.5 text-sm text-mountain-500">{settings.storeTagline}</p>
      </div>

      <ol
        className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs"
        aria-label="Checkout progress"
      >
        {[
          { id: 'cart', label: 'Cart', state: 'done' },
          { id: 'details', label: 'Details', state: 'current' },
          { id: 'payment', label: 'Payment', state: 'upcoming' },
          { id: 'done', label: 'Confirmation', state: 'upcoming' },
        ].map((step, index, steps) => (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-current={step.state === 'current' ? 'step' : undefined}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                step.state === 'done'
                  ? 'bg-mountain-900 text-white'
                  : step.state === 'current'
                    ? 'bg-apricot-600 text-white'
                    : 'border border-cream-300 bg-white text-mountain-400'
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
              <span className="mx-1 h-px w-4 bg-cream-300 sm:w-8" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <form id="checkout-form" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Left – Contact & Shipping */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Guest info */}
            <section className="rounded-xl border border-cream-300 bg-white p-5 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-display text-lg font-semibold text-mountain-900">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-apricot-50 text-xs font-bold text-apricot-700">
                  1
                </span>
                Contact information
              </h2>
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field id="field-name" label="Full name" required error={errors.guestName}>
                  <input
                    {...controlProps('field-name', { error: errors.guestName, required: true })}
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
                  label="Phone number"
                  required
                  error={errors.guestPhone}
                  hint={
                    dialCode === '+92'
                      ? 'Pakistani format: 03XX-XXXXXXX'
                      : 'Enter the number without the country code.'
                  }
                >
                  <div className="flex min-w-0 gap-2">
                    {/* Country code selector */}
                    <select
                      value={dialCode}
                      onChange={(e) => {
                        setDialCode(e.target.value);
                        setErrors((er) => ({ ...er, guestPhone: '' }));
                      }}
                      className="w-[6.5rem] shrink-0 scroll-mt-32 rounded-lg border border-cream-300 bg-white px-2.5 py-2.5 text-sm text-mountain-900 transition-colors focus:border-apricot-500 focus:outline-none focus:ring-2 focus:ring-apricot-500/35"
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
                      {...controlProps('field-phone', {
                        error: errors.guestPhone,
                        hint: true,
                        required: true,
                      })}
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

                <div className="sm:col-span-2">
                  <Field
                    id="field-email"
                    label="Email address"
                    required
                    error={errors.guestEmail}
                    hint="Used for your order confirmation, invoice, and tracking updates. Invalid email addresses will stop checkout."
                  >
                    <input
                      {...controlProps('field-email', { error: errors.guestEmail, hint: true })}
                      type="email"
                      required
                      value={form.guestEmail}
                      onChange={set('guestEmail')}
                      onBlur={() => {
                        if (!form.guestEmail.trim()) {
                          setErrors((er) => ({ ...er, guestEmail: 'Email address is required for your order confirmation and tracking updates.' }));
                          return;
                        }
                        const { valid, warning } = validateEmail(form.guestEmail);
                        if (!valid) setErrors((er) => ({ ...er, guestEmail: 'Enter a valid email address to receive your order confirmation and tracking updates.' }));
                        else setEmailWarning(warning || '');
                      }}
                      aria-describedby={
                        [
                          'field-email-hint',
                          emailWarning && !errors.guestEmail ? 'field-email-warning' : '',
                          errors.guestEmail ? 'field-email-error' : '',
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                      placeholder="you@example.com"
                      className={inputClass}
                      autoComplete="email"
                      inputMode="email"
                    />
                    {emailWarning && !errors.guestEmail && (
                      <p
                        id="field-email-warning"
                        role="status"
                        className="mt-1.5 text-xs leading-relaxed text-amber-700"
                      >
                        {emailWarning}
                      </p>
                    )}
                  </Field>
                </div>
                {settings.enableCustomerWhatsApp && <label className="sm:col-span-2 flex items-start gap-2.5 text-xs leading-relaxed text-mountain-600"><input type="checkbox" checked={form.whatsappConsent} onChange={(event) => setForm((current) => ({ ...current, whatsappConsent: event.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-cream-400 text-apricot-600 focus:ring-apricot-500" /><span>Send me order and delivery updates on WhatsApp. I can still place my order without opting in.</span></label>}
              </div>
            </section>

            {/* Shipping address */}
            <section className="rounded-xl border border-cream-300 bg-white p-5 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-display text-lg font-semibold text-mountain-900">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-apricot-50 text-xs font-bold text-apricot-700">
                  2
                </span>
                Shipping address
              </h2>
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="field-street" label="Street / house no." required error={errors.street}>
                    <input
                      {...controlProps('field-street', { error: errors.street, required: true })}
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
                    {...controlProps('field-city', { error: errors.city, required: true })}
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
                    {...controlProps('field-province', {
                      error: errors.province,
                      required: true,
                    })}
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

                <Field id="field-postal" label="Postal code (optional)">
                  <input
                    {...controlProps('field-postal')}
                    type="text"
                    value={form.postalCode}
                    onChange={set('postalCode')}
                    placeholder="e.g. 44000"
                    className={inputClass}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </Field>
              </div>
            </section>

            {/* Additional */}
            <section className="rounded-xl border border-cream-300 bg-white p-5 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-display text-lg font-semibold text-mountain-900">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-apricot-50 text-xs font-bold text-apricot-700">
                  3
                </span>
                Additional information
              </h2>
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field id="field-coupon" label="Coupon code (optional)" hint="Enter a discount code if you have one.">
                  <input
                    {...controlProps('field-coupon', { hint: true })}
                    type="text"
                    value={form.couponCode}
                    onChange={set('couponCode')}
                    placeholder="Enter code"
                    className={`${inputClass} uppercase`}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field id="field-notes" label="Order notes (optional)">
                    <textarea
                      {...controlProps('field-notes')}
                      rows={3}
                      value={form.notes}
                      onChange={set('notes')}
                      placeholder="Any special instructions for your order…"
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-xl border border-cream-300 bg-white p-5 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-display text-lg font-semibold text-mountain-900">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-apricot-50 text-xs font-bold text-apricot-700">
                  4
                </span>
                Payment method
              </h2>

              {enabledPaymentMethods.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  No payment methods are currently available. Please contact the store.
                </p>
              ) : (
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">Choose a payment method</legend>
                  {enabledPaymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    return (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors focus-within:border-apricot-500 focus-within:ring-2 focus-within:ring-apricot-500/20 ${
                          isSelected
                            ? 'border-apricot-500 bg-apricot-50/60'
                            : 'border-cream-300 bg-white hover:border-apricot-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedPaymentMethodId(method.id);
                            setCopiedNumber(false);
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500/40 focus-visible:ring-offset-2"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-mountain-900">
                            {method.name}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-mountain-500">
                            {method.id === 'cod'
                              ? 'Pay when your order arrives'
                              : 'Manual payment'}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {isMobileWallet && selectedPaymentMethod.accountNumber && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-cream-300 bg-cream-50/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cream-300 pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md border border-cream-300 bg-white p-1.5">
                          <img
                            src={walletLogo.src}
                            alt={walletLogo.alt}
                            className={`${walletLogo.className} object-contain`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-mountain-900">
                            {selectedPaymentMethod.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-mountain-500">Mobile wallet transfer</p>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-mountain-500">
                          Amount to send
                        </p>
                        <p className="mt-0.5 font-display text-xl font-bold text-apricot-700">
                          {fmtPKR(total)}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-mountain-500">Account title</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-mountain-900">
                          {selectedPaymentMethod.accountName || selectedPaymentMethod.name}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-mountain-500">Account number</dt>
                        <dd className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 break-all font-mono text-base font-semibold tracking-wide text-mountain-900">
                            {selectedPaymentMethod.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyNumber}
                            id="copy-payment-account-btn"
                            className={copyButtonClass}
                          >
                            {copiedNumber ? (
                              <>
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Copied
                              </>
                            ) : (
                              <>
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        </dd>
                      </div>
                    </dl>
                    <p className="sr-only" role="status">
                      {copiedNumber ? 'Account number copied to clipboard.' : ''}
                    </p>
                  </div>

                  <div className="rounded-xl border border-cream-200 bg-white p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-mountain-500">
                      How to pay
                    </h4>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-mountain-600">
                      <li>
                        Open <strong className="font-semibold text-mountain-800">{selectedPaymentMethod.name}</strong> and
                        choose Send Money.
                      </li>
                      <li>
                        Send <strong className="font-semibold text-mountain-800">{fmtPKR(total)}</strong> to{' '}
                        <span className="break-all font-mono font-semibold text-mountain-800">
                          {selectedPaymentMethod.accountNumber}
                        </span>
                        .
                      </li>
                      <li>Enter your transaction reference below.</li>
                    </ol>
                    {selectedPaymentMethod.instructions && (
                      <p className="mt-3 break-words border-t border-cream-200 pt-3 text-xs leading-relaxed text-mountain-500">
                        {selectedPaymentMethod.instructions}
                      </p>
                    )}
                  </div>

                  <Field
                    id="field-transaction-id"
                    label={`${selectedPaymentMethod.name} transaction reference (optional)`}
                    hint="Enter the transaction reference from your payment provider."
                  >
                    <input
                      {...controlProps('field-transaction-id', { hint: true })}
                      type="text"
                      value={form.transactionId}
                      onChange={set('transactionId')}
                      placeholder="e.g. 29481948201"
                      className={inputClass}
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </Field>
                </div>
              )}

              {selectedPaymentMethod && (!isMobileWallet || !selectedPaymentMethod.accountNumber) && (
                <div className="mt-5 rounded-xl border border-cream-200 bg-cream-50/60 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold text-mountain-900">
                        {selectedPaymentMethod.name}
                      </h3>
                      {selectedPaymentMethod.instructions && (
                        <p className="mt-1 break-words text-xs leading-relaxed text-mountain-600">
                          {selectedPaymentMethod.instructions}
                        </p>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-mountain-500">
                        Amount to pay
                      </p>
                      <p className="mt-0.5 font-display text-xl font-bold text-apricot-700">
                        {fmtPKR(total)}
                      </p>
                    </div>
                  </div>

                  {selectedPaymentMethod.id !== 'cod' && (
                    <>
                      {(selectedPaymentMethod.accountName ||
                        selectedPaymentMethod.accountNumber) && (
                        <div className="mt-4 rounded-lg border border-cream-300 bg-white p-4">
                          {selectedPaymentMethod.accountName && (
                            <div>
                              <p className="text-xs font-medium text-mountain-500">Account name</p>
                              <p className="mt-0.5 break-words text-sm font-semibold text-mountain-900">
                                {selectedPaymentMethod.accountName}
                              </p>
                            </div>
                          )}
                          {selectedPaymentMethod.accountNumber && (
                            <div className={selectedPaymentMethod.accountName ? 'mt-3' : ''}>
                              <p className="text-xs font-medium text-mountain-500">
                                Account number / IBAN
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2">
                                <p className="min-w-0 break-all font-mono text-sm font-semibold text-mountain-900">
                                  {selectedPaymentMethod.accountNumber}
                                </p>
                                <button
                                  type="button"
                                  onClick={handleCopyNumber}
                                  className={copyButtonClass}
                                >
                                  {copiedNumber ? 'Copied' : 'Copy account'}
                                </button>
                              </div>
                            </div>
                          )}
                          <p className="sr-only" role="status">
                            {copiedNumber ? 'Account number copied to clipboard.' : ''}
                          </p>
                        </div>
                      )}
                      <div className="mt-4">
                        <Field
                          id="field-transaction-id"
                          label="Transaction ID / reference (optional)"
                          hint="Add the reference from your transfer, if you have it."
                        >
                          <input
                            {...controlProps('field-transaction-id', { hint: true })}
                            type="text"
                            value={form.transactionId}
                            onChange={set('transactionId')}
                            placeholder="Enter your transaction reference"
                            className={inputClass}
                            autoComplete="off"
                            spellCheck="false"
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
          <aside className="min-w-0 space-y-4">
            <div className="rounded-xl border border-cream-300 bg-white p-5 sm:p-6 lg:sticky lg:top-32">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-mountain-900">Order summary</h2>
                <span className="shrink-0 text-xs font-medium text-mountain-500">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              <ul className="mt-4 divide-y divide-cream-200 border-y border-cream-200">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3 py-3">
                    <div
                      aria-hidden="true"
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-cream-200 bg-cream-100"
                    >
                      <ProductImage
                        src={item.image}
                        alt=""
                        width={112}
                        height={112}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug text-mountain-900">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 break-words text-xs text-mountain-500">
                        {item.variantLabel} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-mountain-900">
                      {fmtPKR(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4 text-mountain-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmtPKR(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 text-mountain-600">
                  <span>Delivery</span>
                  <span className="tabular-nums">{fmtPKR(shippingFee)}</span>
                </div>
                <p className="text-xs leading-relaxed text-mountain-500" aria-live="polite">
                  {deliveryRate.zoneName
                    ? `${deliveryRate.zoneName} delivery · `
                    : 'Standard delivery · '}
                  Estimated in {deliveryRate.minDays}–{deliveryRate.maxDays} days after placing your
                  order.
                </p>
                <div className="flex items-baseline justify-between gap-4 border-t border-cream-300 pt-3">
                  <span className="text-base font-semibold text-mountain-900">Total</span>
                  <span className="font-display text-2xl font-bold tabular-nums text-apricot-700">
                    {fmtPKR(total)}
                  </span>
                </div>
              </div>

              {apiError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-relaxed text-red-700"
                >
                  {apiError}
                </div>
              )}
              {cartNotice && (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-800"
                >
                  {cartNotice}
                </div>
              )}
              {cartCheckError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-relaxed text-red-700"
                >
                  {cartCheckError}
                </div>
              )}

              <button
                id="checkout-submit-btn"
                type="submit"
                disabled={submitting || revalidating || cartIsChecking}
                aria-busy={submitting || revalidating || cartIsChecking}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-apricot-600 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-apricot-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-apricot-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-apricot-300"
              >
                {cartIsChecking || revalidating
                  ? 'Checking cart…'
                  : submitting
                    ? 'Placing order…'
                    : `Place order — ${fmtPKR(total)}`}
              </button>

              <p className="mt-3 text-center text-xs leading-relaxed text-mountain-500">
                By placing this order you agree to our return &amp; refund policy.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
