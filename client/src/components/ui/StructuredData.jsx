// ── Structured Data (JSON-LD) for SEO ─────────────────────────────────────
// Outputs search-engine-friendly structured data (Product, Organization,
// BreadcrumbList, Offer) so Google can show rich results (price, stock,
// ratings, breadcrumbs) in search listings.

import { useEffect } from 'react';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const ld = (data) => ({
  '@context': 'https://schema.org',
  ...data,
});

/**
 * Renders JSON-LD <script type="application/ld+json"> tags.
 * Accepts an array of objects; each becomes one <script> block.
 *
 * Example:
 *   <StructuredData data={[productLD, organizationLD, breadcrumbLD]} />
 *
 * @param {Array} data - Array of JSON-LD objects (or a single object).
 * @returns {null}
 */
export default function StructuredData({ data }) {
  const items = Array.isArray(data) ? data : data ? [data] : [];

  useEffect(() => {
    // Remove any previously injected structured data from this component
    document.querySelectorAll('script[data-ld-json]').forEach((el) => el.remove());

    items.forEach((item) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-ld-json', 'true');
      script.textContent = JSON.stringify(item);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll('script[data-ld-json]').forEach((el) => el.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  return null;
}

/* ─────────────────────────────────────────────────────────────────────
   Helper builders ───────────────────────────────────────────────────── */

/**
 * Organization schema — site identity for knowledge panel & sitelinks.
 */
export const buildOrganizationLD = (contactPhone, siteName) =>
  ld({
    '@type': 'Organization',
    name: siteName,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: [],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Zero Point, Karimabad',
      addressLocality: 'Hunza',
      addressRegion: 'Gilgit-Baltistan',
      addressCountry: 'PK',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: contactPhone,
      contactType: 'customer service',
      availableLanguage: ['en', 'ur'],
    },
  });

/**
 * BreadcrumbList schema — helps Google show breadcrumb rich results.
 * @param {Array<{name: string, url: string}>} items - Breadcrumb items.
 */
export const buildBreadcrumbLD = (items = []) =>
  ld({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined,
    })),
  });

/**
 * Product schema — rich results for price, stock, brand, SKU, images.
 * @param {Object} p - Product object from the API.
 * @param {Object} v - Selected variant (optional).
 */
export const buildProductLD = (p, v, siteName) => {
  if (!p) return null;

  const selectedVariant = v || (p.variants && p.variants.length > 0 ? p.variants[0] : null);
  const price = selectedVariant?.price ?? p.variants?.[0]?.price ?? 0;
  const stock = selectedVariant?.stock ?? p.variants?.[0]?.stock ?? 0;
  const discountPercent = selectedVariant?.discountPercent ?? null;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? null;

  const salePrice =
    discountPercent && discountPercent > 0
      ? Math.max(1, Math.round(price * (1 - discountPercent / 100)))
      : compareAtPrice && compareAtPrice > price
        ? price
        : null;

  const images = (p.images || [])
    .map((img) => img.url)
    .filter(Boolean)
    .slice(0, 5)
    .map((url) => (url.startsWith('http') ? url : `${SITE_URL}${url}`));

  return ld({
    '@type': 'Product',
    name: p.name,
    description: p.description || '',
    url: `${SITE_URL}/products/${p.slug}`,
    image: images.length > 0 ? images : [SITE_URL + '/favicon.svg'],
    brand: {
      '@type': 'Brand',
      name: siteName,
    },
    sku: p._id || '',
    mpn: p.slug || '',
    category: p.category?.name || p.origin || 'Hunza Valley Products',
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${p.slug}`,
      priceCurrency: 'PKR',
      price: String(price),
      priceValidUntil: undefined,
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: siteName,
      },
      ...(salePrice
        ? {
            price: String(salePrice),
            priceValidUntil: undefined,
          }
        : {}),
      ...(compareAtPrice && compareAtPrice > price
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              priceCurrency: 'PKR',
              price: String(compareAtPrice),
              priceType: 'https://schema.org/ListPrice',
            },
          }
        : {}),
    },
    ...(p.ratingAverage && p.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(p.ratingAverage),
            reviewCount: String(p.ratingCount),
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    ...(p.isFeatured ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'Featured', value: 'true' }] } : {}),
    ...(p.isSeasonal ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'Seasonal', value: 'true' }] } : {}),
  });
};

/**
 * Website schema — site search box & sitelinks search box support.
 */
export const buildWebsiteLD = (siteName) =>
  ld({
    '@type': 'WebSite',
    name: siteName,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });
