// ── Product Card ──────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { fmtPKR, thumbUrl } from '../../lib/utils';
import ProductImage from './ProductImage';

export default function ProductCard({ product }) {
  const lowestPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : null;

  const img = product.images?.[0]?.url
    ? thumbUrl(product.images[0].url, 500)
    : null;

  return (
    <Link
      to={`/products/${product.slug}`}
      id={`product-card-${product._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-100">
        {img && (
          <img
            src={img}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
          />
        )}

        <div className="absolute inset-0 p-4">
          <ProductImage
            src={img}
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
          <span className="shrink-0 whitespace-nowrap font-display text-base font-bold text-apricot-600 sm:text-lg">
            {lowestPrice !== null ? `From ${fmtPKR(lowestPrice)}` : 'N/A'}
          </span>
          <span className="min-w-0 truncate text-right text-[11px] text-mountain-500 sm:text-xs">
            {product.origin || ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
