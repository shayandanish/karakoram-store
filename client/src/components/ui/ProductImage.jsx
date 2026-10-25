// ── ProductImage – shows a styled, artistic mountain placeholder if no image ─────
import { useState } from 'react';

export default function ProductImage({ src, alt, className = '', fit = 'cover', smartCrop = false }) {
  const [hasError, setHasError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);

  // Some uploaded product photos have black letterbox bars baked into the
  // top/bottom. For tall images, trim those bars so the product fills the card.
  const trimLetterbox = smartCrop && aspectRatio !== null && aspectRatio < 0.5;

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt || 'Product image'}
        loading="lazy"
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
      className={`relative flex flex-col items-center justify-center w-full h-full overflow-hidden bg-gradient-to-br from-[#fef5ec] via-[#f7e6d2] to-[#eed0b0] select-none ${className}`}
      aria-label={alt || 'Product image placeholder'}
    >
      {/* Background ambient warmth */}
      <div className="absolute inset-0 bg-radial from-apricot-200/40 via-transparent to-transparent pointer-events-none" />

      {/* Mountain Illustration SVG */}
      <svg
        className="w-3/4 max-w-[200px] h-auto drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
        viewBox="0 0 200 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f89535" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f07a18" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="backPeak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5f89b7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2f5582" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="midPeak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3f6d9e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e3c5e" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="frontPeak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbb86a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ba4d0d" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="snowCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#d8e4ef" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Rising Apricot Sun */}
        <circle cx="100" cy="54" r="28" fill="url(#sunGrad)" />

        {/* Distant Mountains */}
        <polygon points="30,120 75,45 120,120" fill="url(#backPeak)" />
        <polygon points="75,45 88,67 75,60 62,67" fill="url(#snowCap)" />

        <polygon points="90,120 145,35 195,120" fill="url(#backPeak)" />
        <polygon points="145,35 160,60 145,52 130,60" fill="url(#snowCap)" />

        {/* Middle Range Peak (Rakaposhi silhouette) */}
        <polygon points="0,125 55,50 115,125" fill="url(#midPeak)" />
        <polygon points="55,50 70,72 55,64 40,72" fill="url(#snowCap)" />

        <polygon points="70,125 130,42 190,125" fill="url(#midPeak)" />
        <polygon points="130,42 145,66 130,58 115,66" fill="url(#snowCap)" />

        {/* Warm valley foreground */}
        <path
          d="M0,120 Q50,105 100,118 T200,115 L200,140 L0,140 Z"
          fill="url(#frontPeak)"
          opacity="0.35"
        />

        {/* Birds in flight */}
        <path d="M60,35 Q64,30 68,35 Q72,30 76,35" stroke="#ba4d0d" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M80,26 Q83,22 86,26 Q89,22 92,26" stroke="#ba4d0d" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>

      {/* Brand badge */}
      <div className="relative mt-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur-xs border border-apricot-200/60 shadow-xs flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-apricot-500 animate-pulse" />
        <span className="text-[11px] font-medium text-mountain-800 tracking-wide uppercase">
          Karakoram Craft
        </span>
      </div>
    </div>
  );
}

