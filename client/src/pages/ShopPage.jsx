// ── Shop Page – grid, search, filters, sorting, pagination ───
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import ProductCard from '../components/ui/ProductCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import SEO from '../components/ui/SEO';
import { REGIONS } from '../lib/regions';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'createdAt',  label: 'Oldest' },
  { value: 'variants.price', label: 'Price: Low → High' },
  { value: '-variants.price', label: 'Price: High → Low' },
  { value: '-ratingAverage', label: 'Top Rated' },
];

function FilterDisclosure({
  label,
  count = 0,
  children,
  align = 'left',
  openFilter,
  setOpenFilter,
}) {
  const isOpen = openFilter === label;

  return (
    <div
      className="relative"
      data-filter-disclosure
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpenFilter(label);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') {
          setOpenFilter((current) => (current === label ? null : current));
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpenFilter(null);
          event.currentTarget.querySelector('button')?.focus();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`filter-dropdown-${label.toLowerCase()}`}
        onClick={() => setOpenFilter(label)}
        onFocus={() => setOpenFilter(label)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
            setOpenFilter((current) => (current === label ? null : current));
          }
        }}
        className="flex cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium text-mountain-600 transition-colors hover:text-mountain-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500/40 focus-visible:ring-offset-4"
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="rounded-full bg-apricot-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-apricot-700">
            {count}
          </span>
        )}
        <svg
          className={`h-3.5 w-3.5 text-mountain-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div
          id={`filter-dropdown-${label.toLowerCase()}`}
          className={`absolute top-full z-30 w-72 max-w-[calc(100vw-2rem)] border border-cream-300 bg-white p-4 shadow-[0_12px_30px_rgba(2,9,18,0.08)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white py-1 pl-3 pr-2 text-xs font-medium text-mountain-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full p-0.5 text-[10px] leading-none text-mountain-400 transition-colors hover:text-apricot-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500/40"
      >
        ✕
      </button>
    </span>
  );
}

function FilterPanel({ categories, filters, onFilter, onReset, onPriceRange }) {
  const activeCount = [
    filters.category,
    filters.region,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
    filters.sale,
  ].filter(Boolean).length;

  const priceRanges = [
    { label: 'Under 500', min: '', max: 500 },
    { label: '500–1,500', min: 500, max: 1500 },
    { label: '1,500–3,000', min: 1500, max: 3000 },
    { label: '3,000+', min: 3000, max: '' },
  ];

  return (
    <aside id="filter-panel" className="rounded-xl border border-cream-300 bg-white p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-mountain-900">
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-apricot-100 px-2 py-0.5 text-[11px] font-bold text-apricot-700">
              {activeCount}
            </span>
          )}
        </h2>
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
                  <span className="text-sm text-mountain-700">{cat.name}</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Region */}
      <div>
        <h3 className="text-sm font-semibold text-mountain-700 mb-3">Region</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer py-0.5">
            <input
              type="radio"
              name="region"
              value=""
              checked={!filters.region}
              onChange={() => onFilter('region', '')}
              className="accent-apricot-500"
            />
            <span className="text-sm font-medium text-mountain-700">All Regions</span>
          </label>
          {REGIONS.map((region) => (
            <label
              key={region.slug}
              className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-apricot-600 transition-colors"
            >
              <input
                type="radio"
                name="region"
                value={region.slug}
                checked={filters.region === region.slug}
                onChange={() => onFilter('region', region.slug)}
                className="accent-apricot-500"
              />
              <span className="text-sm text-mountain-700">{region.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-mountain-700 mb-3">Price Range (PKR)</h3>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {priceRanges.map((range) => {
            const isActive =
              String(filters.minPrice || '') === String(range.min) &&
              String(filters.maxPrice || '') === String(range.max);
            return (
              <button
                key={range.label}
                type="button"
                onClick={() => onPriceRange(range.min, range.max)}
                aria-pressed={isActive}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'border-apricot-400 bg-apricot-50 text-apricot-700'
                    : 'border-cream-300 bg-white text-mountain-600 hover:border-apricot-300 hover:text-apricot-700'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>

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

      {/* On sale */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          id="filter-on-sale"
          type="checkbox"
          checked={filters.sale}
          onChange={(e) => onFilter('sale', e.target.checked)}
          className="accent-apricot-500 w-4 h-4"
        />
        <span className="text-sm text-mountain-700">On Sale</span>
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
  const [openFilter, setOpenFilter] = useState(null);

  const filters = {
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock: searchParams.get('inStock') === 'true',
    sale: searchParams.get('sale') === 'true',
    sort: searchParams.get('sort') || '-createdAt',
    page: Number(searchParams.get('page') || 1),
  };

  const activeFilterCount = [
    filters.category,
    filters.region,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
    filters.sale,
  ].filter(Boolean).length;

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

  const setPriceRange = useCallback(
    (min, max) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (min === '' || min === null || min === undefined) next.delete('minPrice');
        else next.set('minPrice', String(min));
        if (max === '' || max === null || max === undefined) next.delete('maxPrice');
        else next.set('maxPrice', String(max));
        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams]
  );

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
  const activeRegion = REGIONS.find((region) => region.slug === filters.region);

  // Products query
  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (resolvedCategory) queryParams.set('category', resolvedCategory);
  if (filters.region) queryParams.set('region', filters.region);
  if (filters.minPrice) queryParams.set('minPrice', filters.minPrice);
  if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice);
  if (filters.inStock) queryParams.set('inStock', 'true');
  if (filters.sale) queryParams.set('sale', 'true');
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

  const priceLabel = filters.minPrice || filters.maxPrice
    ? filters.minPrice && filters.maxPrice
      ? `PKR ${Number(filters.minPrice).toLocaleString()}–${Number(filters.maxPrice).toLocaleString()}`
      : filters.minPrice
        ? `PKR ${Number(filters.minPrice).toLocaleString()}+`
        : `Under PKR ${Number(filters.maxPrice).toLocaleString()}`
    : '';

  const priceRanges = [
    { label: 'Under 500', min: '', max: 500 },
    { label: '500–1,500', min: 500, max: 1500 },
    { label: '1,500–3,000', min: 1500, max: 3000 },
    { label: '3,000+', min: 3000, max: '' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        title={activeRegion ? `Shop ${activeRegion.name} Products` : 'Shop Authentic Himalayan Products'}
        description={activeRegion
          ? `Shop authentic products from ${activeRegion.name}, Gilgit-Baltistan — dry fruits, organic oils, herbs, and handmade crafts. Fast shipping across Pakistan.`
          : 'Explore our handpicked collection of Hunza dried fruits, organic walnuts, Chitrali wool caps, and handmade gifts. Fast shipping across Pakistan.'}
        canonicalUrl="/shop"
      />

      {/* Header */}
      <div className="mb-8 max-w-2xl">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot-600">
          The full collection
        </p>
        <h1 className="mb-3 font-display text-4xl font-bold leading-tight text-mountain-900 sm:text-5xl">
          Shop All{activeRegion ? ` · ${activeRegion.name}` : ''}
        </h1>
        <p className="text-sm leading-relaxed text-mountain-600">
          Dry fruits, raw honey, cold-pressed oils, herbs and handmade crafts, sourced directly
          from the valleys of Gilgit-Baltistan.
        </p>
      </div>

      {/* Filter / sort toolbar */}
      <div className="mb-5 border-y border-cream-300">
        <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center gap-4">
            {/* Mobile filter toggle */}
            <button
              id="shop-filter-toggle"
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
              className="inline-flex items-center gap-2 rounded-lg border border-cream-300 bg-white px-3.5 py-2 text-sm font-medium text-mountain-700 transition-colors hover:border-apricot-300 hover:text-apricot-700 lg:hidden"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
              </svg>
              Filter and sort
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-apricot-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Desktop filter disclosures */}
            <div className="hidden items-center gap-5 lg:flex">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mountain-400">
                Filter
              </span>

              <FilterDisclosure label="Category" count={filters.category ? 1 : 0} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-cream-50">
                    <input
                      type="radio"
                      name="desktop-category"
                      value=""
                      checked={!filters.category}
                      onChange={() => setFilter('category', '')}
                      className="accent-apricot-500"
                    />
                    <span className="text-sm font-medium text-mountain-800">All Categories</span>
                  </label>
                  {(cats || []).map((cat, idx, list) => {
                    const isChecked = filters.category === cat._id || filters.category === cat.slug;
                    const prevCat = list[idx - 1];
                    const showGroupHeader = cat.group && (!prevCat || prevCat.group !== cat.group);

                    return (
                      <div key={cat._id}>
                        {showGroupHeader && (
                          <div className="mb-1 mt-3 border-t border-cream-200 pt-2 text-[10px] font-bold uppercase tracking-wider text-apricot-600">
                            {cat.group}
                          </div>
                        )}
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-cream-50">
                          <input
                            type="radio"
                            name="desktop-category"
                            value={cat._id}
                            checked={isChecked}
                            onChange={() => setFilter('category', cat._id)}
                            className="accent-apricot-500"
                          />
                          <span className="text-sm text-mountain-700">{cat.name}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </FilterDisclosure>

              <FilterDisclosure label="Region" count={filters.region ? 1 : 0} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-cream-50">
                    <input
                      type="radio"
                      name="desktop-region"
                      value=""
                      checked={!filters.region}
                      onChange={() => setFilter('region', '')}
                      className="accent-apricot-500"
                    />
                    <span className="text-sm font-medium text-mountain-800">All Regions</span>
                  </label>
                  {REGIONS.map((region) => (
                    <label
                      key={region.slug}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-cream-50"
                    >
                      <input
                        type="radio"
                        name="desktop-region"
                        value={region.slug}
                        checked={filters.region === region.slug}
                        onChange={() => setFilter('region', region.slug)}
                        className="accent-apricot-500"
                      />
                      <span className="text-sm text-mountain-700">{region.name}</span>
                    </label>
                  ))}
                </div>
              </FilterDisclosure>

              <FilterDisclosure label="Price" count={priceLabel ? 1 : 0} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {priceRanges.map((range) => {
                    const isActive =
                      String(filters.minPrice || '') === String(range.min) &&
                      String(filters.maxPrice || '') === String(range.max);
                    return (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() => setPriceRange(range.min, range.max)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          isActive
                            ? 'border-apricot-400 bg-apricot-50 text-apricot-700'
                            : 'border-cream-300 bg-white text-mountain-600 hover:border-apricot-300 hover:text-apricot-700'
                        }`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="desktop-filter-min-price"
                    type="number"
                    min="0"
                    placeholder="Min"
                    aria-label="Minimum price"
                    value={filters.minPrice}
                    onChange={(e) => setFilter('minPrice', e.target.value)}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400"
                  />
                  <span className="text-xs text-mountain-400">to</span>
                  <input
                    id="desktop-filter-max-price"
                    type="number"
                    min="0"
                    placeholder="Max"
                    aria-label="Maximum price"
                    value={filters.maxPrice}
                    onChange={(e) => setFilter('maxPrice', e.target.value)}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400"
                  />
                </div>
              </FilterDisclosure>

              <FilterDisclosure
                label="Availability"
                count={(filters.inStock ? 1 : 0) + (filters.sale ? 1 : 0)}
                align="right"
                openFilter={openFilter}
                setOpenFilter={setOpenFilter}
              >
                <div className="space-y-1">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-cream-50">
                    <input
                      id="desktop-filter-in-stock"
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) => setFilter('inStock', e.target.checked)}
                      className="h-4 w-4 accent-apricot-500"
                    />
                    <span className="text-sm text-mountain-700">In stock only</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-cream-50">
                    <input
                      id="desktop-filter-on-sale"
                      type="checkbox"
                      checked={filters.sale}
                      onChange={(e) => setFilter('sale', e.target.checked)}
                      className="h-4 w-4 accent-apricot-500"
                    />
                    <span className="text-sm text-mountain-700">On sale</span>
                  </label>
                </div>
              </FilterDisclosure>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none lg:w-44 xl:w-56">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mountain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="shop-search"
                type="search"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-cream-300 bg-white py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400"
              />
              {search && (
                <button
                  id="shop-search-clear"
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-xs font-bold text-mountain-400 hover:text-mountain-700"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <label htmlFor="shop-sort" className="sr-only">Sort by</label>
            <select
              id="shop-sort"
              value={filters.sort}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="rounded-lg border border-cream-300 bg-white px-2.5 py-2 text-xs font-medium text-mountain-700 focus:outline-none focus:ring-2 focus:ring-apricot-400"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <span className="hidden whitespace-nowrap text-xs text-mountain-500 sm:block">
              {isLoading ? 'Loading…' : `${total} products`}
            </span>
          </div>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filters.category && (
            <FilterChip
              label={matchedCat?.name || 'Category'}
              onClear={() => setFilter('category', '')}
            />
          )}
          {filters.region && (
            <FilterChip
              label={activeRegion?.name || filters.region}
              onClear={() => setFilter('region', '')}
            />
          )}
          {priceLabel && (
            <FilterChip label={priceLabel} onClear={() => setPriceRange('', '')} />
          )}
          {filters.inStock && (
            <FilterChip label="In stock" onClear={() => setFilter('inStock', false)} />
          )}
          {filters.sale && (
            <FilterChip label="On sale" onClear={() => setFilter('sale', false)} />
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 text-xs font-medium text-mountain-500 underline underline-offset-2 transition-colors hover:text-mountain-800"
          >
            Clear all
          </button>
        </div>
      )}

      {showFilters && (
        <div className="mb-6 lg:hidden">
          <FilterPanel
            categories={cats || []}
            filters={filters}
            onFilter={setFilter}
            onReset={resetFilters}
            onPriceRange={setPriceRange}
          />
        </div>
      )}

      <div>
        {error && <ErrorState message={error.message} onRetry={refetch} />}

        {(isLoading || isFetching) && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!isLoading && !isFetching && !error && products.length === 0 && (
          <div className="rounded-3xl border border-cream-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="mb-4 text-5xl" aria-hidden="true">🏔️</p>
            <h3 className="mb-2 font-display text-lg font-semibold text-mountain-800">No products found</h3>
            <p className="mx-auto mb-5 max-w-sm text-sm text-mountain-500">
              We couldn&apos;t match that combination. Try a different search term, or clear your filters to
              see everything we stock.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={resetFilters}
                className="rounded-full bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-apricot-600"
              >
                Clear all filters
              </button>
              <Link
                to="/shop?sale=true"
                className="rounded-full border border-cream-300 bg-white px-5 py-2.5 text-sm font-semibold text-mountain-700 transition-colors hover:border-apricot-300 hover:text-apricot-700"
              >
                Browse sale items
              </Link>
            </div>

            {Array.isArray(cats) && cats.length > 0 && (
              <div className="mt-8 border-t border-cream-200 pt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mountain-400">
                  Popular categories
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {cats.slice(0, 6).map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/shop?category=${cat.slug}`}
                      className="rounded-full bg-cream-100 px-3.5 py-1.5 text-xs font-medium text-mountain-700 transition-colors hover:bg-apricot-100 hover:text-apricot-700"
                    >
                      {cat.icon ? `${cat.icon} ` : ''}
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
            <Pagination page={filters.page} pages={pages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
