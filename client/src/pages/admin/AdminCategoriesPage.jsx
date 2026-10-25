import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteModalCategory, setDeleteModalCategory] = useState(null);

  // Form State inside modal
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [group, setGroup] = useState('Mountain Harvest & Pantry');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [image, setImage] = useState(null); // { url, publicId }
  const [isUploading, setIsUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Auto-slug generator
  const generateSlug = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setGroup('Mountain Harvest & Pantry');
    setDescription('');
    setIcon('');
    setOrder(0);
    setImage(null);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setSlug(cat.slug || '');
    setGroup(cat.group || 'General');
    setDescription(cat.description || '');
    setIcon(cat.icon || '');
    setOrder(cat.order || 0);
    setImage(cat.image?.url ? cat.image : null);
    setFormErrors({});
    setModalOpen(true);
  };

  // ── Queries & Mutations ───────────────────────────────────────
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCategory) {
        const res = await api.put(`/admin/categories/${editingCategory._id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/admin/categories', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        editingCategory ? 'Category updated successfully' : 'Category created successfully'
      );
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      toast.success('Category deleted successfully');
      setDeleteModalCategory(null);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete category');
    },
  });

  // ── Image Upload Handling ─────────────────────────────────────
  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Image size must be under 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/admin/upload?folder=categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImage({ url: res.data.url, publicId: res.data.publicId });
      toast.success('Category image uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }
    if (!slug.trim() || slug.trim().length < 2) {
      errs.slug = 'Slug must be at least 2 characters';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      group: group.trim() || 'General',
      description: description.trim(),
      icon: icon.trim(),
      order: Number(order) || 0,
      image: image || undefined,
    };

    saveMutation.mutate(payload);
  };

  // Filter categories by search
  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.slug?.toLowerCase().includes(q) ||
      c.group?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <SEO title="Categories - Admin Panel" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Categories
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Organize products into collections, groups, and landing page shelves.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-apricot-500 hover:bg-apricot-600 text-white rounded-xl text-sm font-semibold shadow-xs transition active:scale-95 focus:ring-2 focus:ring-apricot-400 focus:outline-hidden self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Category</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name, group, or slug..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition"
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
      </div>

      {/* Categories Content */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-700">
            <p className="text-sm">Failed to load categories: {error?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-100 rounded-lg hover:bg-rose-200"
            >
              Retry
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <p className="text-base font-semibold text-stone-700 font-display">No categories found</p>
            <p className="text-xs text-stone-500 mt-1">
              {search ? 'Try clearing your search query.' : 'Click "Add Category" to create one.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table View ────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
                  <tr>
                    <th className="py-3 px-5">Category</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCategories.map((c) => (
                    <tr key={c._id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {c.image?.url ? (
                              <img src={c.image.url} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-base">{c.icon || '📦'}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-mountain-900 block text-sm">
                              {c.name}
                            </span>
                            <span className="text-xs font-mono text-stone-400">/{c.slug}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                          {c.group || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-stone-700">
                        {c.order ?? 0}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-stone-600 max-w-xs truncate">
                        {c.description || '—'}
                      </td>

                      <td className="py-3.5 px-5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteModalCategory(c)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Stacked Cards ─────────────────────────── */}
            <div className="md:hidden divide-y divide-stone-100">
              {filteredCategories.map((c) => (
                <div key={c._id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {c.image?.url ? (
                        <img src={c.image.url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{c.icon || '📦'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-mountain-900 truncate">{c.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-mono">/{c.slug}</span>
                        <span>•</span>
                        <span className="text-[11px] bg-stone-100 px-1.5 py-0.5 rounded">
                          {c.group || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-xs text-stone-600 line-clamp-2">{c.description}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <button
                      onClick={() => openEditModal(c)}
                      className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteModalCategory(c)}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Category Modal ────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-lg font-bold font-display text-mountain-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) setSlug(generateSlug(e.target.value));
                  }}
                  placeholder="e.g. Dry Fruits"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
                {formErrors.name && (
                  <p className="text-rose-600 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="dry-fruits"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
                {formErrors.slug && (
                  <p className="text-rose-600 text-xs mt-1">{formErrors.slug}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Group Classification
                  </label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    placeholder="e.g. Mountain Harvest & Pantry"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary for collection shelves and SEO..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category Banner Image
                </label>
                <div className="flex items-center gap-3">
                  {image?.url ? (
                    <div className="w-16 h-16 rounded-xl border border-stone-200 overflow-hidden relative group">
                      <img src={image.url} alt={name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImage(null)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}

                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition">
                      <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{isUploading ? 'Uploading...' : 'Choose Category Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                          e.target.value = '';
                        }}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="text-[11px] text-stone-400 mt-1">JPG, PNG, WebP up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || isUploading}
                  className="px-5 py-2 rounded-xl bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {saveMutation.isPending ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Category Modal ────────────────────────── */}
      {deleteModalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold font-display text-mountain-900">
                Delete Category
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Are you sure you want to delete{' '}
                <strong className="text-stone-900">"{deleteModalCategory.name}"</strong>?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalCategory(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-3 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModalCategory._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
