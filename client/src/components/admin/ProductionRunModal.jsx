import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { fmtPKR } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function ProductionRunModal({ isOpen, onClose, products = [], rawMaterials = [] }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('80');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamic raw material inputs
  const [rawInputs, setRawInputs] = useState([
    { rawMaterialId: '', quantityUsed: '40' },
  ]);

  // Dynamic packaging material inputs
  const [packagingInputs, setPackagingInputs] = useState([
    { packagingMaterialId: '', quantityUsed: '80' },
  ]);

  // Expenses
  const [labourCost, setLabourCost] = useState('2000');
  const [processingCost, setProcessingCost] = useState('500');
  const [otherExpenses, setOtherExpenses] = useState('300');
  const [expenseNotes, setExpenseNotes] = useState('Sorting, packing wages & utility overheads');
  const [wasteQuantity, setWasteQuantity] = useState('0');
  const [wasteReason, setWasteReason] = useState('');
  const [notes, setNotes] = useState('');

  // Find target product and variant
  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId),
    [products, selectedProductId]
  );

  const selectedVariant = useMemo(
    () => selectedProduct?.variants?.find((v) => v.label === selectedVariantLabel),
    [selectedProduct, selectedVariantLabel]
  );

  // Filter raw materials vs packaging supplies
  const bulkMaterials = useMemo(
    () => rawMaterials.filter((m) => m.type === 'raw_material'),
    [rawMaterials]
  );

  const packagingSupplies = useMemo(
    () => rawMaterials.filter((m) => m.type === 'packaging_material'),
    [rawMaterials]
  );

  // Live Costing Calculations
  const costingSummary = useMemo(() => {
    let rawTotal = 0;
    rawInputs.forEach((item) => {
      const rm = rawMaterials.find((m) => m._id === item.rawMaterialId);
      const qty = Number(item.quantityUsed) || 0;
      const rate = rm ? (rm.averageCostMinor || rm.latestUnitCostMinor || 0) / 100 : 0;
      rawTotal += qty * rate;
    });

    let pkgTotal = 0;
    packagingInputs.forEach((item) => {
      const pm = rawMaterials.find((m) => m._id === item.packagingMaterialId);
      const qty = Number(item.quantityUsed) || 0;
      const rate = pm ? (pm.averageCostMinor || pm.latestUnitCostMinor || 0) / 100 : 0;
      pkgTotal += qty * rate;
    });

    const labour = Number(labourCost) || 0;
    const processing = Number(processingCost) || 0;
    const overhead = Number(otherExpenses) || 0;
    const expenseTotal = labour + processing + overhead;

    const totalBatchCost = rawTotal + pkgTotal + expenseTotal;
    const outputQty = Math.max(1, Number(outputQuantity) || 1);
    const costPerPackage = totalBatchCost / outputQty;

    const sellingPrice = selectedVariant?.price || 0;
    const profitPerPackage = sellingPrice > 0 ? sellingPrice - costPerPackage : 0;
    const markupPercent = costPerPackage > 0 ? ((sellingPrice - costPerPackage) / costPerPackage) * 100 : 0;
    const marginPercent = sellingPrice > 0 ? ((sellingPrice - costPerPackage) / sellingPrice) * 100 : 0;
    const expectedBatchProfit = profitPerPackage * outputQty;

    return {
      rawTotal,
      pkgTotal,
      expenseTotal,
      totalBatchCost,
      costPerPackage,
      sellingPrice,
      profitPerPackage,
      markupPercent,
      marginPercent,
      expectedBatchProfit,
    };
  }, [
    rawInputs,
    packagingInputs,
    rawMaterials,
    labourCost,
    processingCost,
    otherExpenses,
    outputQuantity,
    selectedVariant,
  ]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/inventory/production-batches', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryStock'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      toast.success(
        `Production Batch Completed! Created ${data.batch.outputQuantity} units of ${data.batch.targetProductName} (${data.batch.targetVariantLabel}) at Rs. ${(data.batch.costPerPackageMinor / 100).toFixed(2)}/pkg`
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Production run failed');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId || !selectedVariantLabel) {
      toast.error('Please select both a target product and finished package variant');
      return;
    }

    const validRawInputs = rawInputs.filter(
      (r) => r.rawMaterialId && Number(r.quantityUsed) > 0
    );
    if (validRawInputs.length === 0) {
      toast.error('Please add at least one raw material with a valid quantity');
      return;
    }

    const validPackagingInputs = packagingInputs.filter(
      (p) => p.packagingMaterialId && Number(p.quantityUsed) > 0
    );

    mutation.mutate({
      targetProductId: selectedProductId,
      targetVariantLabel: selectedVariantLabel,
      outputQuantity: Number(outputQuantity),
      productionDate,
      rawMaterialInputs: validRawInputs.map((r) => ({
        rawMaterialId: r.rawMaterialId,
        quantityUsed: Number(r.quantityUsed),
      })),
      packagingInputs: validPackagingInputs.map((p) => ({
        packagingMaterialId: p.packagingMaterialId,
        quantityUsed: Number(p.quantityUsed),
      })),
      labourCost: Number(labourCost) || 0,
      processingCost: Number(processingCost) || 0,
      otherExpenses: Number(otherExpenses) || 0,
      expenseNotes: expenseNotes.trim(),
      wasteQuantity: Number(wasteQuantity) || 0,
      wasteReason: wasteReason.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>🏭</span>
              New Raw Material Processing &amp; Packaging Run
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Convert bulk raw stock and packaging into finished ready-to-sell packages
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Section 1: Target Finished Product */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              1. Target Finished Product &amp; Variant Output
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Finished Product *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p._id === e.target.value);
                    setSelectedVariantLabel(prod?.variants?.[0]?.label || '');
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="">Select Catalog Product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Finished Package Variant *
                </label>
                <select
                  required
                  disabled={!selectedProduct}
                  value={selectedVariantLabel}
                  onChange={(e) => setSelectedVariantLabel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">Select Variant...</option>
                  {selectedProduct?.variants?.map((v) => (
                    <option key={v.label} value={v.label}>
                      {v.label} (Current Shelf: {v.stock}, Price: {fmtPKR(v.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Output Packages Count *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={outputQuantity}
                  onChange={(e) => setOutputQuantity(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Raw Materials Consumed */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                2. Bulk Raw Materials Consumed (e.g. 40 kg Walnuts)
              </h4>
              <button
                type="button"
                onClick={() => setRawInputs([...rawInputs, { rawMaterialId: '', quantityUsed: '1' }])}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                + Add Another Raw Material
              </button>
            </div>

            {rawInputs.map((item, idx) => {
              const selectedRm = rawMaterials.find((m) => m._id === item.rawMaterialId);
              const rate = selectedRm ? (selectedRm.averageCostMinor || selectedRm.latestUnitCostMinor || 0) / 100 : 0;
              const subtotal = (Number(item.quantityUsed) || 0) * rate;

              return (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex-1 min-w-[180px]">
                    <select
                      required
                      value={item.rawMaterialId}
                      onChange={(e) => {
                        const updated = [...rawInputs];
                        updated[idx].rawMaterialId = e.target.value;
                        setRawInputs(updated);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    >
                      <option value="">Select Raw Material...</option>
                      {bulkMaterials.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.currentStock} {m.unit} in stock @ {fmtPKR((m.averageCostMinor || m.latestUnitCostMinor || 0) / 100)}/{m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      required
                      min="0.001"
                      step="any"
                      value={item.quantityUsed}
                      onChange={(e) => {
                        const updated = [...rawInputs];
                        updated[idx].quantityUsed = e.target.value;
                        setRawInputs(updated);
                      }}
                      placeholder={`Qty (${selectedRm?.unit || 'unit'})`}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div className="w-28 text-right text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
                    {fmtPKR(subtotal)}
                  </div>

                  {rawInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRawInputs(rawInputs.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 3: Packaging Materials Consumed */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                3. Packaging Materials Consumed (e.g. 80 Pouches, 80 Labels)
              </h4>
              <button
                type="button"
                onClick={() => setPackagingInputs([...packagingInputs, { packagingMaterialId: '', quantityUsed: outputQuantity }])}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                + Add Packaging Item
              </button>
            </div>

            {packagingInputs.map((item, idx) => {
              const selectedPkg = rawMaterials.find((m) => m._id === item.packagingMaterialId);
              const rate = selectedPkg ? (selectedPkg.averageCostMinor || selectedPkg.latestUnitCostMinor || 0) / 100 : 0;
              const subtotal = (Number(item.quantityUsed) || 0) * rate;

              return (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex-1 min-w-[180px]">
                    <select
                      value={item.packagingMaterialId}
                      onChange={(e) => {
                        const updated = [...packagingInputs];
                        updated[idx].packagingMaterialId = e.target.value;
                        setPackagingInputs(updated);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    >
                      <option value="">Select Packaging Supply...</option>
                      {packagingSupplies.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.currentStock} {m.unit} in stock @ {fmtPKR((m.averageCostMinor || m.latestUnitCostMinor || 0) / 100)}/{m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantityUsed}
                      onChange={(e) => {
                        const updated = [...packagingInputs];
                        updated[idx].quantityUsed = e.target.value;
                        setPackagingInputs(updated);
                      }}
                      placeholder={`Qty (${selectedPkg?.unit || 'pcs'})`}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div className="w-28 text-right text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
                    {fmtPKR(subtotal)}
                  </div>

                  {packagingInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPackagingInputs(packagingInputs.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 4: Labour & Processing Expenses */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              4. Processing, Labour &amp; Production Expenses
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Packaging / Labour Wages (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={labourCost}
                  onChange={(e) => setLabourCost(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Processing / Utilities (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={processingCost}
                  onChange={(e) => setProcessingCost(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Other Additional Overheads (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherExpenses}
                  onChange={(e) => setOtherExpenses(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Waste / Shell Scrap Removed (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
                  placeholder="e.g. 0.5 kg"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Waste Reason / Sorting Notes
                </label>
                <input
                  type="text"
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  placeholder="e.g. Shell removal, broken or defect kernels"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Real-Time Calculated Costing & Margin Preview Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-indigo-500/10 to-transparent p-5 rounded-xl border border-emerald-500/30 dark:border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <span>💰</span> Real-Time Production Cost &amp; Profitability Preview
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                {outputQuantity || 0} packages
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-neutral-500 block text-[11px]">Raw Materials Cost:</span>
                <span className="font-bold text-neutral-900 dark:text-white text-sm font-mono">
                  {fmtPKR(costingSummary.rawTotal)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-neutral-500 block text-[11px]">Packaging Supplies:</span>
                <span className="font-bold text-neutral-900 dark:text-white text-sm font-mono">
                  {fmtPKR(costingSummary.pkgTotal)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-neutral-500 block text-[11px]">Labour &amp; Overheads:</span>
                <span className="font-bold text-neutral-900 dark:text-white text-sm font-mono">
                  {fmtPKR(costingSummary.expenseTotal)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                <span className="text-emerald-800 dark:text-emerald-400 block text-[11px] font-medium">
                  Total Production Cost:
                </span>
                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm font-mono">
                  {fmtPKR(costingSummary.totalBatchCost)}
                </span>
              </div>
            </div>

            {/* Per Package Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <span className="text-indigo-700 dark:text-indigo-300 block text-[11px] font-medium">
                  Cost Per Package:
                </span>
                <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-base font-mono">
                  {fmtPKR(costingSummary.costPerPackage)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-neutral-500 block text-[11px]">Store Selling Price:</span>
                <span className="font-bold text-neutral-900 dark:text-white text-base font-mono">
                  {costingSummary.sellingPrice > 0 ? fmtPKR(costingSummary.sellingPrice) : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-neutral-500 block text-[11px]">Profit Per Package:</span>
                <span
                  className={`font-bold text-base font-mono ${
                    costingSummary.profitPerPackage >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {costingSummary.sellingPrice > 0 ? fmtPKR(costingSummary.profitPerPackage) : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-neutral-500 block text-[11px]">Markup / Margin:</span>
                <span className="font-bold text-neutral-900 dark:text-white text-sm font-mono block">
                  {costingSummary.sellingPrice > 0
                    ? `${costingSummary.markupPercent.toFixed(1)}% / ${costingSummary.marginPercent.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            </div>
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
              disabled={mutation.isPending || !selectedProductId || !selectedVariantLabel}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {mutation.isPending ? 'Executing Batch...' : '🚀 Complete Production & Restock Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
