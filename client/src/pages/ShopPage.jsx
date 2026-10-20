// ── Shop Page – grid, search, filters, sorting, pagination ───
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import ProductCard from '../components/ui/ProductCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'createdAt',  label: 'Oldest' },
  { value: 'variants.price', label: 'Price: Low → High' },
  { value: '-variants.price', label: 'Price: High → Low' },
  { value: '-ratingAverage', label: 'Top Rated' },
];

function FilterPanel({ categories, filters, onFilter, onReset }) {
  return (
    <aside id="filter-panel" className="bg-white rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-mountain-900">Filters</h2>
        <button
          id="filter-reset-btn"
          onClick={onReset}
          className="text-xs text-apricot-600 hover:text-apricot-700 font-medium transition-colors"
        >
          Reset all
        </button>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-sm font-semibold text-mountain-700 mb-3">Category</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer py-0.5">
            <input
              type="radio"
              name="category"
              value=""
              checked={!filters.category}
              onChange={() => onFilter('category', '')}
              className="accent-apricot-500"
            />
            <span className="text-sm font-medium text-mountain-700">All Categories</span>
          </label>
          {categories.map((cat, idx) => {
            const isChecked = filters.category === cat._id || filters.category === cat.slug;
            const prevCat = categories[idx - 1];
            const showGroupHeader = cat.group && (!prevCat || prevCat.group !== cat.group);

            return (
              <div key={cat._id}>
                {showGroupHeader && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-apricot-600 mt-3 mb-1.5 pt-2 border-t border-cream-200">
                    {cat.group}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-apricot-600 transition-colors">
                  <input
                    type="radio"
                    name="category"
                    value={cat._id}
                    checked={isChecked}
                    onChange={() => onFilter('category', cat._id)}
                    className="accent-apricot-500"
                  />
                  <span className="text-sm text-mountain-700 flex items-center gap-1.5">
                    {cat.icon && <span className="text-xs">{cat.icon}</span>}
                    <span>{cat.name}</span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>


      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-mountain-700 mb-3">Price Range (PKR)</h3>
        <div className="flex gap-2">
          <input
            id="filter-min-price"
            type="number"
            min="0"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onFilter('minPrice', e.target.value)}
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400"
          />
          <input
            id="filter-max-price"
            type="number"
            min="0"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onFilter('maxPrice', e.target.value)}
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400"
          />
        </div>
      </div>

      {/* In stock */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          id="filter-in-stock"
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => onFilter('inStock', e.target.checked)}
          className="accent-apricot-500 w-4 h-4"
        />
        <span className="text-sm text-mountain-700">In Stock Only</span>
      </label>
    </aside>
  );
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const visiblePages = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 2
  );

  return (
    <nav id="pagination" className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
      <button
        id="pagination-prev"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg text-sm font-medium text-mountain-700 hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>

      {visiblePages.map((p, idx) => {
        const prev = visiblePages[idx - 1];
        return (
          <span key={p} className="flex items-center gap-1">
            {prev && p - prev > 1 && (
              <span className="px-2 text-mountain-400 text-sm">…</span>
            )}
            <button
              id={`pagination-page-${p}`}
              onClick={() => onPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-apricot-500 text-white shadow'
                  : 'text-mountain-700 hover:bg-cream-200'
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}

      <button
        id="pagination-next"
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        className="px-3 py-2 rounded-lg text-sm font-medium text-mountain-700 hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </nav>
  );
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock: searchParams.get('inStock') === 'true',
    sort: searchParams.get('sort') || '-createdAt',
    page: Number(searchParams.get('page') || 1),
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  // Sync debouncedSearch to URL
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('search', debouncedSearch);
        else next.delete('search');
        next.set('page', '1');
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const setFilter = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === '' || value === false || value === null) next.delete(key);
        else next.set(key, String(value));
        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams]
  );

  const setPage = (p) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });

  const resetFilters = () => {
    setSearch('');
    setSearchParams({});
  };

  // Categories
  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const matchedCat = (cats || []).find(
    (c) => c._id === filters.category || c.slug === filters.category
  );
  const resolvedCategory = matchedCat ? matchedCat._id : filters.category;

  // Products query
  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (resolvedCategory) queryParams.set('category', resolvedCategory);
  if (filters.minPrice) queryParams.set('minPrice', filters.minPrice);
  if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice);
  if (filters.inStock) queryParams.set('inStock', 'true');
  queryParams.set('sort', filters.sort);
  queryParams.set('page', String(filters.page));
  queryParams.set('limit', '12');

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', queryParams.toString()],
    queryFn: () => api.get(`/products?${queryParams.toString()}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const products = data?.products || [];
  const total    = data?.total || 0;
  const pages    = data?.pages || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        title="Shop Authentic Himalayan Products"
        description="Explore our handpicked collection of Hunza dried fruits, organic walnuts, Chitrali wool caps, and handmade gifts. Fast shipping across Pakistan."
      />

      {/* Header */}
      <div className="mb-8">

        <h1 className="font-display font-bold text-3xl text-mountain-900 mb-2">Shop</h1>
        <p className="text-mountain-600 text-sm">
          {isLoading ? 'Loading…' : `${total} products found`}
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mountain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="shop-search"
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white"
          />
          {search && (
            <button
              id="shop-search-clear"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-400 hover:text-mountain-700 p-0.5 text-xs font-bold"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>


        <select
          id="shop-sort"
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value)}
          className="border border-cream-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-700"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Mobile filter toggle */}
        <button
          id="shop-filter-toggle"
          onClick={() => setShowFilters((v) => !v)}
          className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-medium text-mountain-700 bg-white hover:bg-cream-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
          </svg>
          Filters
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar – desktop always visible, mobile toggle */}
        <div className={`lg:block w-56 shrink-0 ${showFilters ? 'block' : 'hidden'}`}>
          <FilterPanel
            categories={cats || []}
            filters={filters}
            onFilter={setFilter}
            onReset={resetFilters}
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {error && <ErrorState message={error.message} onRetry={refetch} />}

          {(isLoading || isFetching) && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isLoading && !isFetching && !error && products.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🏔️</p>
              <h3 className="font-display font-semibold text-mountain-800 mb-2">No products found</h3>
              <p className="text-mountain-500 text-sm">Try adjusting your search or filters.</p>
              <button
                onClick={resetFilters}
                className="mt-4 px-5 py-2 bg-apricot-500 text-white rounded-full text-sm font-medium hover:bg-apricot-600 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}

          {!isLoading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
              <Pagination page={filters.page} pages={pages} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
