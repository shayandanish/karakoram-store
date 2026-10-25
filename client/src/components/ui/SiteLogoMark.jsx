// ── SiteLogoMark – admin-managed logo with the default K mark as fallback ─────
import { useState } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const SIZES = {
  sm: { height: 'h-8', box: 'w-8 h-8 rounded-lg', text: 'text-base' },
  md: { height: 'h-9', box: 'w-9 h-9 rounded-xl', text: 'text-lg' },
  lg: { height: 'h-11', box: 'w-11 h-11 rounded-2xl', text: 'text-xl' },
  xl: { height: 'h-12', box: 'w-12 h-12 rounded-2xl', text: 'text-2xl' },
  '2xl': { height: 'h-14', box: 'w-14 h-14 rounded-2xl', text: 'text-3xl' },
  '3xl': { height: 'h-16', box: 'w-16 h-16 rounded-2xl', text: 'text-4xl' },
  '4xl': { height: 'h-20', box: 'w-20 h-20 rounded-3xl', text: 'text-5xl' },
  '5xl': { height: 'h-24', box: 'w-24 h-24 rounded-3xl', text: 'text-6xl' },
};

export default function SiteLogoMark({
  size = 'md',
  className = '',
  maxWidthClass = 'max-w-[9rem]',
  shadowClass = 'shadow-sm',
  alt = 'Karakoram Store',
}) {
  const { logo } = useSiteSettings();
  const [failedUrl, setFailedUrl] = useState('');
  const dimensions = SIZES[size] || SIZES.md;
  const imageUrl = logo?.url || '';
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  if (showImage) {
    return (
      <span
        className={`inline-flex items-center justify-center overflow-hidden rounded-2xl border border-apricot-200/70 bg-apricot-100 p-1 ${shadowClass} shrink-0 ${className}`}
      >
        <img
          src={imageUrl}
          alt={logo.alt || alt}
          onError={() => setFailedUrl(imageUrl)}
          className={`${dimensions.height} w-auto ${maxWidthClass} object-contain block shrink-0 mix-blend-darken`}
        />
      </span>
    );
  }

  return (
    <div
      className={`${dimensions.box} bg-gradient-to-br from-apricot-400 via-apricot-500 to-apricot-700 flex items-center justify-center ${shadowClass} shrink-0 ${className}`}
      aria-label={alt}
    >
      <span
        className={`text-white font-display font-bold leading-none ${dimensions.text}`}
        aria-hidden="true"
      >
        K
      </span>
    </div>
  );
}
