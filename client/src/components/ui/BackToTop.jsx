// ── Back-to-top floating button ──────────────────────────────
import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-40 right-4 z-30 flex h-11 w-11 items-center justify-center border border-cream-300 bg-white/95 text-mountain-700 transition-colors duration-200 hover:border-apricot-500 hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 lg:bottom-24 sm:right-6"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
