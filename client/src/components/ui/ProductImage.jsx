// ── ProductImage – shows a styled, artistic mountain placeholder if no image ─────
import { useState } from 'react';

export default function ProductImage({
  src,
  alt,
  className = '',
  fit = 'cover',
  smartCrop = false,
  srcSet,
  sizes,
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  width = 640,
  height = 800,
}) {
  const [hasError, setHasError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);

  // Some uploaded product photos have black letterbox bars baked into the
  // top/bottom. For tall images, trim those bars so the product fills the card.
  const trimLetterbox = smartCrop && aspectRatio !== null && aspectRatio < 0.5;

  if (src && !hasError) {
    return (
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt || 'Product image'}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        onError={() => setHasError(true)}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) setAspectRatio(naturalWidth / naturalHeight);
        }}
        style={{
          objectFit: fit,
          ...(trimLetterbox
            ? {
                clipPath: 'inset(14% 0 12% 0)',
                transform: 'scale(1.25)',
              }
            : {}),
        }}
        className={`w-full h-full transition-all duration-300 ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 ${className}`}
      role="img"
      aria-label={alt || 'Product image placeholder'}
    >
      {/* Soft tint */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-apricot-200/40 via-transparent to-transparent" />

      {/* Mountain Illustration SVG */}
      <svg
        className="h-auto w-3/4 max-w-[200px] transition-transform duration-500 group-hover:scale-105"
        viewBox="0 0 200 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8bcbbf" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#45ab9b" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="backPeak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#aab3ba" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6b7683" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="midPeak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#333e4a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0b1420" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="frontPeak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#108474" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0b5a50" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="snowCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e8ecef" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Rising sun */}
        <circle cx="100" cy="54" r="28" fill="url(#sunGrad)" />

        {/* Distant mountains */}
        <polygon points="30,120 75,45 120,120" fill="url(#backPeak)" />
        <polygon points="75,45 88,67 75,60 62,67" fill="url(#snowCap)" />

        <polygon points="90,120 145,35 195,120" fill="url(#backPeak)" />
        <polygon points="145,35 160,60 145,52 130,60" fill="url(#snowCap)" />

        {/* Middle range peak (Rakaposhi silhouette) */}
        <polygon points="0,125 55,50 115,125" fill="url(#midPeak)" />
        <polygon points="55,50 70,72 55,64 40,72" fill="url(#snowCap)" />

        <polygon points="70,125 130,42 190,125" fill="url(#midPeak)" />
        <polygon points="130,42 145,66 130,58 115,66" fill="url(#snowCap)" />

        {/* Valley foreground */}
        <path
          d="M0,120 Q50,105 100,118 T200,115 L200,140 L0,140 Z"
          fill="url(#frontPeak)"
          opacity="0.5"
        />

        {/* Birds in flight */}
        <path d="M60,35 Q64,30 68,35 Q72,30 76,35" stroke="#0b5a50" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M80,26 Q83,22 86,26 Q89,22 92,26" stroke="#0b5a50" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
      </svg>
    </div>
  );
}

