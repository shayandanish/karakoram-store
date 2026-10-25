// ── Footer ────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { getCleanWhatsAppNumber } from '../../lib/utils';
import { REGIONS } from '../../lib/regions';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import SiteLogoMark from '../ui/SiteLogoMark';

const CURRENT_YEAR = new Date().getFullYear();

const FALLBACK_SHOP_LINKS = [
  { to: '/shop', label: 'All Products' },
  { to: '/shop?category=dry-fruits', label: 'Dry Fruits' },
  { to: '/shop?category=organic-oil', label: 'Organic Oil' },
  { to: '/shop?category=natural-herbs', label: 'Natural Herbs' },
  { to: '/shop?category=natural-honey', label: 'Natural Honey' },
  { to: '/shop?category=natural-butter', label: 'Natural Butter' },
  { to: '/shop?category=seasonal-fruits', label: 'Seasonal Fruits' },
  { to: '/shop?category=handicrafts', label: 'Handicrafts' },
  { to: '/shop?category=wallets-accessories', label: 'Wallets & Accessories' },
  { to: '/shop?category=caps-hats', label: 'Caps & Hats' },
  { to: '/shop?category=cultural-apparel', label: 'Cultural Apparel' },
  { to: '/shop?category=stone', label: 'Stone' },
];

const INFO_LINKS = [
  { to: '/about', label: 'Our Story' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/track-order', label: 'Track My Order' },
  { to: '/my-orders', label: 'My Orders' },
  { to: '/cart', label: 'Shopping Cart' },
  { to: '/checkout', label: 'Checkout' },
];

const REGION_LINKS = REGIONS.map(({ name, slug }) => ({
  to: `/shop?region=${slug}`,
  label: name,
}));

// Keep the footer categories in a familiar order while still reflecting the
// live category names/slugs from the admin panel.
const CATEGORY_ORDER = FALLBACK_SHOP_LINKS
  .map(({ to }) => to.split('category=')[1])
  .filter(Boolean);

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0 text-apricot-500" aria-hidden="true">
      <path d="M5.72 2.22a.75.75 0 011.06 0l5 5a.75.75 0 010 1.06l-5 5a.75.75 0 01-1.06-1.06L10.19 8 5.72 3.28a.75.75 0 010-1.06z" />
    </svg>
  );
}

function NavCol({ title, links }) {
  return (
    <div>
      <h3 className="text-cream-50 font-display font-semibold text-base mb-5 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-apricot-500 inline-block" aria-hidden="true" />
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              className="text-mountain-300 hover:text-apricot-300 text-sm transition-colors duration-150 flex items-center gap-2 group"
            >
              <ChevronIcon />
              <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const wa = getCleanWhatsAppNumber();
  const { logo } = useSiteSettings();
  const hasCustomLogo = Boolean(logo?.url);
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const sortedCategories = categories?.length
    ? [...categories].sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.slug);
        const bIndex = CATEGORY_ORDER.indexOf(b.slug);
        return (aIndex === -1 ? CATEGORY_ORDER.length : aIndex)
          - (bIndex === -1 ? CATEGORY_ORDER.length : bIndex);
      })
    : [];

  const shopLinks = sortedCategories.length
    ? [
        { to: '/shop', label: 'All Products' },
        ...sortedCategories.map((category) => ({
          to: `/shop?category=${category.slug}`,
          label: category.name,
        })),
      ]
    : FALLBACK_SHOP_LINKS;

  return (
    <footer className="bg-mountain-900 text-cream-100 mt-auto relative overflow-hidden">
      {/* Gradient top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-apricot-500/50 to-transparent" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">

        {/* ── Main grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-6 pb-12 border-b border-mountain-800/60">

          {/* Brand column – takes 2/6 on desktop */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-5">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 group" aria-label="Karakoram Store – Home">
              <SiteLogoMark
                size={hasCustomLogo ? '4xl' : '2xl'}
                maxWidthClass={hasCustomLogo ? 'max-w-[12rem]' : 'max-w-[10rem]'}
                shadowClass="shadow-lg"
                className="group-hover:scale-105 transition-transform duration-300"
              />
              <div>
                <div className="font-display font-bold text-xl text-cream-50 leading-tight group-hover:text-apricot-300 transition-colors">
                  Karakoram Store
                </div>
                <div className="text-[11px] text-mountain-400 font-medium tracking-widest uppercase">
                  Authentic · Gilgit-Baltistan · Pakistan
                </div>
              </div>
            </Link>

            <p className="text-mountain-300 text-sm leading-relaxed max-w-sm">
              The finest handcrafted dry fruits, herbs, oils, and handicrafts — sourced
              directly from the valleys of Gilgit-Baltistan. Every purchase
              supports local artisans and families.
            </p>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-emerald-400" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Authentic',
                  sub: '100% genuine',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-sky-400" aria-hidden="true">
                      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  ),
                  title: 'Rs. 200',
                  sub: 'Flat shipping',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-emerald-400" aria-hidden="true">
                      <rect x="5" y="2" width="14" height="20" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                  ),
                  title: 'Easypaisa',
                  sub: 'Direct transfer',
                },
              ].map(({ icon, title, sub }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center gap-1.5 bg-mountain-800/50 border border-mountain-700/40 rounded-xl px-2 py-2.5"
                >
                  {icon}
                  <div className="text-[11px] font-semibold text-cream-200">{title}</div>
                  <div className="text-[10px] text-mountain-400">{sub}</div>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent('Hello! I want to know more about Karakoram Store products.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat with Us on WhatsApp
              </a>
            )}
          </div>

          {/* Shop links */}
          <NavCol title="Shop" links={shopLinks} />

          {/* Region links */}
          <NavCol title="By Region" links={REGION_LINKS} />

          {/* Info links */}
          <NavCol title="Customer Care" links={INFO_LINKS} />

          {/* Contact column */}
          <div>
            <h3 className="text-cream-50 font-display font-semibold text-base mb-5 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-apricot-500 inline-block" aria-hidden="true" />
              Get in Touch
            </h3>
            <ul className="space-y-4 text-sm text-mountain-300">
              <li>
                <a
                  href="mailto:shayandanish2002@gmail.com"
                  className="flex items-start gap-2.5 hover:text-apricot-300 transition-colors group"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 shrink-0 text-apricot-400 mt-0.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="group-hover:underline underline-offset-2 break-all">
                    shayandanish2002@gmail.com
                  </span>
                </a>
              </li>
              {wa && (
                <li>
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 hover:text-apricot-300 transition-colors group"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 shrink-0 text-apricot-400 mt-0.5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="group-hover:underline underline-offset-2">+{wa}</span>
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 shrink-0 text-apricot-400 mt-0.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  Zero Point, Karimabad<br />
                  Sana Khan and Sons Market<br />
                  Gilgit-Baltistan, Pakistan
                </span>
              </li>
            </ul>

            {/* Find us map */}
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-apricot-400 uppercase tracking-wider mb-2">
                Find Us
              </p>
              <div className="rounded-xl overflow-hidden border border-mountain-700/60 bg-mountain-800/50 shadow-lg">
                <iframe
                  title="Karakoram Store location on map"
                  src="https://maps.google.com/maps?q=36.3191588,74.6664695&z=17&output=embed"
                  className="w-full h-44"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=36.3191588,74.6664695"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-apricot-300 hover:text-apricot-200 transition-colors"
              >
                Get directions
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────── */}
        <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-mountain-500 order-2 sm:order-1">
            © {CURRENT_YEAR} Karakoram Store. All rights reserved.
          </p>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <span className="text-xs text-mountain-500">Handcrafted with</span>
            <span className="text-apricot-400" aria-label="love">❤️</span>
            <span className="text-xs text-mountain-500">from the Karakoram Mountains</span>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="order-3 flex items-center gap-1.5 text-xs text-mountain-400 hover:text-apricot-300 transition-colors group"
            aria-label="Scroll back to top of page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
