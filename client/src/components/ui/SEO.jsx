// ── SEO Component: updates page titles, meta descriptions, and Open Graph tags ──
import { useEffect } from 'react';

const DEFAULT_TITLE = 'Karakoram Store – Authentic Gifts from the Himalayas';
const DEFAULT_DESC =
  'Shop authentic handcrafted goods from Hunza, Gilgit-Baltistan. Pure dried fruits, organic honey, Pakol caps, and artisan crafts straight from the Karakoram mountains.';
const DEFAULT_IMAGE = '/favicon.svg';

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  type = 'website',
  productData = null,
}) {
  useEffect(() => {
    // 1. Page title
    const fullTitle = title ? `${title} | Karakoram Store` : DEFAULT_TITLE;
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

    // 2. Standard Meta
    setMeta('name', 'description', description);

    // 3. Open Graph Tags
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', window.location.href);

    // Convert relative image to absolute URL if possible
    const absoluteImage = image.startsWith('http')
      ? image
      : `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}`;
    setMeta('property', 'og:image', absoluteImage);
    setMeta('property', 'og:site_name', 'Karakoram Store');

    // 4. Product Specific OG Tags
    if (type === 'product' && productData) {
      if (productData.price) {
        setMeta('property', 'product:price:amount', String(productData.price));
        setMeta('property', 'product:price:currency', 'PKR');
      }
      if (productData.availability) {
        setMeta('property', 'product:availability', productData.availability);
      }
    }

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', absoluteImage);
  }, [title, description, image, type, productData]);

  return null;
}
