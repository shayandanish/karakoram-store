// ── SEO Component: updates page titles, meta descriptions, Open Graph,
// canonical URLs, and Twitter card tags ────────────────────────────────
import { useEffect } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const DEFAULT_IMAGE = '/favicon.svg';

export default function SEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = 'website',
  productData = null,
  canonicalUrl = null,
}) {
  const { settings } = useSiteSettings();
  useEffect(() => {
    // 1. Page title
    const fullTitle = title ? `${title} | ${settings.storeName}` : settings.storeName;
    const pageDescription = description || settings.storeDescription;
    document.title = fullTitle;

    // Helper to create or update meta tag
    const setMeta = (attrName, attrVal, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to create or update link tag (e.g. canonical)
    const setLink = (rel, href) => {
      if (!href) return;
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Standard Meta
    setMeta('name', 'description', pageDescription);

    // 3. Canonical URL
    setLink('canonical', canonicalUrl || window.location.href.split('?')[0]);

    // 4. Open Graph Tags
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', pageDescription);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', window.location.href);

    // Convert relative image to absolute URL if possible
    const absoluteImage = image.startsWith('http')
      ? image
      : `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}`;
    setMeta('property', 'og:image', absoluteImage);
    setMeta('property', 'og:site_name', settings.storeName);

    // 5. Product Specific OG Tags
    if (type === 'product' && productData) {
      if (productData.price) {
        setMeta('property', 'product:price:amount', String(productData.price));
        setMeta('property', 'product:price:currency', 'PKR');
      }
      if (productData.availability) {
        setMeta('property', 'product:availability', productData.availability);
      }
    }

    // 6. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', pageDescription);
    setMeta('name', 'twitter:image', absoluteImage);
  }, [title, description, image, type, productData, canonicalUrl, settings.storeName, settings.storeDescription]);

  return null;
}
