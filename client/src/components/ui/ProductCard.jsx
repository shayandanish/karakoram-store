// ── Product Card ──────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtPKR, cloudinaryImage, cloudinarySrcSet, isCloudinaryUrl } from '../../lib/utils';
import { getVariantDiscount, getBestVariantDiscount } from '../../lib/discountUtils';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const LOW_STOCK_THRESHOLD = 5;

export default function ProductCard({ product }) {
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const imageCount = product.images?.length || 0;

  useEffect(() => {
    if (!isImageHovered || imageCount < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setImageIndex((currentIndex) => (currentIndex + 1) % imageCount);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [imageCount, isImageHovered]);

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

  const imageUrl = product.images?.[imageIndex]?.url || '';
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
    <div className="group relative flex h-full flex-col bg-white">
      <Link
        to={`/products/${product.slug}`}
        id={`product-card-${product._id}`}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2"
      >
        {/* Image */}
        <div
          className="relative aspect-square overflow-hidden bg-cream-100"
          onMouseEnter={() => setIsImageHovered(true)}
          onMouseLeave={() => {
            setIsImageHovered(false);
            setImageIndex(0);
          }}
        >
          {blurSrc && (
            <img
              src={blurSrc}
              alt=""
              width={640}
              height={640}
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

          <div className={`absolute inset-0 p-5 ${outOfStock ? 'opacity-50 grayscale' : ''}`}>
            <ProductImage
              key={imageUrl}
              src={img}
              srcSet={imgSrcSet}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              alt={product.images?.[imageIndex]?.alt || product.name}
              fit="contain"
              smartCrop
              width={640}
              height={640}
              className="transition-transform !duration-100 group-hover:scale-[1.03]"
            />
          </div>

          {product.isFeatured && (
            <span className="absolute left-2 top-2 bg-mountain-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              Featured
            </span>
          )}
          {bestBadge.hasDiscount && (
            <span
              className={`absolute left-2 bg-apricot-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white ${
                product.isFeatured ? 'top-9' : 'top-2'
              }`}
            >
              {bestBadge.badge}
            </span>
          )}
          {product.isSeasonal && !outOfStock && (
            <span className="absolute bottom-2 left-2 border border-cream-300 bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mountain-700">
              Seasonal
            </span>
          )}

          {outOfStock && (
            <span className="absolute inset-x-0 bottom-0 border-t border-cream-300 bg-white/95 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-mountain-700">
              Out of stock
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col items-center px-1 pb-1 pt-4 text-center">
          {product.category?.name && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-apricot-600">
              {product.category.name}
            </p>
          )}
          <h3 className="mt-1.5 line-clamp-2 font-display text-[15px] leading-snug text-mountain-900">
            {product.name}
          </h3>
          {product.artisan?.name && (
            <p className="mt-1 text-[11px] text-mountain-500">by {product.artisan.name}</p>
          )}

          {lowStock && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              Only {totalStock} left
            </p>
          )}

          <div className="mt-3 flex flex-col items-center">
            <span className="text-sm font-semibold text-mountain-900">
              {displayPrice !== null ? `From ${fmtPKR(displayPrice)}` : 'N/A'}
            </span>
            {cheapest?.originalPrice && (
              <span className="mt-0.5 text-[11px] leading-none text-mountain-400 line-through">
                {fmtPKR(cheapest.originalPrice)}
              </span>
            )}
            {variantCount > 1 && (
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-mountain-400">
                {variantCount} options
              </span>
            )}
          </div>

          {product.origin && (
            <p className="mt-2 text-[11px] text-mountain-500">{product.origin}</p>
          )}
        </div>
      </Link>

      {/* Sits outside the <Link> so the markup stays valid and keyboard-friendly */}
      <WishlistButton product={product} className="absolute right-2 top-2 z-20" />
    </div>
  );
}
