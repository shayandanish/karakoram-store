import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';

export default function RawMaterialAdjustModal({ isOpen, onClose, material }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [adjustmentType, setAdjustmentType] = useState('physical_count_correction');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/inventory/raw-materials/adjust', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success(
        `Stock adjusted for ${material.name}: ${data.previousStock} → ${data.currentStock} ${material.unit}`
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to adjust stock');
    },
  });

  if (!isOpen || !material) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const qtyNum = Number(quantity);
    if (Number.isNaN(qtyNum) || qtyNum < 0) {
      toast.error('Please enter a valid non-negative quantity');
      return;
    }

    mutation.mutate({
      rawMaterialId: material._id,
      quantity: qtyNum,
      mode: adjustmentType === 'physical_count_correction' ? 'set' : 'relative',
      adjustmentType,
      reason: reason.trim() || `Raw material ${adjustmentType} adjustment`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              Adjust Material Stock
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {material.name} ({material.sku})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="my-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between text-xs">
          <span className="text-neutral-500">Current Warehouse Balance:</span>
          <span className="font-bold text-neutral-900 dark:text-white text-sm">
            {material.currentStock} {material.unit}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Adjustment Type *
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              <option value="physical_count_correction">
                📋 Physical Count Audit (Sets exact counted quantity)
              </option>
              <option value="damage_loss">
                ⚠️ Spoilage / Damage / Discard (Deducts quantity)
              </option>
              <option value="opening_stock">
                ➕ Manual Intake / Correction (Adds quantity)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {adjustmentType === 'physical_count_correction'
                ? `Actual Counted Quantity (${material.unit}) *`
                : `Quantity to ${adjustmentType === 'damage_loss' ? 'Deduct' : 'Add'} (${material.unit}) *`}
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 20"
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Audit Note / Reason *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Monthly physical inventory count audit"
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
              {mutation.isPending ? 'Saving...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
