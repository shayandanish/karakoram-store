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

    // Pre-calculate overview KPIs across all active products
    const [statsResult, products, totalFiltered] = await Promise.all([
      Product.aggregate([
        { $unwind: '$variants' },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: '$variants.stock' },
            totalVariants: { $sum: 1 },
            lowStockCount: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$variants.stock', 0] }, { $lte: ['$variants.stock', 5] }] },
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
      totalVariants: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    // Filter by stockStatus if specified (in_stock, low_stock, out_of_stock)
    let processedProducts = products;
    if (stockStatus === 'low_stock') {
      processedProducts = products.filter((p) =>
        p.variants.some((v) => v.stock > 0 && v.stock <= 5)
      );
    } else if (stockStatus === 'out_of_stock') {
      processedProducts = products.filter((p) =>
        p.variants.some((v) => v.stock === 0)
      );
    } else if (stockStatus === 'in_stock') {
      processedProducts = products.filter((p) =>
        p.variants.every((v) => v.stock > 5)
      );
    }

    res.json({
      products: processedProducts,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalFiltered / limitNum),
      },
      kpis: {
        totalUnits: stats.totalUnits,
        totalVariants: stats.totalVariants,
        lowStockVariants: stats.lowStockCount,
        outOfStockVariants: stats.outOfStockCount,
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
      const stockBefore = variant.stock;
      let stockAfter = stockBefore;
      let quantityChange = 0;

      // Determine new stock count based on adjustment type and mode
      if (data.mode === 'set' || data.adjustmentType === 'physical_count_correction') {
        stockAfter = Math.max(0, data.quantity);
        quantityChange = stockAfter - stockBefore;
      } else if (data.adjustmentType === 'goods_received') {
        if (data.quantity <= 0) {
          throw Object.assign(new Error('Quantity received must be greater than zero'), {
            statusCode: 400,
          });
        }
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
              `Cannot deduct ${data.quantity} units; only ${variant.stock} units currently available`
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
            type: data.adjustmentType,
            quantityChange,
            stockBefore,
            stockAfter,
            reason: data.reason,
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
    await delCacheByPrefix('products:list:').catch(() => {});
    await delCacheByPrefix('products:detail:').catch(() => {});

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
