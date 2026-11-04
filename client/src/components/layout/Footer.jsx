// ── Footer ────────────────────────────────────────────────────
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCleanWhatsAppNumber } from '../../lib/utils';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const CURRENT_YEAR = new Date().getFullYear();

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Our Collection' },
  { to: '/about', label: 'Our Story' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/shop', label: 'Search Products' },
  { to: '/track-order', label: 'Track an Order' },
];

export default function Footer() {
  const { settings } = useSiteSettings();
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const wa = getCleanWhatsAppNumber(settings.whatsappNumber);
  const footerCopy = settings.pageContent.footer;

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!settings.contactEmail || !subscriberEmail.trim()) return;

    const subject = encodeURIComponent(`Email updates for ${settings.storeName}`);
    const body = encodeURIComponent(`Please add ${subscriberEmail.trim()} to the ${settings.storeName} email list.`);
    window.location.href = `mailto:${settings.contactEmail}?subject=${subject}&body=${body}`;
  };

  const linkClass =
    'inline-flex rounded-sm text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

  return (
    <footer className="mt-auto bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 sm:pt-16 lg:px-10">
        <div className="grid grid-cols-1 gap-10 border-b border-white/15 pb-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-14 lg:pb-12">
          <section aria-labelledby="footer-quick-links">
            <h2 id="footer-quick-links" className="mb-5 font-display text-lg font-medium text-white">
              Quick links
            </h2>
            <ul className="space-y-3">
              {QUICK_LINKS.map(({ to, label }) => (
                <li key={label}>
                  <Link to={to} className={linkClass}>{label}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="footer-questions">
            <h2 id="footer-questions" className="mb-4 font-display text-lg font-medium text-white">
              Questions?
            </h2>
            <p className="mb-5 max-w-sm text-sm leading-6 text-white/65">
              {footerCopy.intro}
            </p>
            <address className="space-y-3 text-sm not-italic text-white/75">
              {settings.contactPhone && (
                <p>
                  <a className={linkClass} href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>
                </p>
              )}
              {wa && (
                <p>
                  <a className={linkClass} href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp: +{wa}
                  </a>
                </p>
              )}
              {settings.contactEmail && (
                <p>
                  <a className={linkClass} href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
                </p>
              )}
              <p className="leading-6 text-white/65">
                {footerCopy.mapUrl ? <a href={footerCopy.mapUrl} target="_blank" rel="noopener noreferrer" className="whitespace-pre-line underline decoration-white/30 underline-offset-4 hover:text-white">{footerCopy.location}</a> : <span className="whitespace-pre-line">{footerCopy.location}</span>}
              </p>
            </address>
          </section>

          <section aria-labelledby="footer-subscribe">
            <h2 id="footer-subscribe" className="mb-4 font-display text-lg font-medium text-white">
              Subscribe to our emails
            </h2>
            <p className="mb-5 max-w-sm text-sm leading-6 text-white/65">
              {footerCopy.newsletterText}
            </p>
            <form onSubmit={handleSubscribe} className="flex max-w-md gap-2">
              <label className="sr-only" htmlFor="footer-email">Email address</label>
              <input
                id="footer-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={subscriberEmail}
                onChange={(event) => setSubscriberEmail(event.target.value)}
                placeholder="Email address"
                className="min-w-0 flex-1 rounded-none border border-white/35 bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                type="submit"
                className="shrink-0 border border-white bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Join
              </button>
            </form>
            <p className="mt-3 text-xs leading-5 text-white/45">
              Submitting opens an email draft to our contact address.
            </p>
            {footerCopy.socialLinks?.length > 0 && (
              <nav aria-label="Social media" className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {footerCopy.socialLinks.map((social) => (
                  <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {social.label}
                  </a>
                ))}
              </nav>
            )}
          </section>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-white/55">
            © {CURRENT_YEAR} {settings.storeName}. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-sm text-xs text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
