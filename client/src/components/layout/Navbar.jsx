// ── Sticky Navbar ─────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { hasAdminAccess } from '../../lib/adminAccess';
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
  const { count: wishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const { logo, settings } = useSiteSettings();
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
    `px-1 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 ${
      isActive ? 'text-apricot-600' : 'text-mountain-600 hover:text-mountain-900'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `border-b border-cream-200 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apricot-400 ${
      isActive ? 'font-semibold text-apricot-700' : 'text-mountain-700 hover:text-mountain-900'
    }`;

  return (
    <header
      id="site-navbar"
      ref={headerRef}
      className={`sticky top-0 z-50 border-b border-cream-300 bg-cream-50/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_14px_rgba(2,9,18,0.06)]' : ''
      }`}
    >
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-14"
        aria-label="Main Navigation"
      >
        <div
          className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-6 lg:py-2.5 ${
            hasCustomLogo ? 'min-h-[6.5rem]' : 'min-h-16'
          }`}
        >
          {/* Logo */}
          <div className="flex min-w-0 items-center justify-start">
            <Link
              to="/"
              id="nav-logo"
              className="group -ml-1 flex min-w-0 items-center gap-2 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500"
            >
              <SiteLogoMark
                size={hasCustomLogo ? '4xl' : 'md'}
                maxWidthClass={hasCustomLogo ? 'max-w-[6rem] sm:max-w-[12rem]' : 'max-w-[7rem] sm:max-w-[9rem]'}
                className="transition-transform duration-200 group-hover:scale-105"
                priority
              />
              <div className="flex min-w-0 flex-col leading-none">
                <span className="font-display truncate text-[15px] font-normal tracking-tight text-mountain-900">{settings.storeName}</span>
                <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-apricot-600 sm:inline">{settings.storeTagline}</span>
                <span className="mt-1 max-w-full truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-apricot-600 sm:hidden">{settings.storeTagline}</span>
              </div>
            </Link>
          </div>

          {/* Desktop nav links */}
          <div className="hidden items-center justify-center gap-5 lg:flex xl:gap-7">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/shop" className={linkClass}>Shop</NavLink>
            <NavLink to="/track-order" className={linkClass}>Track Order</NavLink>
            <NavLink to="/about" className={linkClass}>About</NavLink>
            <NavLink to="/contact" className={linkClass}>Contact</NavLink>
          </div>

          {/* Right items: User + Cart + Mobile Hamburger */}
          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            {/* Desktop Auth */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              {user ? (
                <div className="flex items-center gap-2" ref={userMenuRef}>
                  {hasAdminAccess(user.role) && (
                    <Link
                      to="/admin"
                      className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mountain-500 transition-colors hover:text-mountain-900"
                      title="Open Admin Dashboard"
                    >
                      Admin
                    </Link>
                  )}

                  {/* User Profile Dropdown Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      id="user-menu-btn"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      className={`flex items-center gap-1.5 border px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 ${
                        userMenuOpen
                          ? 'border-apricot-500 text-mountain-900'
                          : 'border-cream-300 bg-white text-mountain-700 hover:border-mountain-300'
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-apricot-600 text-[10px] font-bold text-white">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                      <span className="max-w-[90px] truncate">{user.name?.split(' ')[0]}</span>
                      <svg
                        className={`h-3.5 w-3.5 text-mountain-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {userMenuOpen && (
                      <div
                        id="user-menu-dropdown"
                        className="absolute right-0 z-50 mt-2 w-64 border border-cream-300 bg-white py-2 shadow-xl"
                      >
                        <div className="border-b border-cream-200 px-4 py-2.5">
                          <p className="truncate text-xs font-semibold text-mountain-900">{user.name}</p>
                          <p className="truncate text-[11px] text-mountain-500">{user.email}</p>
                        </div>

                        <div className="p-1 space-y-0.5">
                          <Link
                            to="/my-orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-mountain-800 transition-colors hover:bg-cream-100 hover:text-apricot-700"
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true">📦</span>
                              <span>My Orders</span>
                            </span>
                            {ordersCount > 0 && (
                              <span className="rounded-full bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold text-mountain-800">
                                {ordersCount}
                              </span>
                            )}
                          </Link>

                          <Link
                            to="/track-order"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-mountain-700 transition-colors hover:bg-cream-100"
                          >
                            <span aria-hidden="true">📍</span>
                            <span>Track Any Order</span>
                          </Link>

                          <Link
                            to="/cart"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2 text-xs text-mountain-700 transition-colors hover:bg-cream-100"
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true">🛒</span>
                              <span>Shopping Cart</span>
                            </span>
                            {totalItems > 0 && (
                              <span className="rounded-full bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold text-mountain-800">
                                {totalItems}
                              </span>
                            )}
                          </Link>

                          {hasAdminAccess(user.role) && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-mountain-700 transition-colors hover:bg-cream-100"
                            >
                              <span aria-hidden="true">⚡</span>
                              <span>Admin Dashboard</span>
                            </Link>
                          )}
                        </div>

                        <div className="mt-1 border-t border-cream-200 px-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              logout();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <span aria-hidden="true">🚪</span>
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
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-mountain-600 transition-colors hover:text-mountain-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2"
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
              className="relative p-2 text-mountain-700 transition-colors hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2"
              aria-label={searchOpen ? 'Close product search' : 'Search products'}
              aria-expanded={searchOpen}
              aria-controls="site-search-panel"
            >
              {searchOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <SearchIcon className="h-5 w-5" />
              )}
            </button>

            {/* Wishlist icon */}
            <Link
              to="/wishlist"
              id="nav-wishlist-btn"
              className="relative p-2 text-mountain-700 transition-colors hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2"
              aria-label={`Wishlist with ${wishlistCount} saved ${wishlistCount === 1 ? 'item' : 'items'}`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-apricot-600 px-1 text-[10px] font-bold leading-none text-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart icon */}
            <Link
              to="/cart"
              id="nav-cart-btn"
              className="relative p-2 text-mountain-700 transition-colors hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2"
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-apricot-600 px-1 text-[10px] font-bold leading-none text-white">
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
              className="p-2 text-mountain-700 transition-colors hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 lg:hidden"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <div
          id="mobile-navigation"
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            isOpen ? 'max-h-[70vh] overflow-y-auto pb-5' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col border-t border-cream-200 pt-2">
            {/* Mobile Client Status Card if logged in */}
            {user && (
              <div className="mb-3 border border-cream-300 bg-cream-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-apricot-600 text-xs font-bold text-white">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <div>
                      <p className="text-xs font-bold leading-tight text-mountain-900">{user.name}</p>
                      <p className="text-[10px] text-mountain-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    Sign Out
                  </button>
                </div>

                <NavLink
                  to="/my-orders"
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 bg-apricot-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-apricot-700"
                >
                  <span>📦 Open My Orders Dashboard</span>
                  {ordersCount > 0 && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-apricot-700">
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
            <NavLink to="/wishlist" onClick={closeMenu} className={mobileLinkClass}>
              Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
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
              <div className="mt-3 border-t border-cream-200 pt-3">
                <div className="flex items-center gap-2 px-3">
                  <NavLink
                    to="/login"
                    onClick={closeMenu}
                    className="flex-1 bg-apricot-600 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-apricot-700"
                  >
                    Sign In
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={closeMenu}
                    className="flex-1 border border-cream-300 bg-white py-2.5 text-center text-xs font-semibold text-mountain-700 transition-colors hover:border-mountain-300"
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
        className={`absolute inset-x-0 top-full z-50 border-b border-cream-300 bg-cream-50/95 backdrop-blur-md transition-all duration-200 ${
          searchOpen
            ? 'visible translate-y-0 opacity-100'
            : 'pointer-events-none invisible -translate-y-2 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="flex w-full items-center gap-2 border border-cream-300 bg-white p-2 transition-colors focus-within:border-apricot-500"
          >
            <span className="pl-2 text-mountain-400">
              <SearchIcon className="h-5 w-5" />
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
              className="shrink-0 bg-mountain-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-mountain-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-mountain-500">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handlePopularSearch(term)}
                className="border border-cream-300 bg-white px-3 py-1.5 font-medium text-mountain-600 transition-colors hover:border-apricot-500 hover:text-apricot-700"
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
