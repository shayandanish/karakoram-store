import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fmtPKR } from '../lib/utils';
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
    notes: '',
    couponCode: '',
  });

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
    if (form.guestPhone.length < 7) e.guestPhone = 'Enter a valid phone number';
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
      paymentMethod: 'COD',
      couponCode: form.couponCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      const { data } = await api.post('/orders', payload);
      clearCart();
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
        title="Checkout – Cash on Delivery"
        description="Fast guest checkout with nationwide Cash on Delivery. Order authentic handcrafted goods directly from Hunza."
      />
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

                <Field id="field-phone" label="Phone Number" required error={errors.guestPhone} hint="WhatsApp/call number">
                  <input
                    id="field-phone"
                    type="tel"
                    value={form.guestPhone}
                    onChange={set('guestPhone')}
                    placeholder="+92 3XX XXXXXXX"
                    className={inputClass}
                    autoComplete="tel"
                  />
                </Field>

                <Field id="field-email" label="Email (optional)" error={errors.guestEmail}>
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
                <span className="w-7 h-7 bg-apricot-100 text-apricot-600 rounded-full text-sm font-bold flex items-center justify-center">4</span>
                Payment Method
              </h2>
              <label className="flex items-start gap-3 cursor-pointer bg-apricot-50 border-2 border-apricot-400 rounded-xl p-4">
                <input type="radio" name="payment" defaultChecked className="accent-apricot-500 mt-0.5" readOnly />
                <div>
                  <p className="font-semibold text-mountain-900 text-sm">Cash on Delivery (COD)</p>
                  <p className="text-xs text-mountain-500 mt-0.5">Pay in cash when your order arrives. No advance required.</p>
                </div>
              </label>
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
                  <span>Shipping (COD)</span>
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
