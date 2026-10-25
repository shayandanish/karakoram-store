import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function AdminArtisansPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArtisan, setEditingArtisan] = useState(null);
  const [deleteModalArtisan, setDeleteModalArtisan] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [story, setStory] = useState('');
  const [photo, setPhoto] = useState(null); // { url, publicId }
  const [isUploading, setIsUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const openAddModal = () => {
    setEditingArtisan(null);
    setName('');
    setVillage('');
    setStory('');
    setPhoto(null);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (a) => {
    setEditingArtisan(a);
    setName(a.name || '');
    setVillage(a.village || '');
    setStory(a.story || '');
    setPhoto(a.photo?.url ? a.photo : null);
    setFormErrors({});
    setModalOpen(true);
  };

  // ── Queries & Mutations ───────────────────────────────────────
  const {
    data: artisans = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-artisans'],
    queryFn: async () => {
      const res = await api.get('/admin/artisans');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingArtisan) {
        const res = await api.put(`/admin/artisans/${editingArtisan._id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/admin/artisans', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingArtisan ? 'Artisan updated successfully' : 'Artisan created successfully');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-artisans'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save artisan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/artisans/${id}`);
    },
    onSuccess: () => {
      toast.success('Artisan deleted successfully');
      setDeleteModalArtisan(null);
      queryClient.invalidateQueries({ queryKey: ['admin-artisans'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete artisan');
    },
  });

  // ── Photo Upload ──────────────────────────────────────────────
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Photo size must be under 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/admin/upload?folder=artisans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhoto({ url: res.data.url, publicId: res.data.publicId });
      toast.success('Artisan photo uploaded');
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

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      name: name.trim(),
      village: village.trim(),
      story: story.trim(),
      photo: photo || undefined,
    };

    saveMutation.mutate(payload);
  };

  const filteredArtisans = artisans.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.village?.toLowerCase().includes(q) ||
      a.story?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <SEO title="Artisans - Admin Panel" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Artisans & Craftsmen
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Highlight the mountain masters and heritage communities behind every craft.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-apricot-500 hover:bg-apricot-600 text-white rounded-xl text-sm font-semibold shadow-xs transition active:scale-95 focus:ring-2 focus:ring-apricot-400 focus:outline-hidden self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Artisan</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search artisans by name, village, or story..."
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

      {/* Artisans Content */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-700">
            <p className="text-sm">Failed to load artisans: {error?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-100 rounded-lg hover:bg-rose-200"
            >
              Retry
            </button>
          </div>
        ) : filteredArtisans.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <p className="text-base font-semibold text-stone-700 font-display">No artisans registered</p>
            <p className="text-xs text-stone-500 mt-1">
              {search ? 'Try adjusting your search criteria.' : 'Click "Add Artisan" to profile a craftsperson.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table View ────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
                  <tr>
                    <th className="py-3 px-5">Artisan</th>
                    <th className="py-3 px-4">Village / Valley</th>
                    <th className="py-3 px-4">Story Excerpt</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredArtisans.map((a) => (
                    <tr key={a._id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {a.photo?.url ? (
                              <img src={a.photo.url} alt={a.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-mountain-500">
                                {a.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-mountain-900 block text-sm">
                              {a.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-stone-700">
                        {a.village || 'Gilgit-Baltistan'}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-stone-600 max-w-sm truncate">
                        {a.story || 'No story details provided yet.'}
                      </td>

                      <td className="py-3.5 px-5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(a)}
                          className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteModalArtisan(a)}
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
              {filteredArtisans.map((a) => (
                <div key={a._id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {a.photo?.url ? (
                        <img src={a.photo.url} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-mountain-500">
                          {a.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-mountain-900 truncate">{a.name}</h3>
                      <p className="text-xs text-stone-500">{a.village || 'Hunza Valley'}</p>
                    </div>
                  </div>

                  {a.story && (
                    <p className="text-xs text-stone-600 line-clamp-2">{a.story}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <button
                      onClick={() => openEditModal(a)}
                      className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setDeleteModalArtisan(a)}
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

      {/* ── Add / Edit Artisan Modal ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-lg font-bold font-display text-mountain-900">
                {editingArtisan ? 'Edit Artisan Profile' : 'Profile New Artisan'}
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
                  Artisan Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Baig"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
                {formErrors.name && (
                  <p className="text-rose-600 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Village / Region
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Murtazabad, Hunza"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Artisan Heritage Story
                </label>
                <textarea
                  rows={4}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Describe their craft journey, traditional tools, generational apprenticeship, or community impact..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Portrait Photo
                </label>
                <div className="flex items-center gap-4">
                  {photo?.url ? (
                    <div className="w-16 h-16 rounded-full border border-stone-200 overflow-hidden relative group shrink-0">
                      <img src={photo.url} alt={name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition">
                      <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{isUploading ? 'Uploading...' : 'Choose Portrait'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
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
                  {saveMutation.isPending ? 'Saving...' : editingArtisan ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Artisan Modal ─────────────────────────── */}
      {deleteModalArtisan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold font-display text-mountain-900">
                Delete Artisan Profile
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Are you sure you want to remove <strong className="text-stone-900">"{deleteModalArtisan.name}"</strong>?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalArtisan(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-3 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModalArtisan._id)}
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
