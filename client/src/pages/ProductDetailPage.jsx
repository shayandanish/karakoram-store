// ── Product Detail Page ───────────────────────────────────────
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useCart } from '../context/CartContext';
import { fmtPKR, buildProductWhatsAppLink, cloudinaryImage, cloudinarySrcSet } from '../lib/utils';
import ProductImage from '../components/ui/ProductImage';
import { SkeletonDetail } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';

function StarRating({ avg, count }) {

  const full = Math.round(avg);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-label={`Rating: ${avg} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < full ? 'text-apricot-400' : 'text-cream-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-mountain-500">{avg > 0 ? `${avg.toFixed(1)} (${count})` : 'No ratings yet'}</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data),
  });

  // Derive selected variant after load
  const variant = selectedVariant || product?.variants?.[0] || null;

  const handleAddToCart = () => {
    if (!product || !variant) return;
    addToCart(product, variant, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const cartItem = items.find(
    (i) => i.productId === product?._id && i.variantLabel === variant?.label
  );

  const waLink = buildProductWhatsAppLink(product, variant, quantity);

  const activeImage = product?.images?.[activeImg];
  const mainImageUrl = activeImage?.url || '';
  const mainImageSrc = cloudinaryImage(mainImageUrl, {
    width: 1200,
    crop: 'limit',
    quality: 'auto:good',
    format: 'auto',
  });
  const mainImageSrcSet = cloudinarySrcSet(mainImageUrl, [480, 800, 1200, 1600], {
    crop: 'limit',
    quality: 'auto:good',
    format: 'auto',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO
        title={product ? product.name : 'Loading Product…'}
        description={
          product?.description
            ? product.description.slice(0, 160)
            : 'Authentic handcrafted goods and organic food from Hunza, Gilgit-Baltistan.'
        }
        image={
          cloudinaryImage(product?.images?.[0]?.url, {
            width: 1200,
            height: 630,
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto',
            format: 'auto',
          }) || '/favicon.svg'
        }
        type="product"
        productData={{
          price: variant?.price || 0,
          availability: variant && variant.stock > 0 ? 'instock' : 'outofstock',
        }}
      />

      {/* Back to Shop Navigation Button */}
      <div className="mb-5">
        <button
          type="button"
          id="product-back-btn"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Products</span>
        </button>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-mountain-500 mb-8" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-apricot-500 transition-colors">Home</Link>
        <span aria-hidden="true">›</span>
        <Link to="/shop" className="hover:text-apricot-500 transition-colors">Shop</Link>
        {product?.category && (
          <>
            <span aria-hidden="true">›</span>
            <Link
              to={`/shop?category=${product.category._id}`}
              className="hover:text-apricot-500 transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">›</span>
        <span className="text-mountain-700 font-medium truncate max-w-[180px]">
          {product?.name || '…'}
        </span>
      </nav>

      {isLoading && <SkeletonDetail />}

      {error && <ErrorState message={error.message} onRetry={refetch} />}

      {!isLoading && !error && product && (
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cream-200">
              <ProductImage
                src={mainImageSrc}
                srcSet={mainImageSrcSet}
                sizes="(min-width: 1024px) 560px, (min-width: 768px) 45vw, 100vw"
                alt={activeImage?.alt || product.name}
                fit="contain"
                smartCrop
                loading="eager"
                fetchPriority="high"
              />
              {product.isFeatured && (
                <span className="absolute top-4 left-4 bg-apricot-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Featured
                </span>
              )}
            </div>
            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    id={`thumb-${idx}`}
                    onClick={() => setActiveImg(idx)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                      idx === activeImg ? 'border-apricot-500' : 'border-transparent hover:border-apricot-300'
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <ProductImage
                      src={cloudinaryImage(img.url, {
                        width: 160,
                        height: 160,
                        crop: 'fill',
                        gravity: 'auto',
                        quality: 'auto:eco',
                        format: 'auto',
                      })}
                      sizes="64px"
                      alt={img.alt || product.name}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-5">
            <div>
              <Link
                to={`/shop?category=${product.category?._id}`}
                className="text-xs text-apricot-600 font-semibold uppercase tracking-widest hover:text-apricot-700"
              >
                {product.category?.name}
              </Link>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-mountain-900 mt-2 leading-snug">
                {product.name}
              </h1>
              {product.artisan?.name && (
                <p className="text-sm text-mountain-500 mt-1">
                  by <span className="font-medium text-mountain-700">{product.artisan.name}</span>
                  {product.artisan.village ? `, ${product.artisan.village}` : ''}
                </p>
              )}
              <div className="mt-2">
                <StarRating avg={product.ratingAverage} count={product.ratingCount} />
              </div>
            </div>

            {/* Price */}
            <div className="text-3xl font-display font-bold text-apricot-600">
              {variant ? fmtPKR(variant.price) : 'N/A'}
            </div>

            {/* Description */}
            <p className="text-mountain-600 text-sm leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>

            {/* Variant selector */}
            {product.variants?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-mountain-700 mb-2">
                  Size / Variant
                  {variant && (
                    <span className="text-apricot-500 font-normal ml-2">— {variant.label}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const outOfStock = v.stock <= 0;
                    const isSelected = variant?.label === v.label;
                    return (
                      <button
                        key={v.label}
                        id={`variant-${v.label.replace(/\s+/g, '-')}`}
                        onClick={() => !outOfStock && setSelectedVariant(v)}
                        disabled={outOfStock}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          isSelected
                            ? 'border-apricot-500 bg-apricot-50 text-apricot-700'
                            : outOfStock
                            ? 'border-cream-300 bg-cream-100 text-mountain-400 cursor-not-allowed line-through'
                            : 'border-cream-300 text-mountain-700 hover:border-apricot-300 hover:bg-apricot-50'
                        }`}
                      >
                        {v.label}
                        {outOfStock && ' (Out)'}
                      </button>
                    );
                  })}
                </div>
                {variant && (
                  <p className="mt-1 text-xs text-mountain-400">
                    {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-mountain-700">Qty</span>
              <div className="flex items-center border border-cream-300 rounded-xl overflow-hidden">
                <button
                  id="qty-decrement"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-2.5 text-mountain-600 hover:bg-cream-100 transition-colors font-bold"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span
                  id="qty-display"
                  className="px-5 py-2.5 text-sm font-semibold text-mountain-900 border-x border-cream-300 min-w-[48px] text-center"
                >
                  {quantity}
                </span>
                <button
                  id="qty-increment"
                  onClick={() => setQuantity((q) => Math.min(variant?.stock || 99, q + 1))}
                  className="px-4 py-2.5 text-mountain-600 hover:bg-cream-100 transition-colors font-bold"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!variant || variant.stock <= 0}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  added
                    ? 'bg-green-500 text-white'
                    : !variant || variant.stock <= 0
                    ? 'bg-cream-300 text-mountain-400 cursor-not-allowed'
                    : 'bg-apricot-500 hover:bg-apricot-600 text-white hover:shadow-lg hover:shadow-apricot-500/30 hover:-translate-y-0.5'
                }`}
              >
                {added ? '✓ Added to Cart!' : variant?.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <a
                href={waLink}
                id="whatsapp-order-btn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 flex-1 py-3.5 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-green-600/30 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Order on WhatsApp
              </a>
            </div>

            {/* If already in cart */}
            {cartItem && (
              <p className="text-xs text-mountain-500 text-center">
                You have {cartItem.quantity} of this in your cart.{' '}
                <Link to="/cart" className="text-apricot-600 underline">View cart</Link>
              </p>
            )}

            {/* Meta */}
            <div className="border-t border-cream-200 pt-4 space-y-1.5 text-xs text-mountain-500">
              {product.origin && <p>📍 Origin: <span className="text-mountain-700">{product.origin}</span></p>}
              {product.isSeasonal && <p>🌿 <span className="text-mountain-700">Seasonal product – limited availability</span></p>}
            </div>

            {/* Artisan story */}
            {product.artisan?.story && (
              <div className="bg-cream-100 border border-cream-200 rounded-xl p-4">
                <h3 className="font-display font-semibold text-mountain-800 mb-2 text-sm">About the Artisan</h3>
                <p className="text-xs text-mountain-600 leading-relaxed">{product.artisan.story}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
