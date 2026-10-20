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
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-52">
        <ProductImage
          src={img}
          alt={product.images?.[0]?.alt || product.name}
          className="group-hover:scale-105 transition-transform duration-500"
        />
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
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-cream-200">
          <span className="font-display text-apricot-600 font-bold text-lg">
            {lowestPrice !== null ? `From ${fmtPKR(lowestPrice)}` : 'N/A'}
          </span>
          <span className="text-xs text-mountain-500">
            {product.origin || ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
