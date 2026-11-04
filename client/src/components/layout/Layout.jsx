import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AnnouncementBar from './AnnouncementBar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import FloatingWhatsApp from '../ui/FloatingWhatsApp';
import BackToTop from '../ui/BackToTop';
import PageLoading from '../ui/PageLoading';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream-100 pb-[calc(4rem+env(safe-area-inset-bottom))] text-mountain-900 selection:bg-apricot-200 selection:text-apricot-900 lg:pb-0">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-apricot-600 focus:text-white focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white text-sm font-semibold transition-all"
      >
        Skip to main content
      </a>

      <AnnouncementBar />
      <Navbar />

      <main id="main-content" tabIndex="-1" className="w-full flex-1 focus:outline-none">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      {/* Persistent quick navigation on small screens */}
      <MobileBottomNav />

      {/* Overlays */}
      <BackToTop />
      <FloatingWhatsApp />
    </div>
  );
}
