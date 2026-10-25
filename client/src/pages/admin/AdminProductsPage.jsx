import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { fmtPKR } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  // Fetch products
  const {
    data: productData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-products', search, categoryFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter) params.append('category', categoryFilter);
      params.append('page', page);
      params.append('limit', 15);

      const res = await api.get(`/admin/products?${params.toString()}`);
      return res.data;
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      setDeleteModalProduct(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete product');
    },
  });

  const products = productData?.products || [];
  const totalPages = productData?.pages || 1;
  const totalItems = productData?.total || 0;

  return (
    <div className="space-y-6">
      <SEO title="Products - Admin Panel" />

      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Products Catalog
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage your Himalayan goods, variants, inventory, and media.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-apricot-500 hover:bg-apricot-600 text-white rounded-xl text-sm font-semibold shadow-xs transition active:scale-95 focus:ring-2 focus:ring-apricot-400 focus:outline-hidden self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, description, or slug..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:border-apricot-500 focus:outline-hidden transition"
          />
          <svg
            className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-56">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:border-apricot-500 focus:outline-hidden transition"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {(search || categoryFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setCategoryFilter('');
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* Product Content */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-700">
            <p className="text-sm">Failed to load products: {error?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-100 rounded-lg hover:bg-rose-200"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <svg
              className="w-12 h-12 text-stone-300 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-base font-semibold text-stone-700 font-display">No products found</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {search || categoryFilter
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Get started by creating your first product in the catalog.'}
            </p>
            <Link
              to="/admin/products/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-apricot-500 text-white text-xs font-semibold rounded-xl hover:bg-apricot-600 transition"
            >
              <span>Create Product</span>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Desktop Table View ────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
                  <tr>
                    <th className="py-3 px-5">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price Range</th>
                    <th className="py-3 px-4">Total Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((p) => {
                    const prices = (p.variants || []).map((v) => v.price);
                    const minPrice = prices.length ? Math.min(...prices) : 0;
                    const maxPrice = prices.length ? Math.max(...prices) : 0;
                    const priceString =
                      minPrice === maxPrice
                        ? fmtPKR(minPrice)
                        : `${fmtPKR(minPrice)} – ${fmtPKR(maxPrice)}`;
                    const totalStock = (p.variants || []).reduce((acc, v) => acc + (v.stock || 0), 0);
                    const hasLowStock = (p.variants || []).some((v) => v.stock < 10);
                    const thumb = p.images?.[0]?.url;

                    return (
                      <tr key={p._id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-apricot-600">No img</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/admin/products/${p._id}/edit`}
                                className="font-semibold text-mountain-900 hover:text-apricot-600 truncate block text-sm"
                              >
                                {p.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-stone-500 font-mono">
                                  /{p.slug}
                                </span>
                                {p.isFeatured && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-xs bg-amber-100 text-amber-800">
                                    Featured
                                  </span>
                                )}
                                {p.isSeasonal && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-xs bg-purple-100 text-purple-800">
                                    Seasonal
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-stone-700">
                          {p.category?.name || 'Uncategorized'}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-semibold text-mountain-900">
                          {priceString}
                          <span className="block text-[11px] font-normal text-stone-500">
                            {p.variants?.length || 0} variant{p.variants?.length === 1 ? '' : 's'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              totalStock === 0
                                ? 'bg-rose-100 text-rose-800'
                                : hasLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <span>{totalStock} in stock</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                          >
                            {p.isActive ? 'Active' : 'Draft'}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right space-x-2">
                          <Link
                            to={`/admin/products/${p._id}/edit`}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteModalProduct(p)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile & Tablet Stacked Card View ─────────────── */}
            <div className="lg:hidden divide-y divide-stone-100">
              {products.map((p) => {
                const prices = (p.variants || []).map((v) => v.price);
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const priceString =
                  minPrice === maxPrice
                    ? fmtPKR(minPrice)
                    : `${fmtPKR(minPrice)} – ${fmtPKR(maxPrice)}`;
                const totalStock = (p.variants || []).reduce((acc, v) => acc + (v.stock || 0), 0);
                const thumb = p.images?.[0]?.url;

                return (
                  <div key={p._id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb ? (
                          <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-apricot-600">No img</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/admin/products/${p._id}/edit`}
                            className="font-bold text-sm text-mountain-900 hover:text-apricot-600 leading-snug"
                          >
                            {p.name}
                          </Link>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                              p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {p.isActive ? 'Active' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{p.category?.name || 'General'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-100">
                      <div>
                        <span className="text-stone-500 block text-[11px]">Price:</span>
                        <span className="font-semibold text-mountain-900">{priceString}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">Stock:</span>
                        <span
                          className={`font-semibold ${
                            totalStock === 0 ? 'text-rose-600' : totalStock < 10 ? 'text-amber-600' : 'text-emerald-700'
                          }`}
                        >
                          {totalStock} units ({p.variants?.length || 0} vars)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Link
                        to={`/admin/products/${p._id}/edit`}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
                      >
                        Edit Details
                      </Link>
                      <button
                        onClick={() => setDeleteModalProduct(p)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-stone-500">
                  Showing page <strong className="text-stone-900">{page}</strong> of{' '}
                  <strong className="text-stone-900">{totalPages}</strong> ({totalItems} total products)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white font-medium transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white font-medium transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Confirm Delete Modal ─────────────────────────────────── */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold font-display text-mountain-900">
                Confirm Product Deletion
              </h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-stone-900">"{deleteModalProduct.name}"</strong>?
                This action will remove its variants and Cloudinary media assets. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalProduct(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModalProduct._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
