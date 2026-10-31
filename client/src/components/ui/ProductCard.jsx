// ── Product Card ──────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { fmtPKR, cloudinaryImage, cloudinarySrcSet, isCloudinaryUrl } from '../../lib/utils';
import { getVariantDiscount, getBestVariantDiscount } from '../../lib/discountUtils';
import ProductImage from './ProductImage';

export default function ProductCard({ product }) {
  const variants = product.variants || [];
  const variantDiscounts = variants.map((v) => {
    const d = getVariantDiscount(v);
    return {
      effectivePrice: d.hasDiscount ? d.salePrice : Number(v.price),
      originalPrice: d.hasDiscount ? d.originalPrice : null,
      discount: d,
    };
  });

  const cheapest = variantDiscounts.length > 0
    ? variantDiscounts.sort((a, b) => a.effectivePrice - b.effectivePrice)[0]
    : null;

  const displayPrice = cheapest ? cheapest.effectivePrice : null;
  const bestBadge = getBestVariantDiscount(variants);

  const imageUrl = product.images?.[0]?.url || '';
  const img = imageUrl
    ? cloudinaryImage(imageUrl, {
        width: 640,
        crop: 'limit',
        quality: 'auto:eco',
        format: 'auto',
      })
    : null;
  const imgSrcSet = cloudinarySrcSet(imageUrl, [240, 360, 480, 640, 800], {
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto',
  });
  const blurSrc = isCloudinaryUrl(imageUrl)
    ? cloudinaryImage(imageUrl, {
        width: 64,
        crop: 'limit',
        quality: 'auto:low',
        format: 'auto',
        blur: 1200,
      })
    : null;

  return (
    <Link
      to={`/products/${product.slug}`}
      id={`product-card-${product._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-100">
        {blurSrc && (
          <img
            src={blurSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            fetchPriority="low"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
          />
        )}

        <div className="absolute inset-0 p-4">
          <ProductImage
            src={img}
            srcSet={imgSrcSet}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            alt={product.images?.[0]?.alt || product.name}
            fit="contain"
            smartCrop
            className="group-hover:scale-105"
          />
        </div>

        {product.isFeatured && (
          <span className="absolute top-3 left-3 bg-apricot-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            Featured
          </span>
        )}
        {product.isSeasonal && (
          <span className="absolute top-3 right-3 bg-mountain-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            Seasonal
          </span>
        )}
        {bestBadge.hasDiscount && !product.isFeatured && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            🔖 {bestBadge.badge}
          </span>
        )}
        {bestBadge.hasDiscount && product.isFeatured && (
          <span className="absolute top-10 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            🔖 {bestBadge.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-apricot-600 font-medium uppercase tracking-wide mb-1">
          {product.category?.name || ''}
        </p>
        <h3 className="font-display font-semibold text-mountain-900 text-base leading-snug mb-1 line-clamp-2">
          {product.name}
        </h3>
        {product.artisan?.name && (
          <p className="text-xs text-mountain-500 mb-2">by {product.artisan.name}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-cream-200 pt-3">
          <span className="shrink-0 whitespace-nowrap">
            <span className="font-display text-base font-bold text-apricot-600 sm:text-lg">
              {displayPrice !== null ? `From ${fmtPKR(displayPrice)}` : 'N/A'}
            </span>
            {cheapest?.originalPrice && (
              <span className="block text-[11px] text-mountain-400 line-through leading-none">
                {fmtPKR(cheapest.originalPrice)}
              </span>
            )}
          </span>
          <span className="min-w-0 truncate text-right text-[11px] text-mountain-500 sm:text-xs">
            {product.origin || ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
