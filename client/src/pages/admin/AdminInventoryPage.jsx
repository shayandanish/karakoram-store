import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { fmtPKR, cloudinaryImage } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';
import ProductionRunModal from '../../components/admin/ProductionRunModal';
import RawMaterialModal from '../../components/admin/RawMaterialModal';
import RawMaterialAdjustModal from '../../components/admin/RawMaterialAdjustModal';

const getStockBadgeConfig = (stock) => {
  if (stock === 0) {
    return {
      label: 'Out of Stock',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
      dotClass: 'bg-red-500',
    };
  }
  if (stock <= 5) {
    return {
      label: 'Low Stock',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      dotClass: 'bg-amber-500 animate-pulse',
    };
  }
  return {
    label: 'In Stock',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    dotClass: 'bg-emerald-500',
  };
};

const getMovementTypeBadge = (type) => {
  switch (type) {
    case 'goods_received':
      return { label: 'Goods Received', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    case 'damage_loss':
      return { label: 'Damaged / Loss', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' };
    case 'physical_count_correction':
      return { label: 'Count Audit', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
    case 'internal_use':
      return { label: 'Internal Sample', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
    case 'warehouse_to_store':
      return { label: 'Warehouse → Shelf Transfer', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' };
    case 'purchase_bill':
      return { label: 'Warehouse Purchase Receipt', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' };
    case 'order_sale':
      return { label: 'POS / Online Sale', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    case 'order_cancelled':
      return { label: 'Cancelled Restock', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' };
    case 'packaging_production':
      return { label: 'Packaging Run (+Finished)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    default:
      return { label: type, color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300' };
  }
};

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' | 'adjust' | 'movements' | 'reorder'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Selected item for Adjustment modal / tab
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('goods_received');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentReference, setAdjustmentReference] = useState('');

  // Transfer from Warehouse to Store Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState({
    product: null,
    variantLabel: '',
    warehouseStock: 0,
    storeStock: 0,
  });
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferReason, setTransferReason] = useState('Moved to store shelf');
  const [transferReference, setTransferReference] = useState('');

  // Movements filter
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [movementPage, setMovementPage] = useState(1);

  // Fetch Stock Overview
  const { data: stockData, isLoading: isStockLoading } = useQuery({
    queryKey: ['admin-inventory-stock', search, categoryFilter, supplierFilter, stockStatusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter) params.append('category', categoryFilter);
      if (supplierFilter) params.append('supplier', supplierFilter);
      if (stockStatusFilter !== 'all') params.append('stockStatus', stockStatusFilter);
      params.append('page', page);
      params.append('limit', 20);

      const res = await api.get(`/admin/inventory/stock?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Categories & Suppliers for filters
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = await api.get('/admin/suppliers');
      return res.data?.suppliers || [];
    },
  });
  const suppliers = suppliersData || [];

  // Raw Materials Tab State
  const [rawSearch, setRawSearch] = useState('');
  const [rawTypeFilter, setRawTypeFilter] = useState('');
  const [rawCategoryFilter, setRawCategoryFilter] = useState('');
  const [rawStockFilter, setRawStockFilter] = useState('all');
  const [rawPage, setRawPage] = useState(1);
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawEditTarget, setRawEditTarget] = useState(null);
  const [rawAdjustModalOpen, setRawAdjustModalOpen] = useState(false);
  const [rawAdjustTarget, setRawAdjustTarget] = useState(null);

  // Production Batches Tab State
  const [productionModalOpen, setProductionModalOpen] = useState(false);
  const [productionPage, setProductionPage] = useState(1);
  const [productionProductFilter, setProductionProductFilter] = useState('');

  // Fetch Raw Materials
  const { data: rawMaterialsData, isLoading: isRawLoading } = useQuery({
    queryKey: ['rawMaterials', rawSearch, rawTypeFilter, rawCategoryFilter, rawStockFilter, rawPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rawSearch.trim()) params.append('search', rawSearch.trim());
      if (rawTypeFilter) params.append('type', rawTypeFilter);
      if (rawCategoryFilter) params.append('category', rawCategoryFilter);
      if (rawStockFilter !== 'all') params.append('stockStatus', rawStockFilter);
      params.append('page', rawPage);
      params.append('limit', 20);

      const res = await api.get(`/admin/inventory/raw-materials?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Production Batches
  const { data: productionBatchesData, isLoading: isProductionLoading } = useQuery({
    queryKey: ['productionBatches', productionProductFilter, productionPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productionProductFilter) params.append('targetProduct', productionProductFilter);
      params.append('page', productionPage);
      params.append('limit', 20);

      const res = await api.get(`/admin/inventory/production-batches?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Movements Log
  const { data: movementsData, isLoading: isMovementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ['admin-inventory-movements', movementTypeFilter, movementPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (movementTypeFilter) params.append('type', movementTypeFilter);
      params.append('page', movementPage);
      params.append('limit', 20);

      const res = await api.get(`/admin/inventory/movements?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'movements',
  });

  // Fetch Reorder Alerts
  const { data: reorderData, isLoading: isReorderLoading } = useQuery({
    queryKey: ['admin-inventory-reorder'],
    queryFn: async () => {
      const res = await api.get('/admin/inventory/reorder-alerts');
      return res.data;
    },
    enabled: activeTab === 'reorder',
  });

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/inventory/adjust', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-reorder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });

      // Reset form
      setAdjustmentQuantity('');
      setAdjustmentReason('');
      setAdjustmentReference('');
      if (activeTab === 'adjust') {
        setActiveTab('monitor');
      }
      setSelectedProduct(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to adjust stock';
      toast.error(msg);
    },
  });

  // Stock Transfer Mutation (Warehouse -> Store Shelf)
  const transferMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/inventory/transfer', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Stock transferred to store shelf successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-reorder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setTransferModalOpen(false);
      setTransferQuantity('');
      setTransferReason('Moved to store shelf');
      setTransferReference('');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to transfer stock';
      toast.error(msg);
    },
  });

  const handleOpenTransfer = (product, variantLabel, warehouseStock, storeStock) => {
    setTransferTarget({
      product,
      variantLabel,
      warehouseStock: warehouseStock || 0,
      storeStock: storeStock || 0,
    });
    setTransferQuantity(String(warehouseStock > 0 ? warehouseStock : 1));
    setTransferReason('Moved to store shelf');
    setTransferReference('');
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferTarget.product?._id || !transferTarget.variantLabel) {
      toast.error('Missing product information');
      return;
    }
    const qty = parseInt(transferQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid positive transfer quantity');
      return;
    }
    if (qty > transferTarget.warehouseStock) {
      toast.error(`Only ${transferTarget.warehouseStock} units available in warehouse`);
      return;
    }

    transferMutation.mutate({
      productId: transferTarget.product._id,
      variantLabel: transferTarget.variantLabel,
      quantity: qty,
      reason: transferReason.trim(),
      reference: transferReference.trim(),
    });
  };

  // Reversal Mutation for Production Batches
  const reverseBatchMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await api.post(`/admin/inventory/production-batches/${id}/reverse`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      toast.success(data?.message || 'Production batch reversed successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reverse production batch');
    },
  });

  const handleReverseBatch = (batch) => {
    const reason = window.prompt(
      `Are you sure you want to reverse Production Batch #${batch.batchNumber}?\nThis will remove ${batch.outputQuantity} finished packages from stock and restore all consumed raw materials.\n\nEnter reason for reversal:`,
      'Correction of production entry error'
    );
    if (!reason || !reason.trim()) return;
    reverseBatchMutation.mutate({ id: batch._id, reason: reason.trim() });
  };

  const handleOpenAdjust = (product, variantLabel) => {
    setSelectedProduct(product);
    setSelectedVariant(variantLabel);
    setAdjustmentType('goods_received');
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setAdjustmentReference('');
    setActiveTab('adjust');
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct?._id || !selectedVariant) {
      toast.error('Please select a product and variant');
      return;
    }
    const qty = parseInt(adjustmentQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    if (adjustmentType === 'goods_received') {
      const warehouseStock = currentVariantObj?.warehouseStock || 0;
      if (qty <= 0) {
        toast.error('Quantity to add must be greater than zero');
        return;
      }
      if (warehouseStock < qty) {
        toast.error(`Cannot adjust: requested ${qty} units, but warehouse only has ${warehouseStock} units available.`);
        return;
      }
    }

    if (!adjustmentReason.trim()) {
      toast.error('Please provide a reason for this stock adjustment');
      return;
    }

    adjustMutation.mutate({
      productId: selectedProduct._id,
      variantLabel: selectedVariant,
      adjustmentType,
      quantity: qty,
      reason: adjustmentReason.trim(),
      reference: adjustmentReference.trim(),
    });
  };

  const currentVariantObj = useMemo(() => {
    if (!selectedProduct || !selectedVariant) return null;
    return selectedProduct.variants?.find((v) => v.label === selectedVariant) || null;
  }, [selectedProduct, selectedVariant]);

  const warehouseShortage = useMemo(() => {
    if (adjustmentType !== 'goods_received' || !currentVariantObj) return false;
    const warehouseStock = currentVariantObj.warehouseStock || 0;
    const qty = parseInt(adjustmentQuantity, 10);
    if (warehouseStock === 0) return 'zero_warehouse';
    if (!isNaN(qty) && qty > warehouseStock) return 'exceeds_warehouse';
    return false;
  }, [adjustmentType, currentVariantObj, adjustmentQuantity]);

  const kpis = stockData?.kpis || { totalUnits: 0, totalVariants: 0, lowStockVariants: 0, outOfStockVariants: 0 };

  return (
    <div className="space-y-6">
      <SEO title="Inventory & Stock Management | Admin" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📦</span> Warehouse & Inventory Control
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time physical stock counts, warehouse receiving, damage audits, and supplier replenishment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Manage Products ↗
          </Link>
          <Link
            to="/admin/accounts"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            Accounts & Bills ↗
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Store Shelf Stock
          </div>
          <div className="mt-1.5 text-2xl font-bold text-neutral-900 dark:text-white">
            {kpis.totalUnits.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-500">Sellable on shelf</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-sky-200 dark:border-sky-900/50 bg-sky-50/20 dark:bg-sky-950/10 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            Warehouse Stock
          </div>
          <div className="mt-1.5 text-2xl font-bold text-sky-700 dark:text-sky-300">
            {(kpis.totalWarehouseUnits || 0).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-sky-600/80">In godown / backroom</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
            Transfer Needed
          </div>
          <div className="mt-1.5 text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {(kpis.transferNeededVariants || 0).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-indigo-600/80">Shelf ≤ 3 &amp; in warehouse</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Low Stock Alerts
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {kpis.lowStockVariants.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-amber-700/80">Stock ≤ 5 units</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 rounded-xl p-3.5 shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wider">
            Out of Stock
          </div>
          <div className="mt-1.5 text-2xl font-bold text-red-600 dark:text-red-400">
            {kpis.outOfStockVariants.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-red-700/80">Zero shelf inventory</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'monitor'
            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
        >
          📊 Live Finished Stock
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('production')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'production'
            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
        >
          🏭 Packaging &amp; Production
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('raw_materials')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'raw_materials'
            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
        >
          🌾 Raw Materials &amp; Supplies
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adjust')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'adjust'
            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
        >
          ⚡ Quick Adjustment
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'movements'
            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
        >
          📜 Movement Audit Log
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reorder')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reorder'
            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
        >
          🚨 Reorder Center
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: LIVE STOCK MONITOR
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'monitor' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Search Product or SKU
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g. Hunza Shawl, Ring..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Primary Supplier
                </label>
                <select
                  value={supplierFilter}
                  onChange={(e) => {
                    setSupplierFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Stock Health
                </label>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => {
                    setStockStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Inventory</option>
                  <option value="transfer_needed">🚚 Transfer Needed (Shelf ≤ 3 &amp; in warehouse)</option>
                  <option value="in_stock">Healthy (Stock &gt; 5)</option>
                  <option value="low_stock">Low Stock (1 - 5 units)</option>
                  <option value="out_of_stock">Out of Stock (0 units)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            {isStockLoading ? (
              <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                <div>Loading warehouse stock...</div>
              </div>
            ) : stockData?.products?.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
                <div className="text-3xl mb-2">📦</div>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200">No products found</div>
                <div className="text-xs text-neutral-400 mt-1">Try clearing filters or search query</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Primary Supplier</th>
                      <th className="px-4 py-3">Variant / SKU</th>
                      <th className="px-4 py-3 text-right">Selling Price</th>
                      <th className="px-4 py-3 text-center">Warehouse Stock</th>
                      <th className="px-4 py-3 text-center">Store Shelf Stock</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {stockData?.products?.map((product) => {
                      const image = product.images?.[0]?.url;
                      return product.variants?.map((variant, vIdx) => {
                        const statusConfig = getStockBadgeConfig(variant.stock);

                        return (
                          <tr
                            key={`${product._id}-${variant.label}-${vIdx}`}
                            className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                          >
                            {/* Product column (grouped appearance) */}
                            {vIdx === 0 ? (
                              <td
                                className="px-4 py-3 font-medium text-neutral-900 dark:text-white align-top"
                                rowSpan={product.variants.length}
                              >
                                <div className="flex items-center gap-2.5">
                                  {image ? (
                                    <img
                                      src={cloudinaryImage(image, 64, 64)}
                                      alt={product.name}
                                      className="w-10 h-10 object-cover rounded-md border border-neutral-200 dark:border-neutral-700 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 text-base shrink-0">
                                      📦
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                                      {product.name}
                                    </div>
                                    <div className="text-[11px] text-neutral-400 mt-0.5">
                                      Sold: {product.totalSold || 0} units
                                    </div>
                                  </div>
                                </div>
                              </td>
                            ) : null}

                            {vIdx === 0 ? (
                              <td
                                className="px-4 py-3 text-neutral-600 dark:text-neutral-400 align-top"
                                rowSpan={product.variants.length}
                              >
                                {product.category?.name || '—'}
                              </td>
                            ) : null}

                            {vIdx === 0 ? (
                              <td
                                className="px-4 py-3 text-neutral-600 dark:text-neutral-400 align-top"
                                rowSpan={product.variants.length}
                              >
                                {product.primarySupplier?.name ? (
                                  <div>
                                    <div className="font-medium text-neutral-900 dark:text-neutral-200">
                                      {product.primarySupplier.name}
                                    </div>
                                    {product.primarySupplier.phone && (
                                      <div className="text-[11px] text-neutral-400">
                                        {product.primarySupplier.phone}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-neutral-400 italic">Unassigned</span>
                                )}
                              </td>
                            ) : null}

                            {/* Variant-specific columns */}
                            <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200 font-medium">
                              <div>{variant.label}</div>
                              {variant.sku && (
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  SKU: {variant.sku}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right font-medium text-neutral-700 dark:text-neutral-300">
                              {fmtPKR(variant.price)}
                            </td>

                            {/* Warehouse Stock column */}
                            <td className="px-4 py-3 text-center">
                              {(variant.warehouseStock || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono">
                                  <span>🏭</span> {variant.warehouseStock}
                                </span>
                              ) : (
                                <span className="text-xs text-neutral-400 font-mono">0</span>
                              )}
                            </td>

                            {/* Store Shelf Stock column */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                                {variant.stock}
                              </span>
                              {variant.stock <= 3 && (variant.warehouseStock || 0) > 0 && (
                                <span className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse">
                                  ⚠️ Restock Shelf
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${statusConfig.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                                {statusConfig.label}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* If warehouse has stock -> Prominent Transfer button */}
                                {(variant.warehouseStock || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTransfer(product, variant.label, variant.warehouseStock, variant.stock)}
                                    title={`Transfer ${variant.warehouseStock} units from warehouse to store shelf`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
                                  >
                                    🚚 Transfer ({variant.warehouseStock})
                                  </button>
                                )}

                                {/* If shelf is 0 AND warehouse is 0 -> Buy from Vendor */}
                                {variant.stock === 0 && (variant.warehouseStock || 0) === 0 && (
                                  <Link
                                    to="/admin/accounts?tab=purchases"
                                    title="Out of stock! Purchase from vendor and record in Accounts"
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                                  >
                                    🛒 Buy from Vendor
                                  </Link>
                                )}

                                {/* Adjust button: always allowed, draws from warehouse if warehouseStock > 0 */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjust(product, variant.label)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                  title="Adjust store shelf stock"
                                >
                                  ⚡ Adjust
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {stockData?.pagination?.pages > 1 && (
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <div>
                  Page {stockData.pagination.page} of {stockData.pagination.pages} (
                  {stockData.pagination.total} products)
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= stockData.pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: QUICK STOCK ADJUSTMENT
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'adjust' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-5">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>⚡</span> Adjust Physical Stock
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Record floor goods arrival, report damaged items, write off shrinkage, or perform physical count audits.
            </p>
          </div>

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {/* Step 1: Select Product */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Product *
              </label>
              {selectedProduct ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <div className="font-medium text-xs text-neutral-900 dark:text-white">
                    {selectedProduct.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedVariant('');
                    }}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Change Product
                  </button>
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => {
                    const prod = stockData?.products?.find((p) => p._id === e.target.value);
                    if (prod) {
                      setSelectedProduct(prod);
                      setSelectedVariant(prod.variants?.[0]?.label || '');
                    }
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select a product from loaded catalog...</option>
                  {stockData?.products?.map((prod) => (
                    <option key={prod._id} value={prod._id}>
                      {prod.name} ({prod.variants?.length} variants)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Select Variant */}
            {selectedProduct && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Variant *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedProduct.variants?.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => setSelectedVariant(v.label)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${selectedVariant === v.label
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        }`}
                    >
                      <div className="font-medium">{v.label}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Shelf: <span className="font-bold text-neutral-900 dark:text-white">{v.stock}</span>
                        {(v.warehouseStock || 0) > 0 && (
                          <span className="block text-sky-700 dark:text-sky-400 font-semibold mt-0.5">
                            Warehouse: {v.warehouseStock}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warehouse Stock Available Notice */}
            {currentVariantObj && (currentVariantObj.warehouseStock || 0) > 0 && (
              <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-950 dark:text-sky-200 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">🏭</span>
                  <div>
                    <div className="font-bold">
                      {currentVariantObj.warehouseStock} units available in Warehouse!
                    </div>
                    <div className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5">
                      Adjusting <strong>Goods Received (+)</strong> draws directly from warehouse stock into store shelf. <strong>Physical Count Audits</strong> are done manually.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenTransfer(selectedProduct, currentVariantObj.label, currentVariantObj.warehouseStock, currentVariantObj.stock)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition shadow-2xs"
                >
                  <span>🚚</span> Quick Transfer Modal →
                </button>
              </div>
            )}

            {/* Zero stock alert & purchase guidance */}
            {currentVariantObj && currentVariantObj.stock === 0 && (currentVariantObj.warehouseStock || 0) === 0 && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="font-bold">Zero Stock on Hand</div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Need fresh inventory from a vendor/farmer? Record an invoice in <strong>Finance &amp; Accounts &gt; Supplier Bills</strong> to track unit purchase price, transport, and packaging costs.
                    </div>
                  </div>
                </div>
                <Link
                  to="/admin/accounts?tab=purchases"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-xs"
                >
                  <span>🧾</span> Record Vendor Bill →
                </Link>
              </div>
            )}

            {/* Step 3: Choose Adjustment Type */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Adjustment Action *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${adjustmentType === 'goods_received'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    value="goods_received"
                    checked={adjustmentType === 'goods_received'}
                    onChange={() => setAdjustmentType('goods_received')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      📦 Goods Received (+)
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Add incoming inventory from shipment
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${adjustmentType === 'damage_loss'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 ring-1 ring-red-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    value="damage_loss"
                    checked={adjustmentType === 'damage_loss'}
                    onChange={() => setAdjustmentType('damage_loss')}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-red-800 dark:text-red-300">
                      ⚠️ Damaged / Loss (-)
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Deduct damaged, expired, or stolen units
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${adjustmentType === 'physical_count_correction'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    value="physical_count_correction"
                    checked={adjustmentType === 'physical_count_correction'}
                    onChange={() => setAdjustmentType('physical_count_correction')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-blue-800 dark:text-blue-300">
                      📋 Manual Count Audit (Set)
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Directly set verified physical shelf count manually
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${adjustmentType === 'internal_use'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    value="internal_use"
                    checked={adjustmentType === 'internal_use'}
                    onChange={() => setAdjustmentType('internal_use')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-purple-800 dark:text-purple-300">
                      Internal / Sample (-)
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Deduct marketing samples or display items
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {adjustmentType === 'physical_count_correction'
                  ? 'New Exact Stock Count *'
                  : 'Quantity to Add / Deduct *'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  placeholder={adjustmentType === 'physical_count_correction' ? 'e.g. 24' : 'e.g. 10'}
                  className="w-full text-sm font-semibold px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                {currentVariantObj && (
                  <span className="absolute right-3 top-2.5 text-xs text-neutral-400">
                    Shelf: {currentVariantObj.stock} units | Warehouse: {currentVariantObj.warehouseStock || 0} units
                  </span>
                )}
              </div>

              {/* Warehouse Shortage Warning Alerts */}
              {warehouseShortage === 'zero_warehouse' && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
                  <span>⚠️ <strong>Warehouse has 0 units.</strong> Adding to store shelf is not allowed. Please record a vendor purchase first.</span>
                  <Link to="/admin/accounts?tab=purchases" className="font-bold underline shrink-0 text-rose-900 dark:text-rose-200">Record Purchase →</Link>
                </div>
              )}
              {warehouseShortage === 'exceeds_warehouse' && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                  ⚠️ <strong>Requested quantity ({adjustmentQuantity}) exceeds available warehouse stock ({currentVariantObj?.warehouseStock || 0})!</strong> Adding more units than available in the warehouse is not allowed.
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reason / Floor Note *
              </label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g. Received shipment from Gilgit, Glass broken during transit..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reference / Tracking # (Optional)
              </label>
              <input
                type="text"
                value={adjustmentReference}
                onChange={(e) => setAdjustmentReference(e.target.value)}
                placeholder="e.g. Courier Waybill #, Audit Batch 2026-A..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('monitor');
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustMutation.isPending || !selectedProduct || !selectedVariant || Boolean(warehouseShortage)}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-xs ${
                  warehouseShortage
                    ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-70'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                }`}
              >
                {adjustMutation.isPending
                  ? 'Saving...'
                  : warehouseShortage === 'zero_warehouse'
                    ? '🔒 Blocked: 0 Units in Warehouse'
                    : warehouseShortage === 'exceeds_warehouse'
                      ? `🔒 Blocked: Exceeds Warehouse (${currentVariantObj?.warehouseStock || 0})`
                      : adjustmentType === 'physical_count_correction'
                        ? 'Apply Manual Count Audit'
                        : adjustmentType === 'goods_received'
                          ? 'Apply Adjustment (Draw from Warehouse)'
                          : 'Apply Stock Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: MOVEMENT AUDIT LOG
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Type Filter */}
          <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Filter Type:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementTypeFilter(e.target.value);
                  setMovementPage(1);
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">All Movement Types</option>
                <option value="warehouse_to_store">Warehouse → Store Shelf Transfer</option>
                <option value="purchase_bill">Purchase Received (Warehouse)</option>
                <option value="goods_received">Goods Received (+)</option>
                <option value="damage_loss">Damaged / Loss (-)</option>
                <option value="physical_count_correction">Count Audit</option>
                <option value="internal_use">Internal Sample (-)</option>
                <option value="order_sale">POS / Online Sale (-)</option>
                <option value="order_cancelled">Cancelled Restock (+)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => refetchMovements()}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              🔄 Refresh Log
            </button>
          </div>

          {/* Movements Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            {isMovementsLoading ? (
              <div className="p-12 text-center text-neutral-500">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                <div>Loading stock movement history...</div>
              </div>
            ) : movementsData?.movements?.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <div className="text-3xl mb-2"></div>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200">No stock movements recorded yet</div>
                <div className="text-xs text-neutral-400 mt-1">Adjustments, orders, and receiving appear here automatically</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Product & Variant</th>
                      <th className="px-4 py-3">Movement Type</th>
                      <th className="px-4 py-3 text-center">Change</th>
                      <th className="px-4 py-3 text-center">Stock Path</th>
                      <th className="px-4 py-3">Staff / Cashier</th>
                      <th className="px-4 py-3">Reason / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {movementsData?.movements?.map((m) => {
                      const typeConfig = getMovementTypeBadge(m.type);
                      const isPositive = m.quantityChange > 0;
                      const dateStr = new Date(m.createdAt).toLocaleString('en-PK', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      });

                      return (
                        <tr key={m._id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30">
                          <td className="px-4 py-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">
                            <div>{m.productName}</div>
                            <div className="text-[11px] text-neutral-400 font-normal">
                              Variant: {m.variantLabel}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md ${typeConfig.color}`}
                            >
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono">
                            <span
                              className={
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            >
                              {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-neutral-500 text-[11px] whitespace-nowrap">
                            {m.stockBefore} → <span className="font-bold text-neutral-900 dark:text-white">{m.stockAfter}</span>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                            {m.actorName || 'Staff Member'}
                          </td>
                          <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">
                            <span title={m.reason}>{m.reason || '—'}</span>
                            {m.reference && (
                              <span className="block text-[10px] text-neutral-400 font-mono">
                                Ref: {m.reference}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {movementsData?.pagination?.pages > 1 && (
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <div>
                  Page {movementsData.pagination.page} of {movementsData.pagination.pages}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={movementPage <= 1}
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={movementPage >= movementsData.pagination.pages}
                    onClick={() => setMovementPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: REORDER CENTER
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reorder' && (
        <div className="space-y-4">
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
            <div className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Supplier Replenishment Suggestions
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
              The items below have stock levels ≤ 10 units. Grouped by their primary supplier for quick batch reordering via WhatsApp or Phone.
            </p>
          </div>

          {isReorderLoading ? (
            <div className="p-12 text-center text-neutral-500">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
              <div>Checking inventory replenishment needs...</div>
            </div>
          ) : reorderData?.groupedBySupplier?.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center text-neutral-500">
              <div className="text-3xl mb-2"></div>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200">All inventory levels are healthy!</div>
              <div className="text-xs text-neutral-400 mt-1">No items currently have stock ≤ 10 units.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {reorderData?.groupedBySupplier?.map((group) => {
                // Prepare WhatsApp message
                const itemList = group.items
                  .map((it) =>
                    it.itemType === 'raw_material'
                      ? `• 🌾 [Bulk Material] ${it.name} (${it.sku}): current stock ${it.currentStock} ${it.unit}, need ${it.recommendedReorder} ${it.unit}`
                      : `• 📦 [Product] ${it.productName} (${it.variantLabel}): current stock ${it.currentStock}, need ${it.recommendedReorder} pcs`
                  )
                  .join('%0A');
                const whatsappMessage = `Assalam-o-alaikum ${group.supplierName},%0A%0AWe would like to place a restock order for Karakoram Store:%0A${itemList}%0A%0APlease confirm availability and timeline. Thank you!`;
                const cleanPhone = (group.supplierPhone || '').replace(/[^0-9]/g, '');
                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${whatsappMessage}`
                  : `https://wa.me/?text=${whatsappMessage}`;

                return (
                  <div
                    key={group.supplierId || 'unassigned'}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs"
                  >
                    <div className="p-4 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                          <span>🏭</span> {group.supplierName}
                        </div>
                        {group.supplierPhone && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Phone: <a href={`tel:${group.supplierPhone}`} className="hover:underline">{group.supplierPhone}</a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/accounts?tab=purchases"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
                        >
                          <span>🧾</span> Record Vendor Bill
                        </Link>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                        >
                          <span>💬</span> WhatsApp Reorder
                        </a>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/20 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                          <tr>
                            <th className="px-4 py-2.5">Item Name</th>
                            <th className="px-4 py-2.5">Variant / SKU</th>
                            <th className="px-4 py-2.5 text-center">Current Stock</th>
                            <th className="px-4 py-2.5 text-center">Suggested Reorder</th>
                            <th className="px-4 py-2.5 text-right">Unit Price / Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/40">
                          {group.items.map((it, idx) => (
                            <tr key={`${it.itemType || 'p'}-${it.productId || it.rawMaterialId}-${it.variantLabel || it.sku}-${idx}`}>
                              <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-white">
                                {it.itemType === 'raw_material' ? `🌾 ${it.name}` : it.productName}
                              </td>
                              <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                                {it.itemType === 'raw_material' ? `${it.sku} (${it.unit})` : it.variantLabel}
                              </td>
                              <td className="px-4 py-2.5 text-center font-bold text-red-600 dark:text-red-400">
                                {it.currentStock} {it.itemType === 'raw_material' ? it.unit : ''}
                              </td>
                              <td className="px-4 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                +{it.recommendedReorder} {it.itemType === 'raw_material' ? it.unit : 'units'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-neutral-700 dark:text-neutral-300">
                                {fmtPKR(it.itemType === 'raw_material' ? it.rate : it.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: PACKAGING & PRODUCTION RUNS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          {/* Header Action & KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Total Production Batches
              </div>
              <div className="mt-1.5 text-2xl font-bold text-neutral-900 dark:text-white">
                {productionBatchesData?.pagination?.total || 0}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">Recorded conversions</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Total Finished Packages
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {productionBatchesData?.totals?.totalPackages?.toLocaleString() || 0}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-700/80">Added to inventory</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Total Manufacturing Value
              </div>
              <div className="mt-1.5 text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {fmtPKR((productionBatchesData?.totals?.totalProductionCostMinor || 0) / 100)}
              </div>
              <div className="mt-0.5 text-[11px] text-indigo-700/80">Landed production cost</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-center items-stretch">
              <button
                type="button"
                onClick={() => setProductionModalOpen(true)}
                className="w-full py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🏭</span> + New Packaging Run
              </button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Historical Processing &amp; Packaging Runs
                </h3>
                <p className="text-xs text-neutral-500">
                  Full batch-level trace: raw material consumption, labour/expenses, and finished landed package costs
                </p>
              </div>

              <select
                value={productionProductFilter}
                onChange={(e) => {
                  setProductionProductFilter(e.target.value);
                  setProductionPage(1);
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">All Finished Products</option>
                {stockData?.products?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {isProductionLoading ? (
              <div className="p-8 text-center text-xs text-neutral-500">Loading production records...</div>
            ) : !productionBatchesData?.batches?.length ? (
              <div className="p-12 text-center text-xs text-neutral-400">
                <span className="text-3xl block mb-2">🏭</span>
                No packaging runs recorded yet. Click &quot;+ New Packaging Run&quot; above to convert raw materials into finished packages.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th className="px-4 py-3">Batch Number</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Finished Product &amp; Variant</th>
                      <th className="px-4 py-3 text-center">Output Packages</th>
                      <th className="px-4 py-3 text-right">Raw Material Cost</th>
                      <th className="px-4 py-3 text-right">Packaging Cost</th>
                      <th className="px-4 py-3 text-right">Labour &amp; Expenses</th>
                      <th className="px-4 py-3 text-right">Total Batch Cost</th>
                      <th className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-400">Cost / Pkg</th>
                      <th className="px-4 py-3 text-right">Selling Price</th>
                      <th className="px-4 py-3 text-right">Profit / Pkg</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {productionBatchesData.batches.map((batch) => {
                      const costPerPkg = (batch.costPerPackageMinor || 0) / 100;
                      const sellPrice = batch.sellingPriceSnapshot || 0;
                      const unitProfit = sellPrice > 0 ? sellPrice - costPerPkg : 0;

                      return (
                        <tr key={batch._id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                            {batch.batchNumber}
                          </td>
                          <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                            {new Date(batch.productionDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-neutral-900 dark:text-white">
                              {batch.targetProductName}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              {batch.targetVariantLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            +{batch.outputQuantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            {fmtPKR(batch.totalRawMaterialCostMinor / 100)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            {fmtPKR(batch.totalPackagingCostMinor / 100)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            {fmtPKR(batch.totalExpensesMinor / 100)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                            {fmtPKR(batch.totalBatchCostMinor / 100)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-indigo-700 dark:text-indigo-400 text-sm bg-indigo-50/30 dark:bg-indigo-950/20">
                            {fmtPKR(costPerPkg)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            {sellPrice > 0 ? fmtPKR(sellPrice) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {sellPrice > 0 ? fmtPKR(unitProfit) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {batch.status === 'reversed' ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                Reversed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReverseBatch(batch)}
                                disabled={reverseBatchMutation.isPending}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
                                title="Reverse production batch and restore raw materials"
                              >
                                Reverse
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: RAW MATERIALS & PACKAGING SUPPLIES
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'raw_materials' && (
        <div className="space-y-4">
          {/* Header Action & KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Total Materials
              </div>
              <div className="mt-1.5 text-2xl font-bold text-neutral-900 dark:text-white">
                {rawMaterialsData?.stats?.totalItems || 0}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">Raw &amp; packaging items</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Bulk Raw Stock
              </div>
              <div className="mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {rawMaterialsData?.stats?.rawCount || 0} items
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">Walnuts, herbs, seeds</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Packaging Supplies
              </div>
              <div className="mt-1.5 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {rawMaterialsData?.stats?.packagingCount || 0} items
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">Pouches, jars, labels</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Total Raw Valuation
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {fmtPKR((rawMaterialsData?.stats?.totalValuationMinor || 0) / 100)}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">In warehouse storage</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-center items-stretch col-span-2 md:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setRawEditTarget(null);
                  setRawModalOpen(true);
                }}
                className="w-full py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <span>➕</span> Add Material / Supply
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Search Material or SKU
                </label>
                <input
                  type="text"
                  value={rawSearch}
                  onChange={(e) => {
                    setRawSearch(e.target.value);
                    setRawPage(1);
                  }}
                  placeholder="e.g. Walnuts, Pouch, Label..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Material Classification
                </label>
                <select
                  value={rawTypeFilter}
                  onChange={(e) => {
                    setRawTypeFilter(e.target.value);
                    setRawPage(1);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="">All Classifications</option>
                  <option value="raw_material">🌾 Bulk Raw Material</option>
                  <option value="packaging_material">📦 Packaging Supply</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Stock Health
                </label>
                <select
                  value={rawStockFilter}
                  onChange={(e) => {
                    setRawStockFilter(e.target.value);
                    setRawPage(1);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="all">All Items</option>
                  <option value="in_stock">In Stock (&gt; 0)</option>
                  <option value="out_of_stock">Out of Stock (0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Raw Materials Inventory Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
            {isRawLoading ? (
              <div className="p-8 text-center text-xs text-neutral-500">Loading raw materials...</div>
            ) : !rawMaterialsData?.rawMaterials?.length ? (
              <div className="p-12 text-center text-xs text-neutral-400">
                <span className="text-3xl block mb-2">🌾</span>
                No raw materials or packaging supplies found. Click &quot;Add Material / Supply&quot; to register your bulk stock.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th className="px-4 py-3">Material Name</th>
                      <th className="px-4 py-3">SKU / Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3 text-center">Warehouse Balance</th>
                      <th className="px-4 py-3 text-center">Reorder Threshold</th>
                      <th className="px-4 py-3 text-right">Avg Unit Cost</th>
                      <th className="px-4 py-3 text-right">Total Valuation</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {rawMaterialsData.rawMaterials.map((rm) => {
                      const avgCost = (rm.averageCostMinor || rm.latestUnitCostMinor || 0) / 100;
                      const val = (rm.currentStock || 0) * avgCost;
                      const isLow = rm.currentStock <= rm.reorderLevel;

                      return (
                        <tr key={rm._id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-neutral-900 dark:text-white">
                              {rm.name}
                            </div>
                            <span className="text-[11px] text-neutral-400">
                              {rm.category || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-neutral-600 dark:text-neutral-400">
                            {rm.sku}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                rm.type === 'packaging_material'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                              }`}
                            >
                              <span>{rm.type === 'packaging_material' ? '📦' : '🌾'}</span>
                              {rm.type === 'packaging_material' ? 'Packaging' : 'Raw Material'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                            {rm.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isLow ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'
                              }`}
                            >
                              {rm.currentStock} {rm.unit}
                            </span>
                            {isLow && (
                              <span className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                ⚠️ Low Bulk Stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-neutral-500">
                            {rm.reorderLevel} {rm.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            {fmtPKR(avgCost)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                            {fmtPKR(val)}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                            {rm.primarySupplier?.name || <span className="text-neutral-400 italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setRawAdjustTarget(rm);
                                  setRawAdjustModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                              >
                                ⚡ Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRawEditTarget(rm);
                                  setRawModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: TRANSFER FROM WAREHOUSE TO STORE SHELF
      ───────────────────────────────────────────────────────────── */}
      {transferModalOpen && transferTarget.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚚</span>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Transfer to Store Shelf
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Move physical units from warehouse to store shelf
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Product & Variant Details */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Product
                </span>
                <span className="font-bold text-neutral-900 dark:text-white text-sm">
                  {transferTarget.product.name}
                </span>
              </div>
              <div className="text-neutral-600 dark:text-neutral-300">
                Variant: <span className="font-semibold text-neutral-900 dark:text-white">{transferTarget.variantLabel}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                  <span className="text-[10px] text-sky-700 dark:text-sky-400 block font-semibold uppercase">
                    Warehouse Available
                  </span>
                  <span className="text-lg font-bold text-sky-800 dark:text-sky-200 font-mono">
                    {transferTarget.warehouseStock} units
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold uppercase">
                    Current Store Shelf
                  </span>
                  <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200 font-mono">
                    {transferTarget.storeStock} units
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Quantity to Transfer (Max {transferTarget.warehouseStock}) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={transferTarget.warehouseStock}
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    className="w-full text-base font-bold px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setTransferQuantity(String(transferTarget.warehouseStock))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 shrink-0"
                  >
                    Transfer All
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason / Floor Note
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Restocked shelf display for evening shift"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reference # (Optional)
                </label>
                <input
                  type="text"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="e.g. Transfer Slip #042"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending || !transferQuantity || parseInt(transferQuantity, 10) <= 0}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Production / Packaging Run */}
      <ProductionRunModal
        isOpen={productionModalOpen}
        onClose={() => setProductionModalOpen(false)}
        products={stockData?.products || []}
        rawMaterials={rawMaterialsData?.rawMaterials || []}
      />

      {/* Modal: Add / Edit Raw Material */}
      <RawMaterialModal
        isOpen={rawModalOpen}
        onClose={() => {
          setRawModalOpen(false);
          setRawEditTarget(null);
        }}
        initialData={rawEditTarget}
        suppliers={suppliers}
      />

      {/* Modal: Adjust Raw Material Stock */}
      <RawMaterialAdjustModal
        isOpen={rawAdjustModalOpen}
        onClose={() => {
          setRawAdjustModalOpen(false);
          setRawAdjustTarget(null);
        }}
        material={rawAdjustTarget}
      />
    </div>
  );
}
