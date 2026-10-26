import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingWhatsApp from '../ui/FloatingWhatsApp';
import PageLoading from '../ui/PageLoading';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-cream-100 text-mountain-900 selection:bg-apricot-200 selection:text-apricot-900">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-apricot-600 focus:text-white focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white text-sm font-semibold transition-all"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" tabIndex="-1" className="flex-1 w-full focus:outline-none">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      {/* Floating WhatsApp on all pages */}
      <FloatingWhatsApp />
    </div>
  );
}
