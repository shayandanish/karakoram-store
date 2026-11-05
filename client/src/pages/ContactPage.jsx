// ── Contact Page ───────────────────────────────────────────────
import { useState } from 'react';
import api from '../lib/axios';
import { getCleanWhatsAppNumber } from '../lib/utils';
import { validatePhoneNumber, COUNTRY_CODES } from '../lib/phoneUtils';
import SEO from '../components/ui/SEO';
import { useSiteSettings } from '../hooks/useSiteSettings';

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const wa = getCleanWhatsAppNumber(settings.whatsappNumber);
  const pageCopy = settings.pageContent.contact;
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dialCode, setDialCode] = useState('+92');

  const selectedCountry = COUNTRY_CODES.find((country) => country.code === dialCode) ?? COUNTRY_CODES[0];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setPhoneError('');

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setFormError('Please complete your name, email, and message.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (form.phone.trim()) {
      const { valid, error } = validatePhoneNumber(form.phone.trim(), dialCode);
      if (!valid) {
        setPhoneError(error);
        return;
      }
    }

    const whatsAppUrl = wa ? (() => {
      const message =
        `*Customer Inquiry - ${settings.storeName}*\n\n` +
        `• Name: ${form.name.trim()}\n` +
        `• Email: ${form.email.trim()}\n` +
        `• Phone: ${form.phone.trim() ? `${dialCode} ${form.phone.trim()}` : 'Not provided'}\n` +
        `• Message: ${form.message.trim()}`;
      return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
    })() : '';
    const whatsAppWindow = whatsAppUrl ? window.open('about:blank', '_blank') : null;
    setSubmitting(true);
    try {
      await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() ? `${dialCode} ${form.phone.trim()}` : '',
        message: form.message.trim(),
      });
      setSent(true);
      if (whatsAppWindow && !whatsAppWindow.closed) whatsAppWindow.location.href = whatsAppUrl;
    } catch (error) {
      if (whatsAppWindow && !whatsAppWindow.closed) whatsAppWindow.close();
      setFormError(error?.response?.data?.message || 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-none border border-cream-300 bg-white px-4 py-3 text-sm text-mountain-900 placeholder:text-mountain-400 focus:border-apricot-500 focus:outline-none focus:ring-2 focus:ring-apricot-500/20';
  const labelClass = 'mb-2 block text-sm font-medium text-mountain-800';

  return (
    <div className="min-h-[60vh] bg-cream-100 py-12 sm:py-16">
      <SEO
        title={pageCopy.seoTitle}
        description={pageCopy.seoDescription}
        canonicalUrl="/contact"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-apricot-600">
            We’re here to help
          </p>
          <h1 className="font-display text-3xl font-medium leading-tight text-mountain-900 sm:text-4xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-mountain-600 sm:text-base">
            {pageCopy.intro}
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)] lg:gap-16">
          <section aria-labelledby="contact-form-heading">
            <h2 id="contact-form-heading" className="mb-2 font-display text-xl font-medium text-mountain-900">
              Leave us a message
            </h2>
            <p className="mb-7 text-sm text-mountain-500">
              Fill in the form below and we’ll reply using the contact details you provide.
            </p>

            {sent && (
              <div className="mb-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
                Your message has been sent to our team. {wa ? 'A WhatsApp draft is also ready if you want to send it there.' : ''}
              </div>
            )}

            {formError && (
              <p className="mb-4 text-sm text-red-700" role="alert">{formError}</p>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className={labelClass}>Name *</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className={labelClass}>Email *</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-phone" className={labelClass}>Phone number</label>
                <div className="flex gap-2">
                  <select
                    id="contact-dial-code"
                    value={dialCode}
                    onChange={(event) => {
                      setDialCode(event.target.value);
                      setPhoneError('');
                    }}
                    className="w-24 shrink-0 rounded-none border border-cream-300 bg-white px-2 py-3 text-sm text-mountain-800 focus:outline-none focus:ring-2 focus:ring-apricot-500/30 sm:w-32"
                    aria-label="Country calling code"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.code} value={country.code}>{country.flag} {country.code}</option>
                    ))}
                  </select>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, phone: event.target.value }));
                      setPhoneError('');
                    }}
                    placeholder={selectedCountry.example}
                    className={inputClass}
                  />
                </div>
                {phoneError && <p className="mt-1 text-xs text-red-700" role="alert">{phoneError}</p>}
              </div>

              <div>
                <label htmlFor="contact-message" className={labelClass}>Comment *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="How can we help?"
                  className={`${inputClass} resize-y`}
                />
              </div>

              <button
                id="contact-submit-btn"
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-12 items-center justify-center border border-mountain-900 bg-mountain-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-mountain-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </form>
          </section>

          <aside className="border-t border-cream-300 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <h2 className="font-display text-xl font-medium text-mountain-900">Questions?</h2>
            <p className="mt-3 text-sm leading-6 text-mountain-600">
              {pageCopy.responseText}
            </p>
            <address className="mt-7 space-y-5 text-sm not-italic">
              {settings.contactPhone && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-mountain-500">Phone</p>
                  <a href={`tel:${settings.contactPhone}`} className="text-mountain-900 underline decoration-cream-400 underline-offset-4 hover:text-apricot-700">
                    {settings.contactPhone}
                  </a>
                </div>
              )}
              {settings.contactEmail && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-mountain-500">Email</p>
                  <a href={`mailto:${settings.contactEmail}`} className="break-all text-mountain-900 underline decoration-cream-400 underline-offset-4 hover:text-apricot-700">
                    {settings.contactEmail}
                  </a>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-mountain-500">Location</p>
                <p className="leading-6 text-mountain-700">
                  {settings.pageContent.footer.mapUrl ? <a href={settings.pageContent.footer.mapUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-cream-400 underline-offset-4 hover:text-apricot-700">{settings.pageContent.footer.location} · View map</a> : settings.pageContent.footer.location}
                </p>
              </div>
            </address>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex min-h-11 items-center justify-center border border-cream-400 px-5 py-2.5 text-sm font-semibold text-mountain-900 transition-colors hover:border-mountain-900 hover:bg-mountain-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2"
              >
                Chat on WhatsApp
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
