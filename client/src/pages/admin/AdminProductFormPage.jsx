import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const WEIGHT_CATEGORY_SLUGS = new Set(['dry-fruits', 'natural-herbs']);
const WEIGHT_VARIANT_LABELS = ['250g', '500g', '1kg'];

function isWeightCategory(category) {
  if (!category) return false;
  return (
    WEIGHT_CATEGORY_SLUGS.has(category.slug) ||
    ['dry fruits', 'natural herbs'].includes(String(category.name || '').toLowerCase())
  );
}

function toVariantRows(variants = []) {
  return variants.map((v) => ({
    label: v.label,
    price: v.price,
    stock: v.stock,
  }));
}

// Keep Dry Fruits / Natural Herbs products on the three customer-facing sizes.
// Existing single-variant products are converted using their old price/stock as
// the 1kg base, so the storefront starts showing all three sizes immediately.
function normalizeWeightVariants(variants = []) {
  const rows = variants.map((v) => ({
    label: String(v.label || '').trim(),
    price: v.price === undefined || v.price === null ? '' : v.price,
    stock: v.stock === undefined || v.stock === null ? '' : v.stock,
  }));

  const bySize = new Map();
  rows.forEach((row) => {
    const key = row.label.toLowerCase();
    if (WEIGHT_VARIANT_LABELS.some((label) => label.toLowerCase() === key)) {
      bySize.set(key, row);
    }
  });

  const hasPrice = (row) => row && row.price !== '' && Number(row.price) > 0;
  const hasStock = (row) => row && row.stock !== '' && !Number.isNaN(Number(row.stock));
  const baseRow =
    rows.filter(hasPrice).sort((a, b) => Number(b.price) - Number(a.price))[0] || rows[0];

  let pricePerKg = '';
  if (hasPrice(bySize.get('1kg'))) pricePerKg = Number(bySize.get('1kg').price);
  else if (hasPrice(bySize.get('500g'))) pricePerKg = Number(bySize.get('500g').price) * 2;
  else if (hasPrice(bySize.get('250g'))) pricePerKg = Number(bySize.get('250g').price) * 4;
  else if (hasPrice(baseRow)) pricePerKg = Number(baseRow.price);

  let stockPerKg = '';
  if (hasStock(bySize.get('1kg'))) stockPerKg = Number(bySize.get('1kg').stock);
  else if (hasStock(bySize.get('500g'))) stockPerKg = Number(bySize.get('500g').stock) * 0.5;
  else if (hasStock(bySize.get('250g'))) stockPerKg = Number(bySize.get('250g').stock) * 0.25;
  else {
    const stockFallback = baseRow && hasStock(baseRow) ? baseRow : rows.find(hasStock);
    if (stockFallback) stockPerKg = Number(stockFallback.stock);
  }

  return WEIGHT_VARIANT_LABELS.map((label) => {
    const existing = bySize.get(label.toLowerCase());
    const fraction = label === '250g' ? 0.25 : label === '500g' ? 0.5 : 1;
    const multiplier = label === '250g' ? 4 : label === '500g' ? 2 : 1;
    return {
      label,
      price:
        existing && existing.price !== ''
          ? existing.price
          : pricePerKg !== ''
          ? Math.max(1, Math.round(pricePerKg * fraction))
          : '',
      stock:
        existing && existing.stock !== ''
          ? existing.stock
          : stockPerKg !== ''
          ? Math.max(0, Math.round(stockPerKg * multiplier))
          : '',
    };
  });
}

function ProductForm({ initialData, categories, artisans, isEditMode, id }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Form State initialized directly from initialData
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [category, setCategory] = useState(
    initialData?.category?._id || initialData?.category || ''
  );
  const [artisan, setArtisan] = useState(
    initialData?.artisan?._id || initialData?.artisan || ''
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [origin, setOrigin] = useState(initialData?.origin || 'Hunza, Gilgit-Baltistan');
  const [isFeatured, setIsFeatured] = useState(Boolean(initialData?.isFeatured));
  const [isSeasonal, setIsSeasonal] = useState(Boolean(initialData?.isSeasonal));
  const [isActive, setIsActive] = useState(
    initialData?.isActive !== undefined ? initialData.isActive : true
  );

  // Variants state (at least 1 row required)
  const [variants, setVariants] = useState(() => {
    const existing = initialData?.variants?.length
      ? toVariantRows(initialData.variants)
      : null;
    const initialCategory =
      initialData?.category && typeof initialData.category === 'object'
        ? initialData.category
        : categories.find((c) => c._id === (initialData?.category || ''));

    if (isWeightCategory(initialCategory)) {
      return normalizeWeightVariants(existing || []);
    }
    return existing || [{ label: 'Standard', price: '', stock: '' }];
  });

  // Images state: [{ url, publicId, alt }]
  const [images, setImages] = useState(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Video state
  const [videoUrl, setVideoUrl] = useState(initialData?.video?.url || '');
  const [videoPublicId] = useState(initialData?.video?.publicId || '');

  // Validation errors
  const [errors, setErrors] = useState({});

  const selectedCategory =
    categories.find((c) => c._id === category) ||
    (category && initialData?.category && typeof initialData.category === 'object'
      ? initialData.category
      : null);
  const weightCategorySelected = isWeightCategory(selectedCategory);

  const generateSlug = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isEditMode || !slug) {
      setSlug(generateSlug(val));
    }
  };

  const handleCategoryChange = (e) => {
    const nextCategoryId = e.target.value;
    setCategory(nextCategoryId);
    const nextCategory = categories.find((c) => c._id === nextCategoryId);
    if (isWeightCategory(nextCategory)) {
      setVariants((prev) => normalizeWeightVariants(prev));
    }
  };

  const addVariantRow = () => {
    if (weightCategorySelected) return;
    setVariants((prev) => [...prev, { label: '', price: '', stock: '' }]);
  };

  const removeVariantRow = (index) => {
    if (weightCategorySelected) return;
    if (variants.length <= 1) {
      toast.warning('A product must have at least one variant.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index, field, value) => {
    setVariants((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleImageFiles = async (files) => {
    setUploadError('');
    const validFiles = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setUploadError(`File "${file.name}" is not supported. Please upload JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api.post('/admin/upload?folder=products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return {
          url: res.data.url,
          publicId: res.data.publicId,
          alt: name ? `${name} image` : 'Product image',
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...uploadedImages]);
      toast.success(`${uploadedImages.length} image(s) uploaded successfully`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload images to Cloudinary');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (index) => {
    const target = images[index];
    if (target?.publicId) {
      try {
        await api.delete('/admin/upload', { data: { publicId: target.publicId } });
      } catch {
        // Ignored
      }
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    toast.info('Image removed');
  };

  const updateImageAlt = (index, alt) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, alt } : img))
    );
  };

  const validateForm = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }
    if (!slug.trim() || slug.trim().length < 2) {
      errs.slug = 'Slug must be at least 2 characters';
    }
    if (!category) {
      errs.category = 'Category is required';
    }
    if (!description.trim() || description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters';
    }

    if (!variants || variants.length === 0) {
      errs.variants = 'At least one variant is required';
    } else {
      variants.forEach((v, i) => {
        if (!v.label.trim()) {
          errs[`variant_${i}_label`] = 'Label required';
        }
        if (v.price === '' || isNaN(Number(v.price)) || Number(v.price) <= 0) {
          errs[`variant_${i}_price`] = 'Price must be > 0';
        }
        if (v.stock === '' || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
          errs[`variant_${i}_stock`] = 'Stock must be >= 0';
        }
      });

      if (weightCategorySelected) {
        const labels = variants.map((v) => v.label.trim().toLowerCase());
        if (!WEIGHT_VARIANT_LABELS.every((label) => labels.includes(label.toLowerCase()))) {
          errs.variants =
            'Dry Fruits and Natural Herbs products must include 250g, 500g, and 1kg sizes.';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditMode) {
        const res = await api.put(`/admin/products/${id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/admin/products', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Product updated successfully' : 'Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      navigate('/admin/products');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save product');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      category,
      artisan: artisan && artisan.trim() ? artisan.trim() : null,
      description: description.trim(),
      origin: origin.trim() || 'Hunza, Gilgit-Baltistan',
      isFeatured,
      isSeasonal,
      isActive,
      variants: variants.map((v) => ({
        label: v.label.trim(),
        price: Number(v.price),
        stock: parseInt(v.stock, 10),
      })),
      images: images.map((img) => ({
        url: img.url,
        publicId: img.publicId,
        alt: img.alt || '',
      })),
      video: videoUrl ? { url: videoUrl.trim(), publicId: videoPublicId.trim() } : undefined,
    };

    mutation.mutate(payload);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-xs">
      <div className="border-b border-stone-100 pb-5 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-mountain-900">
          {isEditMode ? `Edit "${name || 'Product'}"` : 'Create New Product'}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Fill in the information below to {isEditMode ? 'update' : 'publish'} this Karakoram product.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold font-display text-mountain-900 uppercase tracking-wider text-apricot-700">
            1. Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-name" className="block text-xs font-semibold text-stone-700 mb-1.5">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Hunza Organic Dried Apricots"
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition ${
                  errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200'
                }`}
              />
              {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="prod-slug" className="block text-xs font-semibold text-stone-700 mb-1.5">
                URL Slug <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-400">
                  /products/
                </span>
                <input
                  id="prod-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="hunza-organic-dried-apricots"
                  className={`w-full pl-24 pr-3.5 py-2.5 text-sm font-mono bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition ${
                    errors.slug ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200'
                  }`}
                />
              </div>
              {errors.slug && <p className="text-rose-600 text-xs mt-1">{errors.slug}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-cat" className="block text-xs font-semibold text-stone-700 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="prod-cat"
                value={category}
                onChange={handleCategoryChange}
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition ${
                  errors.category ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.group ? `(${c.group})` : ''}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-rose-600 text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label htmlFor="prod-artisan" className="block text-xs font-semibold text-stone-700 mb-1.5">
                Artisan Maker <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <select
                id="prod-artisan"
                value={artisan}
                onChange={(e) => setArtisan(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition"
              >
                <option value="">None (General Mountain Harvest)</option>
                {artisans.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} {a.village ? `(${a.village})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="prod-desc" className="block text-xs font-semibold text-stone-700 mb-1.5">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="prod-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the craft, harvesting process, origin notes, taste profile or dimensions..."
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition ${
                  errors.description ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200'
                }`}
              />
              <div className="flex justify-between items-center text-xs text-stone-400 mt-1">
                <span>Minimum 10 characters</span>
                <span>{description.length} chars</span>
              </div>
              {errors.description && <p className="text-rose-600 text-xs mt-0.5">{errors.description}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="prod-origin" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Place of Origin
            </label>
            <input
              id="prod-origin"
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Karimabad, Hunza Valley"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* Variants & Pricing */}
        <div className="space-y-4 pt-6 border-t border-stone-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold font-display text-mountain-900 uppercase tracking-wider text-apricot-700">
                2. {weightCategorySelected ? 'Sizes & Inventory' : 'Variants & Inventory'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {weightCategorySelected
                  ? 'This category uses fixed 250g, 500g, and 1kg sizes. Set the price and stock for each size.'
                  : 'Specify package weights, sizes, price in PKR, and available stock units.'}
              </p>
            </div>
            {weightCategorySelected ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-apricot-50 px-2.5 py-1 text-[11px] font-semibold text-apricot-700">
                250g · 500g · 1kg
              </span>
            ) : (
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Variant</span>
              </button>
            )}
          </div>

          {errors.variants && <p className="text-rose-600 text-xs">{errors.variants}</p>}

          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    {weightCategorySelected
                      ? 'Size'
                      : 'Variant Label (e.g. 250g, 500g, Small)'}
                  </label>
                  <input
                    type="text"
                    value={v.label}
                    onChange={(e) => updateVariantRow(idx, 'label', e.target.value)}
                    readOnly={weightCategorySelected}
                    aria-readonly={weightCategorySelected || undefined}
                    placeholder="e.g. 500g Jar"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-apricot-500 focus:outline-hidden ${
                      weightCategorySelected
                        ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                        : 'bg-white border-stone-200'
                    }`}
                  />
                  {errors[`variant_${idx}_label`] && (
                    <span className="text-rose-600 text-[11px] block mt-0.5">
                      {errors[`variant_${idx}_label`]}
                    </span>
                  )}
                </div>

                <div className="w-full sm:w-36">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Price (PKR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={v.price}
                    onChange={(e) => updateVariantRow(idx, 'price', e.target.value)}
                    placeholder="1200"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                  {errors[`variant_${idx}_price`] && (
                    <span className="text-rose-600 text-[11px] block mt-0.5">
                      {errors[`variant_${idx}_price`]}
                    </span>
                  )}
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={v.stock}
                    onChange={(e) => updateVariantRow(idx, 'stock', e.target.value)}
                    placeholder="25"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                  />
                  {errors[`variant_${idx}_stock`] && (
                    <span className="text-rose-600 text-[11px] block mt-0.5">
                      {errors[`variant_${idx}_stock`]}
                    </span>
                  )}
                </div>

                {!weightCategorySelected && (
                  <div className="sm:self-end">
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      disabled={variants.length <= 1}
                      className="w-full sm:w-auto p-2 text-stone-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-stone-400 transition"
                      aria-label="Remove variant"
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {weightCategorySelected && (
            <p className="text-[11px] text-stone-500">
              Prices are per pack size. Stock is the number of packs available for each size.
            </p>
          )}
        </div>

        {/* Media Upload */}
        <div className="space-y-4 pt-6 border-t border-stone-100">
          <div>
            <h2 className="text-sm font-bold font-display text-mountain-900 uppercase tracking-wider text-apricot-700">
              3. Product Media & Gallery
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Upload JPG, PNG, or WebP images (under 5MB). Set descriptive alt texts for accessibility & SEO.
            </p>
          </div>

          <div className="p-6 border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50/50 text-center hover:bg-stone-50 transition relative">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files) handleImageFiles(e.target.files);
                e.target.value = '';
              }}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Upload product images"
            />
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <svg className="w-10 h-10 text-stone-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-semibold text-stone-700">
                {isUploading ? 'Uploading to Cloudinary...' : 'Click or drag images here to upload'}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                JPG, PNG, WebP up to 5MB each
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {uploadError}
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {images.map((img, i) => (
                <div
                  key={img.publicId || i}
                  className="p-3 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2 relative group"
                >
                  <div className="w-full h-36 bg-stone-100 rounded-lg overflow-hidden border border-stone-100 relative">
                    <img src={img.url} alt={img.alt || name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg shadow-sm transition"
                      title="Remove image"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                      Alt Text (SEO)
                    </label>
                    <input
                      type="text"
                      value={img.alt || ''}
                      onChange={(e) => updateImageAlt(i, e.target.value)}
                      placeholder="Image description"
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <label htmlFor="prod-video" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Optional Product Video URL
            </label>
            <input
              id="prod-video"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or direct video link"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-apricot-500 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-4 pt-6 border-t border-stone-100">
          <h2 className="text-sm font-bold font-display text-mountain-900 uppercase tracking-wider text-apricot-700">
            4. Catalog Flags & Visibility
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-apricot-600 rounded-sm border-stone-300 focus:ring-apricot-500"
              />
              <div>
                <span className="text-xs font-bold text-mountain-900 block">Active Status</span>
                <span className="text-[11px] text-stone-500">Visible in public store</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-apricot-600 rounded-sm border-stone-300 focus:ring-apricot-500"
              />
              <div>
                <span className="text-xs font-bold text-mountain-900 block">Featured Item</span>
                <span className="text-[11px] text-stone-500">Highlighted on Home</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition">
              <input
                type="checkbox"
                checked={isSeasonal}
                onChange={(e) => setIsSeasonal(e.target.checked)}
                className="w-4 h-4 text-apricot-600 rounded-sm border-stone-300 focus:ring-apricot-500"
              />
              <div>
                <span className="text-xs font-bold text-mountain-900 block">Seasonal Harvest</span>
                <span className="text-[11px] text-stone-500">Limited-time badge</span>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-stone-200 flex items-center justify-end gap-3">
          <Link
            to="/admin/products"
            className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending || isUploading}
            className="px-6 py-2.5 rounded-xl bg-apricot-500 hover:bg-apricot-600 text-white text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Saving...'
              : isEditMode
              ? 'Update Product'
              : 'Publish Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const { data: artisans = [] } = useQuery({
    queryKey: ['admin-artisans'],
    queryFn: async () => {
      const res = await api.get('/admin/artisans');
      return res.data;
    },
  });

  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const res = await api.get(`/admin/products/${id}`);
      return res.data;
    },
    enabled: isEditMode,
  });

  if (isLoadingCategories || (isEditMode && isLoadingProduct)) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-4 border-apricot-200 border-t-apricot-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-stone-600">Loading product information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO title={`${isEditMode ? 'Edit Product' : 'Add New Product'} - Admin`} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Link to="/admin/products" className="hover:text-stone-900 transition font-medium">
            &larr; Products Catalog
          </Link>
          <span>/</span>
          <span className="text-stone-900 font-semibold">
            {isEditMode ? 'Edit Product' : 'New Product'}
          </span>
        </div>
      </div>

      <ProductForm
        key={existingProduct?._id || 'new-product-form'}
        initialData={existingProduct}
        categories={categories}
        artisans={artisans}
        isEditMode={isEditMode}
        id={id}
      />
    </div>
  );
}
