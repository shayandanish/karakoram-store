import { z } from 'zod';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import { delCacheByPrefix } from '../utils/cache.js';

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
    // Find all products with any variant having stock <= 10
    const products = await Product.find({
      'variants.stock': { $lte: 10 },
      isActive: true,
    })
      .select('name slug variants images category primarySupplier')
      .populate('primarySupplier', 'name contactName phone email')
      .populate('category', 'name')
      .lean();

    const alerts = [];
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

    res.json({
      totalAlerts: alerts.length,
      alerts,
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
