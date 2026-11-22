import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';

export default function RawMaterialModal({ isOpen, onClose, initialData = null, suppliers = [] }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    type: 'raw_material',
    category: 'General',
    unit: 'kg',
    reorderLevel: '10',
    primarySupplier: '',
    description: '',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        sku: initialData.sku || '',
        type: initialData.type || 'raw_material',
        category: initialData.category || 'General',
        unit: initialData.unit || 'kg',
        reorderLevel: String(initialData.reorderLevel ?? 10),
        primarySupplier: initialData.primarySupplier?._id || initialData.primarySupplier || '',
        description: initialData.description || '',
      });
    } else {
      setForm({
        name: '',
        sku: '',
        type: 'raw_material',
        category: 'General',
        unit: 'kg',
        reorderLevel: '10',
        primarySupplier: '',
        description: '',
      });
    }
  }, [initialData, isOpen]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (initialData?._id) {
        const res = await api.put(`/admin/inventory/raw-materials/${initialData._id}`, payload);
        return res.data;
      }
      const res = await api.post('/admin/inventory/raw-materials', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success(initialData ? 'Raw material updated successfully' : 'Raw material created successfully');
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save raw material');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Material name is required');
      return;
    }
    mutation.mutate({
      name: form.name.trim(),
      sku: form.sku.trim(),
      type: form.type,
      category: form.category.trim() || 'General',
      unit: form.unit,
      reorderLevel: Number(form.reorderLevel) || 0,
      primarySupplier: form.primarySupplier || null,
      description: form.description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>{form.type === 'packaging_material' ? '📦' : '🌾'}</span>
            {initialData ? 'Edit Material / Supply' : 'Add New Raw Material or Supply'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Classification *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="raw_material">🌾 Bulk Raw Material (e.g. Walnuts, Almonds)</option>
                <option value="packaging_material">📦 Packaging Supply (e.g. Pouches, Jars, Labels)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Unit of Measure *
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="pcs">pcs (Pieces / Units)</option>
                <option value="liter">liter (Liters)</option>
                <option value="box">box (Boxes / Cartons)</option>
                <option value="meter">meter (Meters)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Material Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.type === 'packaging_material' ? 'e.g. 500g Standup Kraft Pouch' : 'e.g. Raw Walnut In-Shell'}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                SKU / Code (Optional)
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Dry Fruits, Pouches, Labels"
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Low Stock Alert Threshold ({form.unit})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Primary Vendor / Supplier
              </label>
              <select
                value={form.primarySupplier}
                onChange={(e) => setForm({ ...form, primarySupplier: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Specifications, supplier terms, or storage location..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : initialData ? 'Update Material' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
