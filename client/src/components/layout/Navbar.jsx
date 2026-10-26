// ── Sticky Navbar ─────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import SiteLogoMark from '../ui/SiteLogoMark';

const POPULAR_SEARCHES = ['Apricots', 'Honey', 'Pakol caps'];

function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const userMenuRef = useRef(null);
  const headerRef = useRef(null);
  const searchInputRef = useRef(null);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { logo } = useSiteSettings();
  const hasCustomLogo = Boolean(logo?.url);
  const location = useLocation();
  const navigate = useNavigate();

  // Query user orders to show real-time count badge
  const { data: myOrders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then((r) => r.data),
    enabled: !!user,
    staleTime: 30000,
  });
  const ordersCount = Array.isArray(myOrders) ? myOrders.length : 0;

  // Reset mobile menu, user dropdown, and search on route change
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    if (isOpen) setIsOpen(false);
    if (userMenuOpen) setUserMenuOpen(false);
    if (searchOpen) setSearchOpen(false);
  }

  // Click outside listener for user dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus the search field when the panel opens; close on Escape.
  useEffect(() => {
    if (!searchOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 50);

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [searchOpen]);

  // Close the search panel when clicking outside the header.
  useEffect(() => {
    if (!searchOpen) return undefined;

    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setIsOpen(false);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/shop?search=${encodeURIComponent(query)}` : '/shop');
    setSearchOpen(false);
  };

  const handlePopularSearch = (term) => {
    navigate(`/shop?search=${encodeURIComponent(term)}`);
    setSearchOpen(false);
  };

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
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-cream-100/95 backdrop-blur-sm'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main Navigation">
        <div className={`flex items-center justify-between ${hasCustomLogo ? 'h-[6.5rem]' : 'h-16'}`}>
          {/* Logo */}
          <Link
            to="/"
            id="nav-logo"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:rounded-xl p-1"
            aria-label="Karakoram Store Home"
          >
            <SiteLogoMark
              size={hasCustomLogo ? '4xl' : 'md'}
              maxWidthClass={hasCustomLogo ? 'max-w-[6rem] sm:max-w-[12rem]' : 'max-w-[7rem] sm:max-w-[9rem]'}
              className="group-hover:scale-105 transition-transform"
              priority
            />
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
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Desktop Auth */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              {user ? (
                <div className="flex items-center gap-2" ref={userMenuRef}>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="px-2.5 py-1.5 rounded-xl bg-mountain-800 hover:bg-mountain-900 text-white text-xs font-semibold shadow-2xs transition"
                      title="Open Admin Dashboard"
                    >
                      Admin
                    </Link>
                  )}

                  {/* Direct My Orders Button */}
                  <NavLink
                    to="/my-orders"
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-apricot-500 text-white shadow-xs'
                          : 'bg-apricot-50 hover:bg-apricot-100 text-apricot-700 border border-apricot-200/80'
                      }`
                    }
                    title="Open My Orders Dashboard"
                  >
                    <span>📦</span>
                    <span>My Orders</span>
                    {ordersCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-apricot-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {ordersCount}
                      </span>
                    )}
                  </NavLink>

                  {/* User Profile Dropdown Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      id="user-menu-btn"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        userMenuOpen
                          ? 'bg-cream-200 border-apricot-400 text-mountain-900 ring-2 ring-apricot-400/20'
                          : 'bg-white border-cream-300 text-mountain-800 hover:bg-cream-100'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-apricot-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                      <span className="truncate max-w-[90px]">{user.name?.split(' ')[0]}</span>
                      <svg
                        className={`w-3.5 h-3.5 text-mountain-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {userMenuOpen && (
                      <div
                        id="user-menu-dropdown"
                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-cream-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      >
                        <div className="px-4 py-2.5 border-b border-cream-200/80 bg-cream-50/50">
                          <p className="font-bold text-xs text-mountain-900 truncate">{user.name}</p>
                          <p className="text-[11px] text-mountain-500 truncate">{user.email}</p>
                        </div>

                        <div className="p-1 space-y-0.5">
                          <Link
                            to="/my-orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-mountain-800 hover:bg-apricot-50 hover:text-apricot-700 rounded-xl transition"
                          >
                            <span className="flex items-center gap-2">
                              <span>📦</span>
                              <span>My Orders Dashboard</span>
                            </span>
                            {ordersCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-apricot-100 text-apricot-700 text-[10px] font-bold">
                                {ordersCount}
                              </span>
                            )}
                          </Link>

                          <Link
                            to="/track-order"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-mountain-700 hover:bg-cream-100 rounded-xl transition"
                          >
                            <span>📍</span>
                            <span>Track Any Order</span>
                          </Link>

                          <Link
                            to="/cart"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2 text-xs text-mountain-700 hover:bg-cream-100 rounded-xl transition"
                          >
                            <span className="flex items-center gap-2">
                              <span>🛒</span>
                              <span>Shopping Cart</span>
                            </span>
                            {totalItems > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-cream-200 text-mountain-800 text-[10px] font-bold">
                                {totalItems}
                              </span>
                            )}
                          </Link>

                          {user.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-xl transition"
                            >
                              <span>⚡</span>
                              <span>Admin Dashboard</span>
                            </Link>
                          )}
                        </div>

                        <div className="pt-1 mt-1 border-t border-cream-200/80 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          >
                            <span>🚪</span>
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

            {/* Search toggle */}
            <button
              type="button"
              id="nav-search-btn"
              onClick={() => {
                setSearchOpen((open) => !open);
                setIsOpen(false);
              }}
              className="relative p-2 rounded-xl hover:bg-apricot-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
              aria-label={searchOpen ? 'Close product search' : 'Search products'}
              aria-expanded={searchOpen}
              aria-controls="site-search-panel"
            >
              {searchOpen ? (
                <svg className="w-6 h-6 text-mountain-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <SearchIcon className="w-6 h-6 text-mountain-700" />
              )}
            </button>

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
              onClick={() => {
                setIsOpen((open) => !open);
                setSearchOpen(false);
              }}
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
            isOpen ? 'max-h-[30rem] pb-5' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-1 pt-2 border-t border-cream-200">
            {/* Mobile Client Status Card if logged in */}
            {user && (
              <div className="p-3 mb-2 bg-gradient-to-r from-apricot-50 to-cream-100 rounded-2xl border border-apricot-200/70">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-apricot-500 text-white font-bold text-xs flex items-center justify-center">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-mountain-900 leading-tight">{user.name}</p>
                      <p className="text-[10px] text-mountain-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="text-[11px] text-red-600 font-semibold hover:underline"
                  >
                    Sign Out
                  </button>
                </div>

                <NavLink
                  to="/my-orders"
                  onClick={closeMenu}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  <span>📦 Open My Orders Dashboard</span>
                  {ordersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white text-apricot-700 text-[10px] font-bold">
                      {ordersCount}
                    </span>
                  )}
                </NavLink>
              </div>
            )}

            <NavLink to="/" end onClick={closeMenu} className={mobileLinkClass}>
              Home
            </NavLink>
            <NavLink to="/shop" onClick={closeMenu} className={mobileLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/my-orders" onClick={closeMenu} className={mobileLinkClass}>
              My Orders {ordersCount > 0 && `(${ordersCount})`}
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

            {/* Mobile Auth Links (if guest) */}
            {!user && (
              <div className="pt-2 mt-1 border-t border-cream-200/60">
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
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Global search panel */}
      <div
        id="site-search-panel"
        aria-hidden={!searchOpen}
        className={`absolute inset-x-0 top-full z-50 border-b border-cream-200 bg-white/95 shadow-xl backdrop-blur-md transition-all duration-200 ${
          searchOpen
            ? 'visible translate-y-0 opacity-100'
            : 'pointer-events-none invisible -translate-y-2 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="flex w-full items-center gap-2 rounded-2xl border border-cream-300 bg-cream-50 p-2 shadow-sm transition focus-within:border-apricot-300 focus-within:ring-4 focus-within:ring-apricot-100"
          >
            <span className="pl-2 text-mountain-400">
              <SearchIcon />
            </span>
            <input
              ref={searchInputRef}
              id="site-search-input"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for apricots, honey, pakol caps…"
              aria-label="Search products"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-mountain-900 placeholder:text-mountain-400 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mountain-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 sm:px-5"
            >
              Search
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-mountain-400">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handlePopularSearch(term)}
                className="rounded-full border border-cream-300 bg-cream-50 px-3 py-1.5 font-medium text-mountain-600 transition-colors hover:border-apricot-300 hover:bg-apricot-50 hover:text-apricot-700"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
