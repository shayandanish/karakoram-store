// ── Sticky Navbar ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const location = useLocation();

  // Reset mobile menu on route change
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    if (isOpen) setIsOpen(false);
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setIsOpen(false);

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:rounded-lg px-2 py-1 ${
      isActive ? 'text-apricot-600 font-semibold' : 'text-mountain-700'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 ${
      isActive ? 'bg-apricot-50 text-apricot-600 font-semibold' : 'text-mountain-700 hover:bg-cream-200'
    }`;

  return (
    <header
      id="site-navbar"
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-cream-100/95 backdrop-blur-sm'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main Navigation">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            id="nav-logo"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:rounded-xl p-1"
            aria-label="Karakoram Store Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-apricot-400 to-apricot-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span className="text-white font-display font-bold text-lg leading-none">K</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-mountain-900 text-base">Karakoram</span>
              <span className="text-apricot-600 text-xs font-semibold tracking-widest uppercase">Store</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/shop" className={linkClass}>Shop</NavLink>
            <NavLink to="/track-order" className={linkClass}>Track Order</NavLink>
            <NavLink to="/about" className={linkClass}>About</NavLink>
            <NavLink to="/contact" className={linkClass}>Contact</NavLink>
          </div>

          {/* Right items: User + Cart + Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {/* Desktop Auth */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/my-orders"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-200/80 hover:bg-cream-200 text-mountain-800 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
                    title="View My Orders"
                  >
                    <span>👤</span>
                    <span className="truncate max-w-[100px]">{user.name?.split(' ')[0]}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-xs text-mountain-500 hover:text-mountain-800 transition-colors p-1"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  id="nav-login-btn"
                  className="px-3.5 py-1.5 text-xs font-semibold text-mountain-700 hover:text-apricot-600 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Cart icon */}
            <Link
              to="/cart"
              id="nav-cart-btn"
              className="relative p-2 rounded-xl hover:bg-apricot-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <svg className="w-6 h-6 text-mountain-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-apricot-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-xs">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* Hamburger (mobile/tablet only) */}
            <button
              id="nav-hamburger"
              onClick={() => setIsOpen((v) => !v)}
              className="lg:hidden p-2 rounded-xl hover:bg-apricot-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              <svg className="w-6 h-6 text-mountain-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <div
          id="mobile-navigation"
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isOpen ? 'max-h-96 pb-5' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-1 pt-2 border-t border-cream-200">
            <NavLink to="/" end onClick={closeMenu} className={mobileLinkClass}>
              Home
            </NavLink>
            <NavLink to="/shop" onClick={closeMenu} className={mobileLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/track-order" onClick={closeMenu} className={mobileLinkClass}>
              Track Order
            </NavLink>
            <NavLink to="/about" onClick={closeMenu} className={mobileLinkClass}>
              About Us
            </NavLink>
            <NavLink to="/contact" onClick={closeMenu} className={mobileLinkClass}>
              Contact
            </NavLink>
            <NavLink to="/cart" onClick={closeMenu} className={mobileLinkClass}>
              Cart {totalItems > 0 && `(${totalItems})`}
            </NavLink>

            {/* Mobile Auth Links */}
            <div className="pt-2 mt-1 border-t border-cream-200/60">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <NavLink
                    to="/my-orders"
                    onClick={closeMenu}
                    className="text-sm font-semibold text-mountain-800 hover:text-apricot-600 flex items-center gap-1.5"
                  >
                    <span>👤</span> My Orders ({user.name})
                  </NavLink>
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="text-xs text-red-600 font-medium hover:underline p-1"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 pt-1">
                  <NavLink
                    to="/login"
                    onClick={closeMenu}
                    className="flex-1 py-2 text-center rounded-xl bg-apricot-500 text-white font-semibold text-xs transition-colors"
                  >
                    Sign In
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={closeMenu}
                    className="flex-1 py-2 text-center rounded-xl bg-white border border-cream-300 text-mountain-700 font-semibold text-xs hover:bg-cream-100 transition-colors"
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
