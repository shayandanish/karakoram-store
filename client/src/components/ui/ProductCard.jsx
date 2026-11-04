// ── Product Card ──────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { fmtPKR, cloudinaryImage, cloudinarySrcSet, isCloudinaryUrl } from '../../lib/utils';
import { getVariantDiscount, getBestVariantDiscount } from '../../lib/discountUtils';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const LOW_STOCK_THRESHOLD = 5;

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
    ? [...variantDiscounts].sort((a, b) => a.effectivePrice - b.effectivePrice)[0]
    : null;

  const displayPrice = cheapest ? cheapest.effectivePrice : null;
  const bestBadge = getBestVariantDiscount(variants);

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const outOfStock = variants.length > 0 && totalStock <= 0;
  const lowStock = !outOfStock && totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD;
  const variantCount = variants.length;

  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const imageUrl = primaryImage?.url || '';
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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-2 focus-within:ring-apricot-400">
      <Link
        to={`/products/${product.slug}`}
        id={`product-card-${product._id}`}
        className="flex h-full flex-col rounded-2xl focus-visible:outline-none"
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-cream-100">
          {blurSrc && (
            <img
              src={blurSrc}
              alt=""
              width={640}
              height={800}
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

          <div className={`absolute inset-0 p-4 ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
            <ProductImage
              src={img}
              srcSet={imgSrcSet}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              alt={primaryImage?.alt || product.name}
              fit="contain"
              smartCrop
              className="group-hover:scale-105"
            />
          </div>

          {product.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-apricot-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
              Featured
            </span>
          )}
          {product.isSeasonal && !outOfStock && (
            <span className="absolute bottom-3 left-3 rounded-full bg-mountain-600/95 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
              Seasonal
            </span>
          )}
          {bestBadge.hasDiscount && (
            <span
              className={`absolute left-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow ${
                product.isFeatured ? 'top-10' : 'top-3'
              }`}
            >
              🔖 {bestBadge.badge}
            </span>
          )}

          {outOfStock && (
            <span className="absolute inset-x-3 bottom-3 rounded-lg bg-mountain-900/85 py-1.5 text-center text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
              Out of stock
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-apricot-600">
              {product.category?.name || ''}
            </p>
            {variantCount > 1 && (
              <span className="shrink-0 rounded-full bg-cream-100 px-2 py-0.5 text-[10px] font-semibold text-mountain-600">
                {variantCount} options
              </span>
            )}
          </div>
          <h3 className="mb-1 line-clamp-2 font-display text-base font-semibold leading-snug text-mountain-900">
            {product.name}
          </h3>
          {product.artisan?.name && (
            <p className="mb-2 text-xs text-mountain-500">by {product.artisan.name}</p>
          )}

          {lowStock && (
            <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              Only {totalStock} left
            </p>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 border-t border-cream-200 pt-3">
            <span className="shrink-0 whitespace-nowrap">
              <span className="font-display text-base font-bold text-apricot-600 sm:text-lg">
                {displayPrice !== null ? `From ${fmtPKR(displayPrice)}` : 'N/A'}
              </span>
              {cheapest?.originalPrice && (
                <span className="block text-[11px] leading-none text-mountain-400 line-through">
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

      {/* Sits outside the <Link> so the markup stays valid and keyboard-friendly */}
      <WishlistButton product={product} className="absolute right-3 top-3 z-20" />
    </div>
  );
}
