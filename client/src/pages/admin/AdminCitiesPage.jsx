// ── Admin Cities / Regions Page ───────────────────────────────
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

/* ── helpers ────────────────────────────────────────────────── */
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const EMPTY_FORM = {
  name: '',
  slug: '',
  tagline: '',
  body: '',
  accentColor: '#f89535',
  order: 0,
  isActive: true,
  image: { url: '', publicId: '' },
};

/* ── Gilgit-Baltistan Presets ───────────────────────────────── */
const GB_PRESETS = [
  {
    name: 'Hunza Valley',
    slug: 'hunza-valley',
    tagline: 'Heaven on Earth & Land of Longevity',
    body: 'Nestled between Rakaposhi and Ultar Sar, Hunza is famed for its turquoise river, ancient Baltit and Altit Forts, terraced apricot orchards in spring blossom, and the legendary warmth and longevity of its people.',
    accentColor: '#f89535',
    imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200&q=80',
    order: 1,
  },
  {
    name: 'Nagar Valley',
    slug: 'nagar-valley',
    tagline: 'Land of Glaciers & Blossoming Orchards',
    body: "Directly across the river from Hunza, Nagar valley boasts spectacular close-up views of Rakaposhi's south face, Hopar Glacier, and vibrant terraces bursting with organic cherries and walnuts.",
    accentColor: '#5f89b7',
    imageUrl: 'https://images.unsplash.com/photo-1627894483216-2138af692e32?w=1200&q=80',
    order: 2,
  },
  {
    name: 'Ghizer Valley',
    slug: 'ghizer-valley',
    tagline: "Gilgit-Baltistan's Crystal Water Kingdom",
    body: 'Carpeted in verdant pine forests and threaded by the pristine Ghizer River, this tranquil valley features Phander Lake, Shandur Pass, and an untouched paradise for mountain honey and trout.',
    accentColor: '#3f6d9e',
    imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=1200&q=80',
    order: 3,
  },
  {
    name: 'Astore Valley',
    slug: 'astore-valley',
    tagline: 'Under the Majestic Rupal Face of Nanga Parbat',
    body: "Gateway to the sheer Rupal face of Nanga Parbat — the world's 9th highest peak — Astore offers dramatic pine forests, the crystal-clear Rama Lake, and pure mountain herbs.",
    accentColor: '#f07a18',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80',
    order: 4,
  },
  {
    name: 'Diamer Valley',
    slug: 'diamer-valley',
    tagline: 'Gateway to the Western Himalayas',
    body: 'A rugged land of dramatic river gorges, historic Silk Road petroglyphs, and towering peaks guarding the southern entrance to Gilgit-Baltistan with warm local traditions.',
    accentColor: '#ba4d0d',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    order: 5,
  },
  {
    name: 'Gilgit City',
    slug: 'gilgit-city',
    tagline: 'Historical Crossroads of the Ancient Silk Route',
    body: 'The administrative heart of Gilgit-Baltistan at the confluence of three rivers. Home to vibrant spice and dry fruit bazaars, Karga Buddha, and timeless mountain cultures.',
    accentColor: '#87a9cc',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    order: 6,
  },
  {
    name: 'Baltistan',
    slug: 'baltistan',
    tagline: 'Little Tibet & Realm of 8,000m Giants',
    body: 'Baltistan holds K2, Broad Peak, and the vast Baltoro Glacier, accompanied by historic Shigar and Khaplu royal forts, high-altitude sand dunes, and fragrant apricot gardens.',
    accentColor: '#e0630e',
    imageUrl: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=80',
    order: 7,
  },
  {
    name: 'Skardu',
    slug: 'skardu',
    tagline: 'Basecamp of K2 & Deosai Plains',
    body: 'Perched on an alpine plateau between the Karakoram and Himalayan ranges, Skardu is the staging ground for mountaineers and gateway to the mystical Deosai National Park and Shangrila Lake.',
    accentColor: '#4f7fa6',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    order: 8,
  },
];

/* ── City row card ──────────────────────────────────────────── */
function CityRow({ city, onEdit, onDelete, onToggleActive, toggling }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all group">
      {/* Thumbnail */}
      <div className="w-24 h-18 rounded-xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200 relative">
        {city.image?.url ? (
          <img
            src={city.image.url}
            alt={city.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center');
              e.currentTarget.parentElement.innerText = '🏔️';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🏔️</div>
        )}
        <span
          className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full border border-white"
          style={{ backgroundColor: city.accentColor || '#f89535' }}
          title="Accent color"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-bold text-mountain-900 text-sm truncate">{city.name}</h3>
          <span className="text-[11px] font-mono text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">
            /{city.slug}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: city.accentColor || '#f89535' }}
          >
            Order #{city.order ?? 0}
          </span>
        </div>

        {city.tagline && (
          <p className="text-xs text-apricot-600 font-medium mt-0.5 italic truncate">{city.tagline}</p>
        )}
        <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{city.body}</p>
      </div>

      {/* Visibility Quick Toggle */}
      <button
        onClick={() => onToggleActive(city)}
        disabled={toggling}
        title={city.isActive ? 'Visible on homepage — Click to hide' : 'Hidden from homepage — Click to show'}
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
          city.isActive
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${city.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
        {city.isActive ? 'Active' : 'Hidden'}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onEdit(city)}
          className="p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 transition"
          title="Edit city"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(city)}
          className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
          title="Delete city"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── City Form Modal ────────────────────────────────────────── */
function CityFormModal({ city, onClose, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const isEdit = Boolean(city?._id);

  const [form, setForm] = useState(() => ({
    name: city?.name || '',
    slug: city?.slug || '',
    tagline: city?.tagline || '',
    body: city?.body || '',
    accentColor: city?.accentColor || '#f89535',
    order: city?.order ?? 0,
    isActive: city?.isActive !== undefined ? city.isActive : true,
    image: city?.image || { url: '', publicId: '' },
  }));

  const [imgMode, setImgMode] = useState('url'); // 'url' | 'upload'
  const [customUrl, setCustomUrl] = useState(city?.image?.url || '');
  const [imgPreview, setImgPreview] = useState(city?.image?.url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleNameChange = (val) => {
    set('name', val);
    if (autoSlug) {
      set('slug', slugify(val));
    }
  };

  /* Apply GB valley preset */
  const applyPreset = (preset) => {
    setForm((f) => ({
      ...f,
      name: preset.name,
      slug: preset.slug,
      tagline: preset.tagline,
      body: preset.body,
      accentColor: preset.accentColor,
      order: preset.order,
      image: { url: preset.imageUrl, publicId: '' },
    }));
    setCustomUrl(preset.imageUrl);
    setImgPreview(preset.imageUrl);
    toast.success(`Loaded preset for ${preset.name}`);
  };

  /* Handle manual image URL change */
  const handleCustomUrlChange = (url) => {
    setCustomUrl(url);
    setImgPreview(url);
    set('image', { url: url.trim(), publicId: '' });
  };

  /* Cloudinary file upload */
  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImgPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/upload?folder=cities', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('image', { url: data.url, publicId: data.publicId });
      setCustomUrl(data.url);
      setImgPreview(data.url);
      toast.success(data.storage === 'local' ? 'Picture uploaded from laptop ✓' : 'Picture uploaded to Cloudinary ✓');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Upload failed. You can also paste a Direct Image URL instead.';
      toast.error(msg);
      // Revert preview to previous URL if any
      setImgPreview(form.image?.url || '');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    set('image', { url: '', publicId: '' });
    setCustomUrl('');
    setImgPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  /* Submit handler */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    const body = form.body.trim();

    if (!name || name.length < 2) return toast.error('Name must be at least 2 characters');
    if (!slug || slug.length < 2) return toast.error('Valid slug is required');
    if (!body || body.length < 10) return toast.error('Introduction body must be at least 10 characters');

    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        tagline: form.tagline?.trim() || '',
        body,
        accentColor: form.accentColor || '#f89535',
        order: Number(form.order) || 0,
        isActive: Boolean(form.isActive),
        image: {
          url: (customUrl || form.image?.url || '').trim(),
          publicId: form.image?.publicId || '',
        },
      };

      if (isEdit) {
        await api.put(`/admin/cities/${city._id}`, payload);
        toast.success(`"${name}" updated successfully!`);
      } else {
        await api.post('/admin/cities', payload);
        toast.success(`"${name}" created successfully!`);
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed. Please check form fields.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg text-mountain-900">
              {isEdit ? `Edit — ${city.name}` : 'Add New City / Valley'}
            </h2>
            <p className="text-xs text-stone-500">
              {isEdit ? 'Update details, photos, or order' : 'Add a new Gilgit-Baltistan region card'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Presets (when adding) */}
          {!isEdit && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl">
              <p className="text-xs font-semibold text-mountain-800 mb-2 flex items-center gap-1.5">
                <span>⚡</span> Quick Presets (Click to autofill):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GB_PRESETS.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:border-apricot-400 hover:text-apricot-600 font-medium transition shadow-2xs"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1" htmlFor="city-name">
                City / Valley Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="city-name"
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Hunza Valley"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-600" htmlFor="city-slug">
                  Slug (URL key) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoSlug;
                    setAutoSlug(next);
                    if (next) set('slug', slugify(form.name));
                  }}
                  className="text-[10px] text-apricot-600 hover:underline font-medium"
                >
                  {autoSlug ? '🔒 Auto-sync' : '✏️ Manual'}
                </button>
              </div>
              <input
                id="city-slug"
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  set('slug', slugify(e.target.value));
                }}
                placeholder="e.g. hunza-valley"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50"
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1" htmlFor="city-tagline">
              Tagline / Subtitle
            </label>
            <input
              id="city-tagline"
              type="text"
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="e.g. Heaven on Earth & Land of Longevity"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600" htmlFor="city-body">
                Introduction / Body <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-mono ${form.body.trim().length >= 10 ? 'text-emerald-600' : 'text-stone-400'}`}>
                {form.body.trim().length} / min 10 chars
              </span>
            </div>
            <textarea
              id="city-body"
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              rows={4}
              placeholder="Write a captivating paragraph about this valley's mountains, culture, history, and organic produce..."
              required
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50 resize-y"
            />
          </div>

          {/* Image Section: URL or File Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-600">Cover Image</label>
              <div className="flex rounded-lg bg-stone-100 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setImgMode('url')}
                  className={`px-2.5 py-0.5 rounded-md transition ${
                    imgMode === 'url' ? 'bg-white shadow-2xs text-stone-800' : 'text-stone-500'
                  }`}
                >
                  Direct URL
                </button>
                <button
                  type="button"
                  onClick={() => setImgMode('upload')}
                  className={`px-2.5 py-0.5 rounded-md transition ${
                    imgMode === 'upload' ? 'bg-white shadow-2xs text-stone-800' : 'text-stone-500'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {imgMode === 'url' ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => handleCustomUrlChange(e.target.value)}
                  placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50"
                />
              </div>
            ) : (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-3 px-4 border-2 border-dashed border-stone-300 hover:border-apricot-400 rounded-xl bg-stone-50 hover:bg-apricot-50 text-stone-600 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-apricot-500 border-t-transparent rounded-full animate-spin" />
                      <span>Uploading picture...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-stone-400">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Choose picture from laptop</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Preview Box */}
            {imgPreview && (
              <div className="mt-3 relative rounded-2xl overflow-hidden border border-stone-200 h-36 bg-stone-900 group">
                <img
                  src={imgPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => {
                    toast.error('Could not load image from URL');
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row: Accent Color, Display Order, Visible */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Accent Color */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1" htmlFor="city-accent">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="city-accent"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => set('accentColor', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={form.accentColor}
                  onChange={(e) => set('accentColor', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50"
                />
              </div>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1" htmlFor="city-order">
                Display Order
              </label>
              <input
                id="city-order"
                type="number"
                min="0"
                value={form.order}
                onChange={(e) => set('order', Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-stone-50"
              />
            </div>

            {/* Visibility Toggle */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Homepage Status
              </label>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  form.isActive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${form.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                {form.isActive ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 py-3 rounded-2xl bg-apricot-500 hover:bg-apricot-400 text-white text-sm font-semibold transition shadow-sm active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create City'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete Modal ───────────────────────────────────────────── */
function DeleteModal({ city, onClose, onConfirm, deleting }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-display font-bold text-lg text-mountain-900 mb-1">Delete City?</h3>
        <p className="text-sm text-stone-500 mb-6">
          <strong className="text-mountain-800">{city.name}</strong> will be permanently removed from the homepage carousel.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 text-sm font-semibold hover:bg-stone-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function AdminCitiesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null); // null | city object | 'new'
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [seeding, setSeeding] = useState(false);

  /* Fetch cities */
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-cities', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await api.get(`/admin/cities?${params}`);
      return res.data;
    },
  });

  const cities = data?.cities || [];

  /* Delete mutation */
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/cities/${id}`),
    onSuccess: () => {
      toast.success('City deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Delete failed'),
  });

  /* Quick Toggle Active mutation */
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/admin/cities/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const onSaved = () => {
    setEditTarget(null);
    queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
    queryClient.invalidateQueries({ queryKey: ['cities'] });
  };

  /* One-click seed of standard GB Valleys */
  const handleSeedDefaults = async () => {
    setSeeding(true);
    let added = 0;
    try {
      for (const preset of GB_PRESETS) {
        // Skip if already in database
        const exists = cities.some((c) => c.slug === preset.slug);
        if (exists) continue;

        await api.post('/admin/cities', {
          name: preset.name,
          slug: preset.slug,
          tagline: preset.tagline,
          body: preset.body,
          accentColor: preset.accentColor,
          order: preset.order,
          isActive: true,
          image: { url: preset.imageUrl, publicId: '' },
        });
        added++;
      }

      if (added > 0) {
        toast.success(`Successfully added ${added} Gilgit-Baltistan valleys!`);
        queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
        queryClient.invalidateQueries({ queryKey: ['cities'] });
      } else {
        toast.info('All Gilgit-Baltistan presets are already in your list.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed while seeding presets');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <SEO title="Cities & Regions — Admin" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Cities &amp; Regions
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage the Gilgit-Baltistan valley cards displayed in the homepage carousel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold rounded-2xl transition border border-stone-200 disabled:opacity-50"
            title="Automatically populate all 8 Gilgit-Baltistan valleys"
          >
            <span>🏔️</span>
            {seeding ? 'Seeding...' : 'Seed GB Valleys'}
          </button>

          <button
            onClick={() => setEditTarget('new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-apricot-500 hover:bg-apricot-400 text-white text-sm font-semibold rounded-2xl shadow-sm transition active:scale-95"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add City
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cities by name, body, or slug…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-apricot-400"
        />
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-stone-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error View */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between">
          <span>Failed to load: {error?.response?.data?.message || error?.message}</span>
          <button onClick={() => refetch()} className="text-xs underline font-semibold">Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && cities.length === 0 && (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 shadow-xs">
          <div className="text-5xl mb-3">🏔️</div>
          <h3 className="font-display font-bold text-mountain-900 text-lg">No cities added yet</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6">
            Get started by seeding all standard Gilgit-Baltistan valleys with 1 click, or add your custom valley manually.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-semibold rounded-2xl transition"
            >
              ⚡ Seed All 8 GB Valleys
            </button>
            <button
              onClick={() => setEditTarget('new')}
              className="px-5 py-2.5 bg-apricot-500 hover:bg-apricot-400 text-white text-sm font-semibold rounded-2xl shadow-sm transition"
            >
              + Add Custom City
            </button>
          </div>
        </div>
      )}

      {/* Cities List */}
      {!isLoading && !isError && cities.length > 0 && (
        <div className="space-y-3">
          {cities.map((city) => (
            <CityRow
              key={city._id}
              city={city}
              onEdit={(c) => setEditTarget(c)}
              onDelete={(c) => setDeleteTarget(c)}
              onToggleActive={(c) =>
                toggleActiveMutation.mutate({ id: c._id, isActive: !c.isActive })
              }
              toggling={toggleActiveMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editTarget && (
        <CityFormModal
          city={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={onSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          city={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
