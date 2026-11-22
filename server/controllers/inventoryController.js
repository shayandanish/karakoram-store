import { z } from 'zod';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import RawMaterial from '../models/RawMaterial.js';
import ProductionBatch from '../models/ProductionBatch.js';
import { delCacheByPrefix } from '../utils/cache.js';
import { toMinorUnits } from '../utils/money.js';

const adjustStockSchema = z.object({
  productId: z.string().length(24),
  variantLabel: z.string().trim().min(1),
  adjustmentType: z.enum([
    'goods_received',
    'damage_loss',
    'physical_count_correction',
    'internal_use',
  ]),
  quantity: z.number().int().min(0),
  mode: z.enum(['relative', 'set']).optional(),
  reason: z.string().trim().min(1).max(300),
  reference: z.string().trim().max(120).optional().default(''),
});

const transferStockSchema = z.object({
  productId: z.string().length(24),
  variantLabel: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  reason: z.string().trim().max(300).optional().default('Moved from warehouse to store shelf'),
  reference: z.string().trim().max(120).optional().default(''),
});

export const adminGetStockOverview = async (req, res, next) => {
  try {
    const {
      search = '',
      category = '',
      supplier = '',
      stockStatus = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { 'variants.sku': { $regex: search.trim(), $options: 'i' } },
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (supplier) {
      filter.primarySupplier = supplier;
    }

    // Store-shelf thresholds shared by the filters and the KPI aggregation
    const LOW_STOCK_MAX = 5;
    const TRANSFER_THRESHOLD = 3;

    if (stockStatus === 'low_stock') {
      filter.variants = { $elemMatch: { stock: { $gt: 0, $lte: LOW_STOCK_MAX } } };
    } else if (stockStatus === 'out_of_stock') {
      filter.variants = { $elemMatch: { stock: { $lte: 0 } } };
    } else if (stockStatus === 'in_stock') {
      filter['variants.stock'] = { $not: { $lte: LOW_STOCK_MAX } };
    } else if (stockStatus === 'transfer_needed') {
      filter.variants = {
        $elemMatch: { stock: { $lte: TRANSFER_THRESHOLD }, warehouseStock: { $gt: 0 } },
      };
    }

    // Pre-calculate overview KPIs across all active products
    const [statsResult, products, totalFiltered] = await Promise.all([
      Product.aggregate([
        { $unwind: '$variants' },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: '$variants.stock' },
            totalWarehouseUnits: { $sum: { $ifNull: ['$variants.warehouseStock', 0] } },
            totalVariants: { $sum: 1 },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$variants.stock', 0] },
                      { $lte: ['$variants.stock', LOW_STOCK_MAX] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $eq: ['$variants.stock', 0] }, 1, 0],
              },
            },
            transferNeededCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lte: ['$variants.stock', TRANSFER_THRESHOLD] },
                      { $gt: [{ $ifNull: ['$variants.warehouseStock', 0] }, 0] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Product.find(filter)
        .select('name slug category images variants primarySupplier isActive totalSold')
        .populate('category', 'name slug')
        .populate('primarySupplier', 'name contactName phone')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const stats = statsResult[0] || {
      totalUnits: 0,
      totalWarehouseUnits: 0,
      totalVariants: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      transferNeededCount: 0,
    };

    res.json({
      products,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalFiltered / limitNum),
      },
      kpis: {
        totalUnits: stats.totalUnits,
        totalWarehouseUnits: stats.totalWarehouseUnits || 0,
        totalVariants: stats.totalVariants,
        lowStockVariants: stats.lowStockCount,
        outOfStockVariants: stats.outOfStockCount,
        transferNeededVariants: stats.transferNeededCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adminAdjustStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = adjustStockSchema.parse(req.body);

    let updatedProduct;
    let createdMovement;

    await session.withTransaction(async () => {
      const product = await Product.findById(data.productId).session(session);
      if (!product) {
        throw Object.assign(new Error('Product not found'), { statusCode: 404 });
      }

      const variantIndex = product.variants.findIndex(
        (v) => v.label.toLowerCase() === data.variantLabel.toLowerCase()
      );
      if (variantIndex === -1) {
        throw Object.assign(new Error(`Variant "${data.variantLabel}" not found`), {
          statusCode: 404,
        });
      }

      const variant = product.variants[variantIndex];
      const warehouseStock = variant.warehouseStock || 0;
      const stockBefore = variant.stock;
      let stockAfter = stockBefore;
      let quantityChange = 0;
      let movementType = data.adjustmentType;
      let movementReason = data.reason || '';

      // Determine new stock count based on adjustment type and mode
      if (data.mode === 'set' || data.adjustmentType === 'physical_count_correction') {
        // ── MANUAL AUDIT / PHYSICAL COUNT CORRECTION ──
        // Audits are performed manually by physical count on the store shelf.
        // It sets store shelf stock to the exact counted quantity without touching warehouse stock.
        stockAfter = Math.max(0, data.quantity);
        quantityChange = stockAfter - stockBefore;
        movementType = 'physical_count_correction';
        movementReason = movementReason || `Manual physical count audit: updated shelf stock from ${stockBefore} to ${stockAfter}`;
      } else if (data.adjustmentType === 'goods_received') {
        if (data.quantity <= 0) {
          throw Object.assign(new Error('Quantity received must be greater than zero'), {
            statusCode: 400,
          });
        }

        // ── STRICT GUARD: Warehouse stock MUST be >= quantity to add ──
        // If warehouse stock is less than the quantity to add, do not allow adjustment!
        if (warehouseStock < data.quantity) {
          throw Object.assign(
            new Error(
              `Cannot adjust ${data.quantity} units to store shelf; warehouse only has ${warehouseStock} units available. Record a vendor purchase first or reduce the quantity.`
            ),
            { statusCode: 400 }
          );
        }

        variant.warehouseStock = warehouseStock - data.quantity;
        movementType = 'warehouse_to_store';
        movementReason = `${movementReason ? movementReason + ' — ' : ''}Adjusted to store shelf from warehouse stock (Warehouse: ${warehouseStock} → ${variant.warehouseStock})`;

        quantityChange = data.quantity;
        stockAfter = stockBefore + data.quantity;
      } else if (data.adjustmentType === 'damage_loss' || data.adjustmentType === 'internal_use') {
        if (data.quantity <= 0) {
          throw Object.assign(new Error('Adjustment quantity must be greater than zero'), {
            statusCode: 400,
          });
        }
        if (variant.stock < data.quantity) {
          throw Object.assign(
            new Error(
              `Cannot deduct ${data.quantity} units; only ${variant.stock} units currently available on store shelf`
            ),
            { statusCode: 400 }
          );
        }
        quantityChange = -data.quantity;
        stockAfter = stockBefore - data.quantity;
      }

      variant.stock = stockAfter;
      product.markModified('variants');
      await product.save({ session });

      const movements = await StockMovement.create(
        [
          {
            product: product._id,
            productName: product.name,
            variantLabel: variant.label,
            type: movementType,
            quantityChange,
            stockBefore,
            stockAfter,
            reason: movementReason,
            reference: data.reference || '',
            actor: req.user?._id || null,
            actorName: req.user?.name || 'Staff Member',
          },
        ],
        { session }
      );

      createdMovement = movements[0];
      updatedProduct = product;
    });

    // Invalidate product caches
    await delCacheByPrefix('products:list:').catch(() => { });
    await delCacheByPrefix('products:detail:').catch(() => { });

    res.json({
      success: true,
      product: updatedProduct,
      movement: createdMovement,
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

export const adminTransferStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = transferStockSchema.parse(req.body);

    let updatedProduct;
    let createdMovement;

    await session.withTransaction(async () => {
      const product = await Product.findById(data.productId).session(session);
      if (!product) {
        throw Object.assign(new Error('Product not found'), { statusCode: 404 });
      }

      const variantIndex = product.variants.findIndex(
        (v) => v.label.toLowerCase() === data.variantLabel.toLowerCase()
      );
      if (variantIndex === -1) {
        throw Object.assign(new Error(`Variant "${data.variantLabel}" not found`), {
          statusCode: 404,
        });
      }

      const variant = product.variants[variantIndex];
      const currentWarehouse = variant.warehouseStock || 0;

      if (data.quantity <= 0) {
        throw Object.assign(new Error('Transfer quantity must be greater than zero'), { statusCode: 400 });
      }

      if (currentWarehouse < data.quantity) {
        throw Object.assign(
          new Error(
            `Insufficient warehouse stock. Requested transfer of ${data.quantity} units, but only ${currentWarehouse} units available in warehouse.`
          ),
          { statusCode: 400 }
        );
      }

      const storeStockBefore = variant.stock;
      const warehouseBefore = currentWarehouse;

      // Deduct from warehouse, add to store shelf
      variant.warehouseStock = currentWarehouse - data.quantity;
      variant.stock = storeStockBefore + data.quantity;

      product.markModified('variants');
      await product.save({ session });

      const movements = await StockMovement.create(
        [
          {
            product: product._id,
            productName: product.name,
            variantLabel: variant.label,
            type: 'warehouse_to_store',
            quantityChange: data.quantity,
            stockBefore: storeStockBefore,
            stockAfter: variant.stock,
            reason: `Transfer from Warehouse to Store Shelf: ${data.reason || 'Restocking store'} (Warehouse: ${warehouseBefore} → ${variant.warehouseStock})`,
            reference: data.reference || '',
            actor: req.user?._id || null,
            actorName: req.user?.name || 'Staff Member',
          },
        ],
        { session }
      );

      createdMovement = movements[0];
      updatedProduct = product;
    });

    // Invalidate product caches
    await delCacheByPrefix('products:list:').catch(() => { });
    await delCacheByPrefix('products:detail:').catch(() => { });

    res.json({
      success: true,
      message: `Successfully transferred ${data.quantity} units from warehouse to store shelf`,
      product: updatedProduct,
      movement: createdMovement,
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

export const adminGetStockMovements = async (req, res, next) => {
  try {
    const { productId = '', type = '', page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter.product = productId;
    }
    if (type) {
      filter.type = type;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockMovement.countDocuments(filter),
    ]);

    res.json({
      movements,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetReorderAlerts = async (req, res, next) => {
  try {
    // 1. Finished Products with low stock (stock <= 10)
    const products = await Product.find({
      'variants.stock': { $lte: 10 },
      isActive: true,
    })
      .select('name slug variants images category primarySupplier')
      .populate('primarySupplier', 'name contactName phone email')
      .populate('category', 'name')
      .lean();

    // 2. Raw Materials with low stock (currentStock <= reorderLevel)
    const lowRawMaterials = await RawMaterial.find({
      $expr: { $lte: ['$currentStock', '$reorderLevel'] },
      isActive: true,
    })
      .populate('primarySupplier', 'name contactName phone email')
      .lean();

    const alerts = [];
    const rawAlerts = [];
    const supplierGroups = new Map();

    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.stock <= 10) {
          const supplierId = product.primarySupplier?._id
            ? String(product.primarySupplier._id)
            : 'unassigned';
          const supplierName = product.primarySupplier?.name || 'Unassigned Supplier';
          const supplierPhone = product.primarySupplier?.phone || '';

          const alertItem = {
            itemType: 'product',
            productId: product._id,
            productName: product.name,
            variantLabel: variant.label,
            currentStock: variant.stock,
            recommendedReorder: Math.max(20, 25 - variant.stock),
            price: variant.price,
            primarySupplier: product.primarySupplier || null,
          };

          alerts.push(alertItem);

          if (!supplierGroups.has(supplierId)) {
            supplierGroups.set(supplierId, {
              supplierId: supplierId === 'unassigned' ? null : supplierId,
              supplierName,
              supplierPhone,
              items: [],
            });
          }
          supplierGroups.get(supplierId).items.push(alertItem);
        }
      }
    }

    for (const rm of lowRawMaterials) {
      const supplierId = rm.primarySupplier?._id
        ? String(rm.primarySupplier._id)
        : 'unassigned';
      const supplierName = rm.primarySupplier?.name || 'Unassigned Supplier';
      const supplierPhone = rm.primarySupplier?.phone || '';

      const recReorder = Math.max(rm.reorderLevel * 2, 50);
      const rawAlertItem = {
        itemType: 'raw_material',
        rawMaterialId: rm._id,
        name: rm.name,
        sku: rm.sku,
        unit: rm.unit,
        classification: rm.type,
        currentStock: rm.currentStock,
        reorderLevel: rm.reorderLevel,
        recommendedReorder: recReorder,
        rate: (rm.averageCostMinor || rm.latestUnitCostMinor || 0) / 100,
        primarySupplier: rm.primarySupplier || null,
      };

      rawAlerts.push(rawAlertItem);

      if (!supplierGroups.has(supplierId)) {
        supplierGroups.set(supplierId, {
          supplierId: supplierId === 'unassigned' ? null : supplierId,
          supplierName,
          supplierPhone,
          items: [],
        });
      }
      supplierGroups.get(supplierId).items.push(rawAlertItem);
    }

    res.json({
      totalAlerts: alerts.length + rawAlerts.length,
      finishedAlertsCount: alerts.length,
      rawAlertsCount: rawAlerts.length,
      alerts,
      rawAlerts,
      groupedBySupplier: Array.from(supplierGroups.values()),
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetSuppliersList = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .select('name contactName phone email')
      .sort({ name: 1 })
      .lean();
    res.json({ suppliers });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RAW MATERIALS & PACKAGING SUPPLIES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const rawMaterialInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().max(60).optional().default(''),
  type: z.enum(['raw_material', 'packaging_material']).default('raw_material'),
  category: z.string().trim().max(100).optional().default('General'),
  unit: z.enum(['kg', 'g', 'pcs', 'liter', 'box', 'meter']).default('kg'),
  reorderLevel: z.number().min(0).optional().default(10),
  primarySupplier: z.string().length(24).optional().or(z.literal('')).default(''),
  description: z.string().trim().max(500).optional().default(''),
});

const adjustRawMaterialSchema = z.object({
  rawMaterialId: z.string().length(24),
  quantity: z.number().min(0),
  mode: z.enum(['relative', 'set']).default('relative'),
  adjustmentType: z.enum(['physical_count_correction', 'damage_loss', 'opening_stock']),
  reason: z.string().trim().min(1).max(300),
});

export const adminGetRawMaterials = async (req, res, next) => {
  try {
    const {
      search = '',
      type = '',
      category = '',
      stockStatus = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isActive: true };
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { sku: { $regex: search.trim(), $options: 'i' } },
      ];
    }
    if (type) {
      filter.type = type;
    }
    if (category) {
      filter.category = category;
    }

    if (stockStatus === 'out_of_stock') {
      filter.currentStock = { $lte: 0 };
    } else if (stockStatus === 'in_stock') {
      filter.currentStock = { $gt: 0 };
    }

    const [statsResult, rawMaterials, totalFiltered] = await Promise.all([
      RawMaterial.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            rawCount: { $sum: { $cond: [{ $eq: ['$type', 'raw_material'] }, 1, 0] } },
            packagingCount: { $sum: { $cond: [{ $eq: ['$type', 'packaging_material'] }, 1, 0] } },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0],
              },
            },
            totalValuationMinor: {
              $sum: { $multiply: ['$currentStock', { $ifNull: ['$averageCostMinor', 0] }] },
            },
          },
        },
      ]),
      RawMaterial.find(filter)
        .populate('primarySupplier', 'name contactName phone')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RawMaterial.countDocuments(filter),
    ]);

    const stats = statsResult[0] || {
      totalItems: 0,
      rawCount: 0,
      packagingCount: 0,
      lowStockCount: 0,
      totalValuationMinor: 0,
    };

    res.json({
      rawMaterials,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalFiltered / limitNum),
      },
      stats,
    });
  } catch (error) {
    next(error);
  }
};

export const adminCreateRawMaterial = async (req, res, next) => {
  try {
    const data = rawMaterialInputSchema.parse(req.body);
    let sku = data.sku.toUpperCase();
    if (!sku) {
      const prefix = data.type === 'packaging_material' ? 'PKG' : 'RM';
      const cleanName = data.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
      const rand = Math.floor(100 + Math.random() * 900);
      sku = `${prefix}-${cleanName}-${rand}`;
    }

    const existing = await RawMaterial.findOne({ sku });
    if (existing) {
      throw Object.assign(new Error(`Raw material with SKU "${sku}" already exists`), { statusCode: 409 });
    }

    const rawMaterial = await RawMaterial.create({
      name: data.name,
      sku,
      type: data.type,
      category: data.category || 'General',
      unit: data.unit,
      reorderLevel: data.reorderLevel,
      primarySupplier: data.primarySupplier || null,
      description: data.description || '',
      createdBy: req.user?._id || null,
    });

    res.status(201).json({ success: true, rawMaterial });
  } catch (error) {
    next(error);
  }
};

export const adminUpdateRawMaterial = async (req, res, next) => {
  try {
    const data = rawMaterialInputSchema.partial().parse(req.body);
    const rm = await RawMaterial.findById(req.params.id);
    if (!rm) {
      throw Object.assign(new Error('Raw material not found'), { statusCode: 404 });
    }

    if (data.name !== undefined) rm.name = data.name;
    if (data.type !== undefined) rm.type = data.type;
    if (data.category !== undefined) rm.category = data.category;
    if (data.unit !== undefined) rm.unit = data.unit;
    if (data.reorderLevel !== undefined) rm.reorderLevel = data.reorderLevel;
    if (data.primarySupplier !== undefined) rm.primarySupplier = data.primarySupplier || null;
    if (data.description !== undefined) rm.description = data.description;
    if (req.body.isActive !== undefined) rm.isActive = Boolean(req.body.isActive);

    await rm.save();
    res.json({ success: true, rawMaterial: rm });
  } catch (error) {
    next(error);
  }
};

export const adminAdjustRawMaterialStock = async (req, res, next) => {
  try {
    const data = adjustRawMaterialSchema.parse(req.body);
    const rm = await RawMaterial.findById(data.rawMaterialId);
    if (!rm) {
      throw Object.assign(new Error('Raw material not found'), { statusCode: 404 });
    }

    const previousStock = rm.currentStock;
    if (data.mode === 'set' || data.adjustmentType === 'physical_count_correction') {
      rm.currentStock = Math.max(0, data.quantity);
    } else if (data.adjustmentType === 'damage_loss') {
      if (rm.currentStock < data.quantity) {
        throw Object.assign(new Error(`Cannot deduct ${data.quantity} ${rm.unit}; only ${rm.currentStock} ${rm.unit} currently in stock`), { statusCode: 400 });
      }
      rm.currentStock -= data.quantity;
    } else {
      rm.currentStock += data.quantity;
    }

    await rm.save();
    res.json({ success: true, rawMaterial: rm, previousStock, currentStock: rm.currentStock });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PACKAGING & PRODUCTION RUN ENGINE (RAW MATERIAL -> FINISHED PACKAGES)
// ─────────────────────────────────────────────────────────────────────────────

const productionBatchInputSchema = z.object({
  targetProductId: z.string().length(24),
  targetVariantLabel: z.string().trim().min(1),
  outputQuantity: z.number().int().min(1),
  productionDate: z.string().optional(),
  rawMaterialInputs: z.array(z.object({
    rawMaterialId: z.string().length(24),
    quantityUsed: z.number().positive(),
  })).min(1, 'At least one raw material input is required'),
  packagingInputs: z.array(z.object({
    packagingMaterialId: z.string().length(24),
    quantityUsed: z.number().positive(),
  })).optional().default([]),
  labourCost: z.number().min(0).optional().default(0),
  processingCost: z.number().min(0).optional().default(0),
  otherExpenses: z.number().min(0).optional().default(0),
  expenseNotes: z.string().trim().max(500).optional().default(''),
  wasteQuantity: z.number().min(0).optional().default(0),
  wasteReason: z.string().trim().max(300).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const adminCreateProductionBatch = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = productionBatchInputSchema.parse(req.body);

    let createdBatch;
    let updatedProduct;

    await session.withTransaction(async () => {
      // 1. Fetch Target Product
      const product = await Product.findById(data.targetProductId)
        .select('+variants.averageCostMinor')
        .session(session);
      if (!product) {
        throw Object.assign(new Error('Target product not found'), { statusCode: 404 });
      }

      const variant = product.variants.find(
        (v) => v.label.toLowerCase() === data.targetVariantLabel.toLowerCase()
      );
      if (!variant) {
        throw Object.assign(
          new Error(`Variant "${data.targetVariantLabel}" not found for product "${product.name}"`),
          { statusCode: 404 }
        );
      }

      // 2. Process Raw Material Inputs & Verify Stock
      const processedRawInputs = [];
      let totalRawMaterialCostMinor = 0;

      for (const input of data.rawMaterialInputs) {
        const rm = await RawMaterial.findById(input.rawMaterialId).session(session);
        if (!rm || !rm.isActive) {
          throw Object.assign(new Error('Active raw material input not found'), { statusCode: 404 });
        }

        if (rm.currentStock < input.quantityUsed) {
          throw Object.assign(
            new Error(
              `Insufficient stock for "${rm.name}". Required: ${input.quantityUsed} ${rm.unit}, Available: ${rm.currentStock} ${rm.unit}`
            ),
            { statusCode: 400 }
          );
        }

        const unitCostMinor = rm.averageCostMinor || rm.latestUnitCostMinor || 0;
        const totalCostMinor = Math.round(input.quantityUsed * unitCostMinor);

        rm.currentStock -= input.quantityUsed;
        await rm.save({ session });

        totalRawMaterialCostMinor += totalCostMinor;
        processedRawInputs.push({
          rawMaterial: rm._id,
          rawMaterialName: rm.name,
          unit: rm.unit,
          quantityUsed: input.quantityUsed,
          unitCostMinor,
          totalCostMinor,
        });
      }

      // 3. Process Packaging Material Inputs & Verify Stock
      const processedPackagingInputs = [];
      let totalPackagingCostMinor = 0;

      for (const input of data.packagingInputs) {
        const pkg = await RawMaterial.findById(input.packagingMaterialId).session(session);
        if (!pkg || !pkg.isActive) {
          throw Object.assign(new Error('Active packaging material not found'), { statusCode: 404 });
        }

        if (pkg.currentStock < input.quantityUsed) {
          throw Object.assign(
            new Error(
              `Insufficient packaging stock for "${pkg.name}". Required: ${input.quantityUsed} ${pkg.unit}, Available: ${pkg.currentStock} ${pkg.unit}`
            ),
            { statusCode: 400 }
          );
        }

        const unitCostMinor = pkg.averageCostMinor || pkg.latestUnitCostMinor || 0;
        const totalCostMinor = Math.round(input.quantityUsed * unitCostMinor);

        pkg.currentStock -= input.quantityUsed;
        await pkg.save({ session });

        totalPackagingCostMinor += totalCostMinor;
        processedPackagingInputs.push({
          packagingMaterial: pkg._id,
          packagingMaterialName: pkg.name,
          unit: pkg.unit,
          quantityUsed: input.quantityUsed,
          unitCostMinor,
          totalCostMinor,
        });
      }

      // 4. Calculate Expenses & Minor Units
      const labourCostMinor = toMinorUnits(data.labourCost || 0, 'Labour cost');
      const processingCostMinor = toMinorUnits(data.processingCost || 0, 'Processing cost');
      const otherExpensesMinor = toMinorUnits(data.otherExpenses || 0, 'Other expenses');
      const totalExpensesMinor = labourCostMinor + processingCostMinor + otherExpensesMinor;

      const totalBatchCostMinor = totalRawMaterialCostMinor + totalPackagingCostMinor + totalExpensesMinor;
      const costPerPackageMinor = Math.round(totalBatchCostMinor / data.outputQuantity);

      // 5. Update Finished Product Variant Stock & Landed Costs
      const previousStock = variant.stock;
      const previousWarehouse = variant.warehouseStock || 0;
      const previousAverageCost = variant.averageCostMinor;

      variant.stock = previousStock + data.outputQuantity;
      variant.warehouseStock = previousWarehouse + data.outputQuantity;

      // Recalculate Weighted-Average Cost for Finished Product
      if (previousStock === 0 || !Number.isSafeInteger(previousAverageCost)) {
        variant.averageCostMinor = costPerPackageMinor;
      } else {
        const previousTotalValue = previousStock * previousAverageCost;
        const combinedValue = previousTotalValue + totalBatchCostMinor;
        variant.averageCostMinor = variant.stock > 0 ? Math.round(combinedValue / variant.stock) : costPerPackageMinor;
      }

      variant.latestUnitCostMinor = costPerPackageMinor;
      variant.latestLandedCostMinor = costPerPackageMinor;

      product.markModified('variants');
      await product.save({ session });

      // 6. Generate Batch Number and Save ProductionBatch
      const timestamp = new Date();
      const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      const batchNumber = `PRD-${datePart}-${randDigits}`;

      const [batch] = await ProductionBatch.create(
        [
          {
            batchNumber,
            productionDate: data.productionDate ? new Date(data.productionDate) : timestamp,
            targetProduct: product._id,
            targetProductName: product.name,
            targetVariantLabel: variant.label,
            outputQuantity: data.outputQuantity,
            rawMaterialInputs: processedRawInputs,
            packagingInputs: processedPackagingInputs,
            labourCostMinor,
            processingCostMinor,
            otherExpensesMinor,
            expenseNotes: data.expenseNotes,
            wasteQuantity: data.wasteQuantity,
            wasteReason: data.wasteReason,
            totalRawMaterialCostMinor,
            totalPackagingCostMinor,
            totalExpensesMinor,
            totalBatchCostMinor,
            costPerPackageMinor,
            sellingPriceSnapshot: variant.price,
            notes: data.notes,
            createdBy: req.user?._id || null,
          },
        ],
        { session }
      );

      // 7. Record Stock Movement
      await StockMovement.create(
        [
          {
            product: product._id,
            productName: product.name,
            variantLabel: variant.label,
            type: 'packaging_production',
            quantityChange: data.outputQuantity,
            stockBefore: previousStock,
            stockAfter: variant.stock,
            reason: `Packaging Run #${batchNumber}: Converted raw materials into ${data.outputQuantity} units of ${variant.label}`,
            reference: batchNumber,
            actor: req.user?._id || null,
            actorName: req.user?.name || 'Production Staff',
          },
        ],
        { session }
      );

      createdBatch = batch;
      updatedProduct = product;
    });

    // Invalidate product caches
    await delCacheByPrefix('products:list:').catch(() => {});
    await delCacheByPrefix('products:detail:').catch(() => {});

    res.status(201).json({
      success: true,
      message: `Successfully produced and packaged ${data.outputQuantity} units of ${createdBatch.targetProductName} (${createdBatch.targetVariantLabel})`,
      batch: createdBatch,
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

export const adminGetProductionBatches = async (req, res, next) => {
  try {
    const { targetProduct = '', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (targetProduct && mongoose.Types.ObjectId.isValid(targetProduct)) {
      filter.targetProduct = targetProduct;
    }

    const [batches, totalFiltered, totalsResult] = await Promise.all([
      ProductionBatch.find(filter)
        .populate('targetProduct', 'name images')
        .sort({ productionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductionBatch.countDocuments(filter),
      ProductionBatch.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalPackages: { $sum: '$outputQuantity' },
            totalProductionCostMinor: { $sum: '$totalBatchCostMinor' },
          },
        },
      ]),
    ]);

    const totals = totalsResult[0] || { totalPackages: 0, totalProductionCostMinor: 0 };

    res.json({
      batches,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalFiltered / limitNum),
      },
      totals,
    });
  } catch (error) {
    next(error);
  }
};

export const adminReverseProductionBatch = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { reason = 'Production batch reversal' } = req.body;
    const batch = await ProductionBatch.findById(req.params.id).session(session);
    if (!batch) {
      throw Object.assign(new Error('Production batch not found'), { statusCode: 404 });
    }
    if (batch.status === 'reversed') {
      throw Object.assign(new Error('This production batch has already been reversed'), { statusCode: 400 });
    }

    let updatedProduct;

    await session.withTransaction(async () => {
      const product = await Product.findById(batch.targetProduct).session(session);
      if (!product) {
        throw Object.assign(new Error('Target product not found'), { statusCode: 404 });
      }

      const variant = product.variants.find(
        (v) => v.label.toLowerCase() === batch.targetVariantLabel.toLowerCase()
      );
      if (!variant) {
        throw Object.assign(new Error(`Variant "${batch.targetVariantLabel}" not found`), { statusCode: 404 });
      }

      if (variant.stock < batch.outputQuantity) {
        throw Object.assign(
          new Error(
            `Cannot reverse production run: ${batch.outputQuantity} units were produced, but only ${variant.stock} units are currently available on store shelf (some units have already been sold). Record a stock adjustment instead.`
          ),
          { statusCode: 400 }
        );
      }

      const previousStock = variant.stock;
      variant.stock -= batch.outputQuantity;
      variant.warehouseStock = Math.max(0, (variant.warehouseStock || 0) - batch.outputQuantity);
      product.markModified('variants');
      await product.save({ session });

      // Restore raw materials
      for (const input of batch.rawMaterialInputs) {
        const rm = await RawMaterial.findById(input.rawMaterial).session(session);
        if (rm) {
          rm.currentStock += input.quantityUsed;
          await rm.save({ session });
        }
      }

      // Restore packaging materials
      for (const input of batch.packagingInputs) {
        const pkg = await RawMaterial.findById(input.packagingMaterial).session(session);
        if (pkg) {
          pkg.currentStock += input.quantityUsed;
          await pkg.save({ session });
        }
      }

      batch.status = 'reversed';
      batch.notes = `${batch.notes ? batch.notes + ' | ' : ''}Reversed: ${reason}`;
      await batch.save({ session });

      await StockMovement.create(
        [
          {
            product: product._id,
            productName: product.name,
            variantLabel: variant.label,
            type: 'physical_count_correction',
            quantityChange: -batch.outputQuantity,
            stockBefore: previousStock,
            stockAfter: variant.stock,
            reason: `Reversal of Production Batch #${batch.batchNumber}: ${reason}`,
            reference: batch.batchNumber,
            actor: req.user?._id || null,
            actorName: req.user?.name || 'Staff Member',
          },
        ],
        { session }
      );

      updatedProduct = product;
    });

    await delCacheByPrefix('products:list:').catch(() => {});
    await delCacheByPrefix('products:detail:').catch(() => {});

    res.json({
      success: true,
      message: `Successfully reversed Production Batch #${batch.batchNumber}. Restored raw materials and removed ${batch.outputQuantity} packages from inventory.`,
      batch,
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};
