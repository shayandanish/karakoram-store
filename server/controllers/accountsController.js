import { z } from 'zod';
import mongoose from 'mongoose';
import Supplier from '../models/Supplier.js';
import InventoryPurchase from '../models/InventoryPurchase.js';
import SupplierPayment from '../models/SupplierPayment.js';
import AccountExpense from '../models/AccountExpense.js';
import AccountAuditLog from '../models/AccountAuditLog.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import StockMovement from '../models/StockMovement.js';
import RawMaterial from '../models/RawMaterial.js';
import { getAccountsDateRange, calculateAccountsReport, buildAccountsXlsx } from '../utils/accountsReport.js';
import { fromMinorUnits, toMinorUnits } from '../utils/money.js';
import { delCacheByPrefix } from '../utils/cache.js';

const supplierInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactName: z.string().trim().max(120).optional().default(''),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  address: z.string().trim().max(500).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
});

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const additionalCostInputSchema = z.object({
  category: z.string().trim().min(1, 'Category is required').max(80),
  amount: z.number().min(0, 'Amount cannot be negative').max(100000000),
  allocationMethod: z.enum(['quantity', 'value', 'equal']).default('quantity'),
});

const purchaseInputSchema = z.object({
  supplier: z.string().length(24).optional().or(z.literal('')),
  supplierName: z.string().trim().max(120).optional().default(''),
  reference: z.string().trim().max(120).optional().default(''),
  purchaseDate: dateOnlySchema,
  dueDate: dateOnlySchema.optional().or(z.literal('')).default(''),
  kind: z.enum(['purchase', 'opening_stock', 'adjustment']).default('purchase'),
  amountPaid: z.number().min(0).optional().default(0),
  notes: z.string().trim().max(1000).optional().default(''),
  additionalCosts: z.array(additionalCostInputSchema).optional().default([]),
  lines: z.array(z.object({
    itemType: z.enum(['product', 'raw_material']).optional().default('product'),
    product: z.string().length(24).optional().or(z.literal('')),
    variantLabel: z.string().trim().max(80).optional().default(''),
    rawMaterial: z.string().length(24).optional().or(z.literal('')),
    quantity: z.number().positive().max(100000),
    unitCost: z.number().min(0).max(100000000),
    additionalCost: z.number().min(0).max(100000000).optional().default(0),
  })).min(1).max(100),
});

/**
 * Allocate a total minor unit amount across lines using Hare-Niemeyer (Largest Remainder)
 * Guarantees zero penny rounding loss across any number of line splits.
 */
function allocateLargestRemainder(totalMinor, weights) {
  const n = weights.length;
  if (n === 0) return [];
  if (totalMinor === 0) return new Array(n).fill(0);

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const effectiveWeights = totalWeight > 0 ? weights : new Array(n).fill(1);
  const effectiveTotal = totalWeight > 0 ? totalWeight : n;

  const exactAllocations = effectiveWeights.map((w) => (totalMinor * w) / effectiveTotal);
  const floors = exactAllocations.map((val) => Math.floor(val));
  const allocatedSum = floors.reduce((sum, val) => sum + val, 0);
  let remainder = totalMinor - allocatedSum;

  const remainders = exactAllocations.map((val, idx) => ({
    idx,
    fraction: val - floors[idx],
  }));

  remainders.sort((a, b) => b.fraction - a.fraction || a.idx - b.idx);

  const result = [...floors];
  for (let i = 0; i < remainder; i++) {
    result[remainders[i].idx] += 1;
  }

  return result;
}

const expenseInputSchema = z.object({
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(3).max(300),
  amount: z.number().positive().max(100000000),
  expenseDate: dateOnlySchema,
  paymentMethod: z.enum(['cash', 'bank', 'easypaisa', 'other']).optional().default('cash'),
  reference: z.string().trim().max(120).optional().default(''),
});

const dateToUtc = (value) => {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    const error = new RangeError('Invalid calendar date');
    error.statusCode = 400;
    throw error;
  }
  return date;
};

export const adminReversePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = z.object({
      reason: z.string().trim().min(3).max(300),
    }).parse(req.body);
    let reversal;
    await session.withTransaction(async () => {
      const original = await InventoryPurchase.findById(req.params.id).select('+paymentRevision').session(session);
      if (!original || original.kind === 'reversal') {
        throw Object.assign(new Error('Reversible purchase not found'), { statusCode: 404 });
      }
      original.paymentRevision += 1;
      await original.save({ session });
      if (original.amountPaidMinor !== 0) {
        throw Object.assign(new Error('Reverse supplier payments before reversing this purchase'), { statusCode: 409 });
      }
      const existingReversal = await InventoryPurchase.exists({ reversalOf: original._id }).session(session);
      if (existingReversal) throw Object.assign(new Error('This purchase has already been reversed'), { statusCode: 409 });
      const payments = await SupplierPayment.aggregate([
        { $match: { purchase: original._id } },
        {
          $group: {
            _id: null,
            netMinor: {
              $sum: {
                $cond: [
                  { $eq: ['$kind', 'reversal'] },
                  { $multiply: ['$amountMinor', -1] },
                  '$amountMinor',
                ],
              },
            },
          },
        },
      ]).session(session);
      if ((payments[0]?.netMinor || 0) !== 0) {
        throw Object.assign(new Error('Reverse supplier payments before reversing this purchase'), { statusCode: 409 });
      }

      for (const line of original.lines) {
        if (line.itemType === 'raw_material') {
          const rm = await RawMaterial.findById(line.rawMaterial).session(session);
          if (!rm) throw Object.assign(new Error(`Raw material not found: ${line.rawMaterialName}`), { statusCode: 409 });
          if (rm.currentStock < line.quantity) {
            throw Object.assign(new Error(`Cannot reverse purchase: raw material "${rm.name}" has already been consumed in packaging/production`), { statusCode: 409 });
          }
          rm.currentStock -= line.quantity;
          if (line.averageCostBeforeMinor != null) {
            rm.averageCostMinor = line.averageCostBeforeMinor;
          }
          await rm.save({ session });
        } else {
          const product = await Product.findById(line.product)
            .select('+variants.averageCostMinor')
            .session(session);
          const variant = product?.variants.find((item) => item.label === line.variantLabel);
          if (!variant) throw Object.assign(new Error(`Inventory variant not found: ${line.productName} (${line.variantLabel})`), { statusCode: 409 });
          if (
            variant.stock !== line.stockAfter
            || (variant.averageCostMinor ?? null) !== (line.averageCostAfterMinor ?? null)
          ) {
            throw Object.assign(new Error(`Inventory changed since this purchase. Record a corrective stock adjustment instead of reversing it.`), { statusCode: 409 });
          }
          variant.stock = line.stockBefore;
          variant.averageCostMinor = line.averageCostBeforeMinor ?? null;
          await product.save({ session });
        }
      }

      [reversal] = await InventoryPurchase.create([{
        supplier: original.supplier,
        supplierName: original.supplierName,
        reference: original.reference,
        purchaseDate: new Date(),
        kind: 'reversal',
        reversalOf: original._id,
        lines: original.lines.map((line) => ({
          itemType: line.itemType || 'product',
          product: line.product,
          productName: line.productName,
          variantLabel: line.variantLabel,
          rawMaterial: line.rawMaterial,
          rawMaterialName: line.rawMaterialName,
          unit: line.unit,
          quantity: line.quantity,
          unitCostMinor: line.unitCostMinor,
          additionalCostMinor: line.additionalCostMinor,
          stockBefore: line.stockAfter,
          averageCostBeforeMinor: line.averageCostAfterMinor,
          stockAfter: line.stockBefore,
          averageCostAfterMinor: line.averageCostBeforeMinor,
        })),
        totalCostMinor: original.totalCostMinor,
        amountPaidMinor: 0,
        paymentStatus: 'paid',
        notes: data.reason,
        createdBy: req.user._id,
      }], { session });
      await audit(req, 'purchase.reversed', 'inventoryPurchase', reversal._id, {
        originalId: String(original._id),
        totalCostMinor: original.totalCostMinor,
        reason: data.reason,
      }, session);

      // Audit stock reversal in warehouse StockMovement log
      const reversalMovements = original.lines.map((line) => ({
        product: line.product,
        productName: line.productName,
        variantLabel: line.variantLabel,
        type: 'damage_loss',
        quantityChange: -line.quantity,
        stockBefore: line.stockAfter,
        stockAfter: line.stockBefore,
        reason: `Purchase Reversal #${original.reference || original._id}: ${data.reason}`,
        reference: String(reversal._id),
        actor: req.user._id,
        actorName: req.user.name || 'Accountant',
      }));
      await StockMovement.insertMany(reversalMovements, { session });
    });
    res.status(201).json({ purchase: reversal });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

const sendError = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

const audit = (req, action, entity, entityId, details = {}, session) =>
  AccountAuditLog.create(
    [{
      actor: req.user._id,
      action,
      entity,
      entityId: String(entityId || ''),
      details,
    }],
    session ? { session } : undefined
  );

const noStore = (res) => {
  res.set({
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
};

export const adminGetSuppliers = async (req, res, next) => {
  try {
    noStore(res);
    const [suppliers, productCounts, purchaseStats] = await Promise.all([
      Supplier.find().sort({ isActive: -1, name: 1 }).lean(),
      Product.aggregate([
        { $match: { primarySupplier: { $ne: null } } },
        { $group: { _id: '$primarySupplier', count: { $sum: 1 } } },
      ]),
      InventoryPurchase.aggregate([
        { $match: { supplier: { $ne: null } } },
        {
          $group: {
            _id: '$supplier',
            totalPurchasedMinor: {
              $sum: {
                $cond: [
                  { $eq: ['$kind', 'reversal'] },
                  { $multiply: ['$totalCostMinor', -1] },
                  '$totalCostMinor',
                ],
              },
            },
            amountPaidMinor: { $sum: '$amountPaidMinor' },
          },
        },
      ]),
    ]);

    const productCountMap = new Map(productCounts.map((p) => [String(p._id), p.count]));
    const purchaseMap = new Map(purchaseStats.map((p) => [String(p._id), p]));

    const paymentStats = await SupplierPayment.aggregate([
      {
        $lookup: {
          from: 'inventorypurchases',
          localField: 'purchase',
          foreignField: '_id',
          as: 'purchaseDoc',
        },
      },
      { $unwind: '$purchaseDoc' },
      { $match: { 'purchaseDoc.supplier': { $ne: null } } },
      {
        $group: {
          _id: '$purchaseDoc.supplier',
          extraPaidMinor: {
            $sum: {
              $cond: [
                { $eq: ['$kind', 'reversal'] },
                { $multiply: ['$amountMinor', -1] },
                '$amountMinor',
              ],
            },
          },
        },
      },
    ]);

    const extraPaymentMap = new Map(paymentStats.map((p) => [String(p._id), p.extraPaidMinor]));

    const enrichedSuppliers = suppliers.map((supplier) => {
      const stats = purchaseMap.get(String(supplier._id)) || { totalPurchasedMinor: 0, amountPaidMinor: 0 };
      const extraPaid = extraPaymentMap.get(String(supplier._id)) || 0;
      const totalPaidMinor = stats.amountPaidMinor + extraPaid;
      const balanceMinor = Math.max(0, stats.totalPurchasedMinor - totalPaidMinor);

      return {
        ...supplier,
        productCount: productCountMap.get(String(supplier._id)) || 0,
        totalPurchased: fromMinorUnits(stats.totalPurchasedMinor),
        totalPaid: fromMinorUnits(totalPaidMinor),
        balance: fromMinorUnits(balanceMinor),
      };
    });

    res.json({ suppliers: enrichedSuppliers });
  } catch (error) {
    next(error);
  }
};

export const adminGetSupplierStatement = async (req, res, next) => {
  try {
    noStore(res);
    const supplier = await Supplier.findById(req.params.id).lean();
    if (!supplier) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });

    const [purchases, products] = await Promise.all([
      InventoryPurchase.find({ supplier: supplier._id })
        .sort({ purchaseDate: -1, createdAt: -1 })
        .populate('createdBy', 'name email')
        .lean(),
      Product.find({ primarySupplier: supplier._id })
        .select('name slug variants images category isActive totalSold')
        .populate('category', 'name')
        .lean(),
    ]);

    const purchaseIds = purchases.map((p) => p._id);
    const payments = await SupplierPayment.find({ purchase: { $in: purchaseIds } })
      .sort({ paymentDate: -1, createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    const paymentTotals = await SupplierPayment.aggregate([
      { $match: { purchase: { $in: purchaseIds } } },
      {
        $group: {
          _id: '$purchase',
          paidMinor: {
            $sum: { $cond: [{ $eq: ['$kind', 'reversal'] }, { $multiply: ['$amountMinor', -1] }, '$amountMinor'] },
          },
        },
      },
    ]);
    const paymentsByPurchase = new Map(paymentTotals.map((p) => [String(p._id), p.paidMinor]));

    let totalPurchasedMinor = 0;
    let totalPaidMinor = 0;

    const formattedPurchases = purchases.map((purchase) => {
      if (purchase.kind !== 'reversal') {
        totalPurchasedMinor += purchase.totalCostMinor;
      } else {
        totalPurchasedMinor -= purchase.totalCostMinor;
      }
      const paidMinor = purchase.amountPaidMinor + (paymentsByPurchase.get(String(purchase._id)) || 0);
      totalPaidMinor += paidMinor;

      return {
        ...purchase,
        totalCost: fromMinorUnits(purchase.totalCostMinor),
        amountPaid: fromMinorUnits(paidMinor),
        balance: fromMinorUnits(Math.max(0, purchase.totalCostMinor - paidMinor)),
        lines: purchase.lines.map((l) => ({
          ...l,
          unitCost: fromMinorUnits(l.unitCostMinor),
          additionalCost: fromMinorUnits(l.additionalCostMinor),
        })),
      };
    });

    const formattedPayments = payments.map((payment) => ({
      ...payment,
      amount: fromMinorUnits(payment.amountMinor),
    }));

    const balanceMinor = Math.max(0, totalPurchasedMinor - totalPaidMinor);

    res.json({
      supplier,
      products,
      summary: {
        totalPurchasesCount: purchases.length,
        productsCount: products.length,
        totalPurchased: fromMinorUnits(totalPurchasedMinor),
        totalPaid: fromMinorUnits(totalPaidMinor),
        outstandingBalance: fromMinorUnits(balanceMinor),
      },
      purchases: formattedPurchases,
      payments: formattedPayments,
    });
  } catch (error) {
    next(error);
  }
};

export const adminCreateSupplier = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = supplierInputSchema.parse(req.body);
    let supplier;
    await session.withTransaction(async () => {
      [supplier] = await Supplier.create([{
        ...data,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      }], { session });
      await audit(req, 'supplier.created', 'supplier', supplier._id, {}, session);
    });
    res.status(201).json({ supplier });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminUpdateSupplier = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = supplierInputSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    let supplier;
    await session.withTransaction(async () => {
      supplier = await Supplier.findById(req.params.id).session(session);
      if (!supplier) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
      const before = {
        name: supplier.name,
        isActive: supplier.isActive,
      };
      Object.assign(supplier, data, { updatedBy: req.user._id });
      await supplier.save({ session });
      await audit(req, 'supplier.updated', 'supplier', supplier._id, {
        fields: Object.keys(data).sort(),
        before,
        after: {
          name: data.name ?? supplier.name,
          isActive: data.isActive ?? supplier.isActive,
        },
      }, session);
    });
    res.json({ supplier });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminGetPurchases = async (req, res, next) => {
  try {
    noStore(res);
    const purchases = await InventoryPurchase.find()
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(200)
      .populate('supplier', 'name')
      .populate('createdBy', 'name email')
      .lean();
    const paymentTotals = await SupplierPayment.aggregate([
      { $match: { purchase: { $in: purchases.map((purchase) => purchase._id) } } },
      {
        $group: {
          _id: '$purchase',
          paidMinor: {
            $sum: { $cond: [{ $eq: ['$kind', 'reversal'] }, { $multiply: ['$amountMinor', -1] }, '$amountMinor'] },
          },
        },
      },
    ]);
    const paymentsByPurchase = new Map(paymentTotals.map((payment) => [String(payment._id), payment.paidMinor]));
    const reversedPurchaseIds = new Set(
      purchases.filter((purchase) => purchase.reversalOf).map((purchase) => String(purchase.reversalOf))
    );
    res.json({
      purchases: purchases.map((purchase) => {
        const amountPaidMinor = purchase.amountPaidMinor + (paymentsByPurchase.get(String(purchase._id)) || 0);
        const reversed = purchase.kind === 'reversal' || reversedPurchaseIds.has(String(purchase._id));
        return ({
          ...purchase,
          totalCost: fromMinorUnits(purchase.totalCostMinor),
          amountPaid: fromMinorUnits(amountPaidMinor),
          paymentStatus: reversed
            ? 'reversed'
            : amountPaidMinor >= purchase.totalCostMinor
              ? 'paid'
              : amountPaidMinor > 0 ? 'partial' : 'unpaid',
          canReverse: purchase.kind !== 'reversal' && !reversed && amountPaidMinor === 0,
          additionalCosts: (purchase.additionalCosts || []).map((ac) => ({
            category: ac.category,
            amount: fromMinorUnits(ac.amountMinor),
            allocationMethod: ac.allocationMethod,
          })),
          lines: purchase.lines.map((line) => ({
            ...line,
            unitCost: fromMinorUnits(line.unitCostMinor),
            additionalCost: fromMinorUnits(line.additionalCostMinor),
            landedUnitCost: line.landedUnitCostMinor != null
              ? fromMinorUnits(line.landedUnitCostMinor)
              : fromMinorUnits(line.unitCostMinor + Math.round((line.additionalCostMinor || 0) / (line.quantity || 1))),
            costBreakdown: (line.costBreakdown || []).map((cb) => ({
              category: cb.category,
              amount: fromMinorUnits(cb.amountMinor),
            })),
          })),
        });
      }),
    });
  } catch (error) {
    next(error);
  }
};

export const adminCreatePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = purchaseInputSchema.parse(req.body);
    const lineKeys = data.lines.map((line) =>
      line.itemType === 'raw_material' ? `rm:${line.rawMaterial}` : `prod:${line.product}:${line.variantLabel}`
    );
    if (new Set(lineKeys).size !== lineKeys.length) {
      return sendError(res, 400, 'A purchase cannot contain duplicate product variants or raw materials');
    }
    const supplierId = data.supplier || null;
    let supplierName = data.supplierName.trim();
    const lines = [];
    let totalCostMinor = 0;
    const amountPaidMinor = toMinorUnits(data.amountPaid, 'Amount paid');
    const purchaseDate = dateToUtc(data.purchaseDate);

    // Parse and validate invoice-level additional costs
    const parsedAdditionalCosts = (data.additionalCosts || []).map((ac) => ({
      category: ac.category.trim(),
      amountMinor: toMinorUnits(ac.amount, ac.category),
      allocationMethod: ac.allocationMethod,
    })).filter((ac) => ac.amountMinor > 0);

    // Pre-calculate allocation of invoice-level additional costs across lines
    const lineCount = data.lines.length;
    const lineAllocatedBatchCostsMinor = new Array(lineCount).fill(0);
    const lineCostBreakdowns = Array.from({ length: lineCount }, () => []);

    for (const extraCost of parsedAdditionalCosts) {
      let weights;
      if (extraCost.allocationMethod === 'value') {
        weights = data.lines.map((l) => toMinorUnits(l.unitCost, 'Unit cost') * l.quantity);
      } else if (extraCost.allocationMethod === 'equal') {
        weights = data.lines.map(() => 1);
      } else {
        // default: 'quantity'
        weights = data.lines.map((l) => l.quantity);
      }

      const allocatedShares = allocateLargestRemainder(extraCost.amountMinor, weights);
      for (let i = 0; i < lineCount; i++) {
        lineAllocatedBatchCostsMinor[i] += allocatedShares[i];
        if (allocatedShares[i] > 0) {
          lineCostBreakdowns[i].push({
            category: extraCost.category,
            amountMinor: Math.round(allocatedShares[i] / data.lines[i].quantity),
          });
        }
      }
    }

    await session.withTransaction(async () => {
      if (supplierId) {
        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier || !supplier.isActive) throw Object.assign(new Error('Active supplier not found'), { statusCode: 404 });
        supplierName = supplier.name;
      }
      if (!supplierName) throw Object.assign(new Error('Supplier name is required'), { statusCode: 400 });

      for (let i = 0; i < data.lines.length; i++) {
        const inputLine = data.lines[i];

        if (inputLine.itemType === 'raw_material') {
          const rm = await RawMaterial.findById(inputLine.rawMaterial).session(session);
          if (!rm || !rm.isActive) throw Object.assign(new Error('Active raw material not found'), { statusCode: 404 });

          const unitCostMinor = toMinorUnits(inputLine.unitCost, 'Unit cost');
          const directAdditionalCostMinor = toMinorUnits(inputLine.additionalCost || 0, 'Additional cost');
          const batchAllocatedMinor = lineAllocatedBatchCostsMinor[i];
          const totalLineAdditionalCostMinor = directAdditionalCostMinor + batchAllocatedMinor;
          const lineCostMinor = Math.round(unitCostMinor * inputLine.quantity + totalLineAdditionalCostMinor);
          if (!Number.isSafeInteger(lineCostMinor)) throw Object.assign(new Error('Purchase amount exceeds supported precision'), { statusCode: 400 });
          totalCostMinor += lineCostMinor;
          if (!Number.isSafeInteger(totalCostMinor)) throw Object.assign(new Error('Purchase total exceeds supported precision'), { statusCode: 400 });

          const landedUnitCostMinor = Math.round(lineCostMinor / inputLine.quantity);

          const breakdown = [
            { category: 'Purchase Price', amountMinor: unitCostMinor },
          ];
          if (directAdditionalCostMinor > 0) {
            breakdown.push({
              category: 'Direct Extra',
              amountMinor: Math.round(directAdditionalCostMinor / inputLine.quantity),
            });
          }
          for (const item of lineCostBreakdowns[i]) {
            breakdown.push(item);
          }

          const previousStock = rm.currentStock || 0;
          const previousAverageCost = rm.averageCostMinor || 0;

          rm.currentStock = previousStock + inputLine.quantity;
          if (previousStock === 0 || !previousAverageCost) {
            rm.averageCostMinor = landedUnitCostMinor;
          } else {
            const previousValue = previousStock * previousAverageCost;
            const combinedValue = previousValue + lineCostMinor;
            rm.averageCostMinor = rm.currentStock > 0 ? Math.round(combinedValue / rm.currentStock) : landedUnitCostMinor;
          }
          rm.latestUnitCostMinor = landedUnitCostMinor;
          if (supplierId && !rm.primarySupplier) {
            rm.primarySupplier = supplierId;
          }
          await rm.save({ session });

          lines.push({
            itemType: 'raw_material',
            rawMaterial: rm._id,
            rawMaterialName: rm.name,
            unit: rm.unit,
            quantity: inputLine.quantity,
            unitCostMinor,
            additionalCostMinor: totalLineAdditionalCostMinor,
            landedUnitCostMinor,
            costBreakdown: breakdown,
            stockBefore: previousStock,
            stockAfter: rm.currentStock,
            averageCostBeforeMinor: previousAverageCost || null,
            averageCostAfterMinor: rm.averageCostMinor || null,
          });
        } else {
          const product = await Product.findById(inputLine.product)
            .select('+variants.averageCostMinor')
            .session(session);
          if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
          const variant = product.variants.find((item) => item.label === inputLine.variantLabel);
          if (!variant) throw Object.assign(new Error(`Variant not found for ${product.name}`), { statusCode: 400 });

          if (data.kind === 'opening_stock') {
            const openingAlreadyRecorded = await InventoryPurchase.exists({
              kind: 'opening_stock',
              lines: { $elemMatch: { product: product._id, variantLabel: variant.label } },
            }).session(session);
            if (openingAlreadyRecorded) {
              throw Object.assign(new Error(`Opening inventory was already recorded for ${product.name} (${variant.label})`), { statusCode: 409 });
            }
          }

          const unitCostMinor = toMinorUnits(inputLine.unitCost, 'Unit cost');
          const directAdditionalCostMinor = toMinorUnits(inputLine.additionalCost || 0, 'Additional cost');
          const batchAllocatedMinor = lineAllocatedBatchCostsMinor[i];
          const totalLineAdditionalCostMinor = directAdditionalCostMinor + batchAllocatedMinor;
          const lineCostMinor = unitCostMinor * inputLine.quantity + totalLineAdditionalCostMinor;
          if (!Number.isSafeInteger(lineCostMinor)) throw Object.assign(new Error('Purchase amount exceeds supported precision'), { statusCode: 400 });
          totalCostMinor += lineCostMinor;
          if (!Number.isSafeInteger(totalCostMinor)) throw Object.assign(new Error('Purchase total exceeds supported precision'), { statusCode: 400 });

          const landedUnitCostMinor = Math.round(lineCostMinor / inputLine.quantity);

          // Build itemized cost breakdown per unit
          const breakdown = [
            { category: 'Purchase Price', amountMinor: unitCostMinor },
          ];
          if (directAdditionalCostMinor > 0) {
            breakdown.push({
              category: 'Direct Extra',
              amountMinor: Math.round(directAdditionalCostMinor / inputLine.quantity),
            });
          }
          for (const item of lineCostBreakdowns[i]) {
            breakdown.push(item);
          }

          const previousStock = variant.stock;
          const previousAverageCost = variant.averageCostMinor;
          if (data.kind === 'opening_stock') {
            variant.stock = inputLine.quantity;
            variant.averageCostMinor = landedUnitCostMinor;
          } else {
            // ── Purchases go to WAREHOUSE stock, not store shelf ──
            variant.warehouseStock = (variant.warehouseStock || 0) + inputLine.quantity;
          }
          if (data.kind !== 'opening_stock' && previousStock === 0) {
            variant.averageCostMinor = landedUnitCostMinor;
          } else if (data.kind !== 'opening_stock' && Number.isSafeInteger(previousAverageCost)) {
            const previousValue = previousStock * previousAverageCost;
            const combinedValue = previousValue + lineCostMinor;
            if (!Number.isSafeInteger(combinedValue)) throw Object.assign(new Error('Inventory valuation exceeds supported precision'), { statusCode: 400 });
            // Total inventory = store + warehouse for cost averaging
            const totalUnits = variant.stock + variant.warehouseStock;
            variant.averageCostMinor = totalUnits > 0 ? Math.round(combinedValue / totalUnits) : landedUnitCostMinor;
          }

          // Keep product pricing & costing metadata current
          variant.latestUnitCostMinor = unitCostMinor;
          variant.latestLandedCostMinor = landedUnitCostMinor;

          lines.push({
            itemType: 'product',
            product: product._id,
            productName: product.name,
            variantLabel: variant.label,
            quantity: inputLine.quantity,
            unitCostMinor,
            additionalCostMinor: totalLineAdditionalCostMinor,
            landedUnitCostMinor,
            costBreakdown: breakdown,
            stockBefore: previousStock,
            warehouseStockBefore: (variant.warehouseStock || 0) - inputLine.quantity,
            averageCostBeforeMinor: previousAverageCost ?? null,
            stockAfter: variant.stock,
            warehouseStockAfter: variant.warehouseStock,
            averageCostAfterMinor: variant.averageCostMinor ?? null,
          });
          await product.save({ session });
        }
      }

      if (amountPaidMinor > totalCostMinor) {
        throw Object.assign(new Error('Amount paid cannot exceed purchase total'), { statusCode: 400 });
      }
      const paymentStatus = amountPaidMinor === totalCostMinor
        ? 'paid'
        : amountPaidMinor > 0 ? 'partial' : 'unpaid';
      const dueDate = data.dueDate ? dateToUtc(data.dueDate) : null;

      // Auto-generate reference if not provided
      const autoRef = (() => {
        const digits = Math.floor(10000000 + Math.random() * 90000000);
        return `HN${digits}`;
      })();
      const resolvedReference = data.reference && data.reference.trim() ? data.reference.trim() : autoRef;

      const [purchase] = await InventoryPurchase.create([{
        supplier: supplierId,
        supplierName,
        reference: resolvedReference,
        purchaseDate,
        dueDate,
        kind: data.kind,
        lines,
        additionalCosts: parsedAdditionalCosts,
        totalCostMinor,
        amountPaidMinor,
        paymentStatus,
        notes: data.notes,
        createdBy: req.user._id,
      }], { session });
      await audit(req, 'purchase.created', 'inventoryPurchase', purchase._id, {
        totalCostMinor,
        amountPaidMinor,
        lineCount: lines.length,
        kind: data.kind,
      }, session);

      // Audit in warehouse StockMovement log
      const purchaseMovements = lines.map((line) => ({
        product: line.product,
        productName: line.productName,
        variantLabel: line.variantLabel,
        type: data.kind === 'opening_stock' ? 'goods_received' : 'purchase_bill',
        quantityChange: line.quantity,
        stockBefore: data.kind === 'opening_stock' ? line.stockBefore : (line.warehouseStockBefore || 0),
        stockAfter: data.kind === 'opening_stock' ? line.stockAfter : (line.warehouseStockAfter || 0),
        reason: data.kind === 'opening_stock'
          ? `Opening Stock #${data.reference || purchase._id} (${supplierName})`
          : `Warehouse Stock Received: Purchase Bill #${data.reference || purchase._id} (${supplierName})`,
        reference: data.reference || String(purchase._id),
        actor: req.user._id,
        actorName: req.user.name || 'Accountant',
      }));
      await StockMovement.insertMany(purchaseMovements, { session });

      req.createdPurchase = purchase;
    });

    const purchase = req.createdPurchase;

    // Invalidate product caches so fresh warehouse stock reflects immediately
    await delCacheByPrefix('products:list:').catch(() => {});
    await delCacheByPrefix('products:detail:').catch(() => {});

    res.status(201).json({
      purchase: {
        ...purchase.toObject(),
        totalCost: fromMinorUnits(purchase.totalCostMinor),
        amountPaid: fromMinorUnits(purchase.amountPaidMinor),
      },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminAddSupplierPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = z.object({
      amount: z.number().positive().max(100000000),
      paymentDate: dateOnlySchema,
      method: z.string().trim().max(60).optional().default(''),
      reference: z.string().trim().max(120).optional().default(''),
    }).parse(req.body);
    const amountMinor = toMinorUnits(data.amount, 'Payment amount');
    let payment;
    await session.withTransaction(async () => {
      const purchase = await InventoryPurchase.findById(req.params.id).select('+paymentRevision').session(session);
      if (!purchase) throw Object.assign(new Error('Purchase record not found'), { statusCode: 404 });
      if (purchase.kind === 'reversal') {
        throw Object.assign(new Error('A reversed purchase cannot accept payments'), { statusCode: 409 });
      }
      if (await InventoryPurchase.exists({ reversalOf: purchase._id }).session(session)) {
        throw Object.assign(new Error('A reversed purchase cannot accept payments'), { statusCode: 409 });
      }
      purchase.paymentRevision += 1;
      await purchase.save({ session });
      const payments = await SupplierPayment.aggregate([
        { $match: { purchase: purchase._id } },
        {
          $group: {
            _id: null,
            paidMinor: {
              $sum: { $cond: [{ $eq: ['$kind', 'reversal'] }, { $multiply: ['$amountMinor', -1] }, '$amountMinor'] },
            },
          },
        },
      ]).session(session);
      const totalPaid = purchase.amountPaidMinor + (payments[0]?.paidMinor || 0);
      if (totalPaid + amountMinor > purchase.totalCostMinor) {
        throw Object.assign(new Error('Payment cannot exceed the remaining purchase balance'), { statusCode: 400 });
      }
      [payment] = await SupplierPayment.create([{
        purchase: purchase._id,
        amountMinor,
        paymentDate: dateToUtc(data.paymentDate),
        method: data.method,
        reference: data.reference,
        createdBy: req.user._id,
      }], { session });
      await audit(req, 'supplierPayment.created', 'supplierPayment', payment._id, {
        purchaseId: String(purchase._id),
        amountMinor,
      }, session);
    });
    res.status(201).json({
      payment: { ...payment.toObject(), amount: fromMinorUnits(payment.amountMinor) },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminReverseSupplierPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = z.object({
      amount: z.number().positive().max(100000000),
      reason: z.string().trim().min(3).max(300),
    }).parse(req.body);
    const amountMinor = toMinorUnits(data.amount, 'Reversal amount');
    let reversal;
    await session.withTransaction(async () => {
      const original = await SupplierPayment.findById(req.params.id).select('+reversalRevision').session(session);
      if (!original || original.kind !== 'payment') {
        throw Object.assign(new Error('Original supplier payment not found'), { statusCode: 404 });
      }
      const purchase = await InventoryPurchase.findById(original.purchase).select('+paymentRevision').session(session);
      if (!purchase) throw Object.assign(new Error('Purchase record not found'), { statusCode: 404 });
      purchase.paymentRevision += 1;
      await purchase.save({ session });
      original.reversalRevision += 1;
      await original.save({ session });
      const alreadyReversed = await SupplierPayment.aggregate([
        { $match: { reversalOf: original._id, kind: 'reversal' } },
        { $group: { _id: null, amountMinor: { $sum: '$amountMinor' } } },
      ]).session(session);
      const remaining = original.amountMinor - (alreadyReversed[0]?.amountMinor || 0);
      if (amountMinor > remaining) {
        throw Object.assign(new Error('Reversal exceeds the remaining payment amount'), { statusCode: 400 });
      }
      [reversal] = await SupplierPayment.create([{
        purchase: original.purchase,
        kind: 'reversal',
        amountMinor,
        paymentDate: new Date(),
        reason: data.reason,
        reversalOf: original._id,
        createdBy: req.user._id,
      }], { session });
      await audit(req, 'supplierPayment.reversed', 'supplierPayment', reversal._id, {
        originalId: String(original._id),
        amountMinor,
      }, session);
    });
    res.status(201).json({
      payment: { ...reversal.toObject(), amount: fromMinorUnits(reversal.amountMinor) },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminGetExpenses = async (req, res, next) => {
  try {
    noStore(res);
    const expenses = await AccountExpense.find()
      .sort({ expenseDate: -1, createdAt: -1 })
      .limit(200)
      .populate('createdBy', 'name email')
      .lean();
    res.json({
      expenses: expenses.map((expense) => ({
        ...expense,
        amount: fromMinorUnits(expense.amountMinor),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const adminCreateExpense = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = expenseInputSchema.parse(req.body);
    const amountMinor = toMinorUnits(data.amount, 'Expense amount');
    if (!amountMinor) return sendError(res, 400, 'Expense amount must be greater than zero');
    let expense;
    await session.withTransaction(async () => {
      [expense] = await AccountExpense.create([{
        kind: 'expense',
        category: data.category,
        description: data.description,
        amountMinor,
        expenseDate: dateToUtc(data.expenseDate),
        paymentMethod: data.paymentMethod || 'cash',
        reference: data.reference,
        createdBy: req.user._id,
      }], { session });
      await audit(req, 'expense.created', 'accountExpense', expense._id, {
        amountMinor,
        category: expense.category,
      }, session);
    });
    res.status(201).json({
      expense: { ...expense.toObject(), amount: fromMinorUnits(expense.amountMinor) },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminReverseExpense = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = z.object({
      amount: z.number().positive().max(100000000),
      reason: z.string().trim().min(3).max(300),
    }).parse(req.body);
    const amountMinor = toMinorUnits(data.amount, 'Reversal amount');
    let reversal;
    await session.withTransaction(async () => {
      const original = await AccountExpense.findById(req.params.id).select('+reversalRevision').session(session);
      if (!original || original.kind !== 'expense') {
        throw Object.assign(new Error('Original expense not found'), { statusCode: 404 });
      }
      original.reversalRevision += 1;
      await original.save({ session });
      const alreadyReversed = await AccountExpense.aggregate([
        { $match: { reversalOf: original._id, kind: 'reversal' } },
        { $group: { _id: null, amountMinor: { $sum: '$amountMinor' } } },
      ]).session(session);
      const remaining = original.amountMinor - (alreadyReversed[0]?.amountMinor || 0);
      if (amountMinor > remaining) {
        throw Object.assign(new Error('Reversal exceeds the remaining expense amount'), { statusCode: 400 });
      }
      [reversal] = await AccountExpense.create([{
        kind: 'reversal',
        category: original.category,
        description: data.reason,
        amountMinor,
        expenseDate: new Date(),
        reference: original.reference,
        reversalOf: original._id,
        createdBy: req.user._id,
      }], { session });
      await audit(req, 'expense.reversed', 'accountExpense', reversal._id, {
        originalId: String(original._id),
        amountMinor,
      }, session);
    });
    res.status(201).json({
      expense: { ...reversal.toObject(), amount: fromMinorUnits(reversal.amountMinor) },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const adminGetAccountAudit = async (req, res, next) => {
  try {
    noStore(res);
    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.verified === 'true') {
      filter.verified = true;
    } else if (req.query.verified === 'false') {
      filter.verified = false;
    }

    const auditLogs = await AccountAuditLog.find(filter)
      .sort({ occurredAt: -1 })
      .limit(200)
      .populate('actor', 'name email role')
      .populate('verifiedBy', 'name email role')
      .lean();
    res.json({ auditLogs });
  } catch (error) {
    next(error);
  }
};

export const adminCreateAccountAuditCheck = async (req, res, next) => {
  try {
    const schema = z.object({
      periodLabel: z.string().trim().min(1).max(120),
      periodFrom: z.string().optional(),
      periodTo: z.string().optional(),
      physicalCashCount: z.number().min(0).max(100000000),
      bankBalanceCount: z.number().min(0).max(100000000),
      notes: z.string().trim().max(1000).optional().default(''),
      discrepancyReason: z.string().trim().max(1000).optional().default(''),
    });

    const data = schema.parse(req.body);

    // Calculate system totals for the specified period or today
    let fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    let toDate = new Date();
    toDate.setHours(23, 59, 59, 999);

    if (data.periodFrom && data.periodTo) {
      fromDate = new Date(`${data.periodFrom}T00:00:00.000Z`);
      toDate = new Date(`${data.periodTo}T23:59:59.999Z`);
    }

    const [orders, expenses, purchases, supplierPayments] = await Promise.all([
      Order.find({
        createdAt: { $gte: fromDate, $lte: toDate },
        paymentStatus: 'paid',
        orderStatus: { $nin: ['cancelled', 'returned'] },
      }).select('total subtotal discount').lean(),
      AccountExpense.find({
        expenseDate: { $gte: fromDate, $lte: toDate },
      }).select('amountMinor kind').lean(),
      InventoryPurchase.find({
        purchaseDate: { $gte: fromDate, $lte: toDate },
      }).select('totalCostMinor amountPaidMinor kind').lean(),
      SupplierPayment.find({
        paymentDate: { $gte: fromDate, $lte: toDate },
      }).select('amountMinor kind').lean(),
    ]);

    const systemSalesPKR = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const systemExpensesPKR = expenses.reduce((sum, e) => {
      const amt = fromMinorUnits(e.amountMinor);
      return e.kind === 'reversal' ? sum - amt : sum + amt;
    }, 0);
    const systemPurchasesPKR = purchases.reduce((sum, p) => {
      const amt = fromMinorUnits(p.totalCostMinor);
      return p.kind === 'reversal' ? sum - amt : sum + amt;
    }, 0);
    const supplierPaidPKR = supplierPayments.reduce((sum, sp) => {
      const amt = fromMinorUnits(sp.amountMinor);
      return sp.kind === 'reversal' ? sum - amt : sum + amt;
    }, 0);

    const netCashInflowPKR = systemSalesPKR - systemExpensesPKR - supplierPaidPKR;
    const totalPhysicalAndBankPKR = data.physicalCashCount + data.bankBalanceCount;
    const variancePKR = totalPhysicalAndBankPKR - netCashInflowPKR;
    const isBalanced = Math.abs(variancePKR) < 1;

    const auditEntry = await AccountAuditLog.create({
      actor: req.user._id,
      action: 'audit.check_completed',
      entity: 'accounts_audit',
      entityId: `AUDIT-${Date.now().toString().slice(-6)}`,
      verified: true,
      verifiedBy: req.user._id,
      verifiedByName: req.user?.name || 'Administrator',
      verifiedAt: new Date(),
      verificationNotes: data.notes || 'Verified and signed off by administrator',
      details: {
        periodLabel: data.periodLabel,
        periodFrom: data.periodFrom || fromDate.toISOString().slice(0, 10),
        periodTo: data.periodTo || toDate.toISOString().slice(0, 10),
        systemSalesPKR,
        systemExpensesPKR,
        systemPurchasesPKR,
        supplierPaidPKR,
        netCashInflowPKR,
        physicalCashCount: data.physicalCashCount,
        bankBalanceCount: data.bankBalanceCount,
        totalCountedPKR: totalPhysicalAndBankPKR,
        variancePKR,
        isBalanced,
        notes: data.notes,
        discrepancyReason: data.discrepancyReason,
        checkedBy: req.user?.name || 'Administrator',
        checkedEmail: req.user?.email || '',
        checkedRole: req.user?.role || 'admin',
      },
    });

    res.status(201).json({
      success: true,
      message: isBalanced
        ? 'Accounts audit completed and balanced successfully!'
        : `Accounts audit completed with variance of ${variancePKR > 0 ? '+' : ''}${variancePKR.toLocaleString()} PKR.`,
      auditEntry,
    });
  } catch (error) {
    next(error);
  }
};

export const adminVerifyAccountAuditEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      notes: z.string().trim().max(500).optional().default('Checked and verified by admin'),
    });
    const { notes } = schema.parse(req.body);

    const auditEntry = await AccountAuditLog.findByIdAndUpdate(
      id,
      {
        verified: true,
        verifiedBy: req.user._id,
        verifiedByName: req.user?.name || 'Administrator',
        verifiedAt: new Date(),
        verificationNotes: notes,
      },
      { returnDocument: 'after' }
    ).populate('actor', 'name email role').populate('verifiedBy', 'name email role');

    if (!auditEntry) {
      throw Object.assign(new Error('Audit log entry not found'), { statusCode: 404 });
    }

    res.json({
      success: true,
      message: 'Audit entry verified and marked as checked by admin.',
      auditEntry,
    });
  } catch (error) {
    next(error);
  }
};

const getReportData = async (range) => {
  const orderFilter = {
    createdAt: { $gte: range.from, $lte: range.until },
    paymentStatus: { $in: ['paid', 'refunded'] },
  };
  const [orders, expenses, purchases, supplierPayments] = await Promise.all([
    Order.find(orderFilter)
      .select('orderId createdAt paymentStatus orderStatus total subtotal discount items.name items.variantLabel items.price items.quantity +items.unitCostMinor')
      .sort({ createdAt: 1 })
      .limit(10001)
      .lean(),
    AccountExpense.find({ expenseDate: { $gte: range.from, $lte: range.until } })
      .select('kind category description amountMinor expenseDate reference')
      .sort({ expenseDate: 1 })
      .limit(10001)
      .lean(),
    InventoryPurchase.find({ purchaseDate: { $gte: range.from, $lte: range.until } })
      .select('supplierName reference purchaseDate totalCostMinor amountPaidMinor paymentStatus kind')
      .sort({ purchaseDate: 1 })
      .limit(10001)
      .lean(),
    SupplierPayment.find({ paymentDate: { $gte: range.from, $lte: range.until } })
      .select('purchase amountMinor paymentDate kind method reference reason')
      .limit(10001)
      .lean(),
  ]);
  if (orders.length > 10000 || expenses.length > 10000 || purchases.length > 10000 || supplierPayments.length > 10000) {
    const error = new Error('Report contains too many records. Narrow the date range.');
    error.statusCode = 413;
    throw error;
  }
  return { orders, expenses, purchases, supplierPayments };
};

const makeReport = (orders, expenses) => {
  const report = calculateAccountsReport(orders, expenses);
  const byProduct = new Map();
  for (const order of orders) {
    if (order.paymentStatus !== 'paid' || ['cancelled', 'returned'].includes(order.orderStatus)) continue;
    const subtotalMinor = toMinorUnits(order.subtotal || 0, 'Order subtotal');
    const salesMinor = Math.max(0, subtotalMinor - toMinorUnits(order.discount || 0, 'Order discount'));
    const itemGrossMinor = order.items.reduce(
      (sum, item) => sum + toMinorUnits(item.price, 'Item sale price') * item.quantity,
      0
    );
    const allocations = order.items.map((item) => {
      const grossMinor = toMinorUnits(item.price, 'Item sale price') * item.quantity;
      const exactShare = itemGrossMinor ? grossMinor * salesMinor / itemGrossMinor : 0;
      return { netMinor: Math.floor(exactShare), remainder: exactShare % 1 };
    });
    let remainingPennies = salesMinor - allocations.reduce((sum, item) => sum + item.netMinor, 0);
    for (const allocation of [...allocations].sort((a, b) => b.remainder - a.remainder)) {
      if (remainingPennies <= 0) break;
      allocation.netMinor += 1;
      remainingPennies -= 1;
    }
    for (const [index, item] of order.items.entries()) {
      const key = `${String(item.name).toLowerCase()}|${item.variantLabel}`;
      const netMinor = allocations[index].netMinor;
      const entry = byProduct.get(key) || {
        name: item.name,
        variantLabel: item.variantLabel,
        quantity: 0,
        salesMinor: 0,
        cogsMinor: 0,
        unknownCostOrderIds: new Set(),
      };
      entry.quantity += item.quantity;
      entry.salesMinor += netMinor;
      if (Number.isSafeInteger(item.unitCostMinor)) {
        entry.cogsMinor += item.unitCostMinor * item.quantity;
      } else {
        entry.unknownCostOrderIds.add(String(order.orderId || order._id));
      }
      byProduct.set(key, entry);
    }
  }
  report.products = [...byProduct.values()].map((item) => ({
    name: item.name,
    variantLabel: item.variantLabel,
    quantity: item.quantity,
    sales: fromMinorUnits(item.salesMinor),
    costOfGoodsSold: item.unknownCostOrderIds.size ? null : fromMinorUnits(item.cogsMinor),
    grossProfit: item.unknownCostOrderIds.size ? null : fromMinorUnits(item.salesMinor - item.cogsMinor),
    missingCostOrders: item.unknownCostOrderIds.size,
  })).sort((a, b) => b.sales - a.sales);
  return report;
};

export const adminGetAccountReport = async (req, res, next) => {
  try {
    noStore(res);
    const range = getAccountsDateRange(req.query);
    const { orders, expenses, purchases, supplierPayments } = await getReportData(range);
    const report = makeReport(orders, expenses);
    const inventoryPurchasesMinor = purchases.reduce(
      (sum, purchase) => sum + (purchase.kind === 'reversal' ? -purchase.totalCostMinor : purchase.totalCostMinor),
      0
    );
    const supplierPaymentsMinor = purchases.reduce((sum, purchase) => sum + purchase.amountPaidMinor, 0)
      + supplierPayments.reduce((sum, payment) => sum + (payment.kind === 'reversal' ? -payment.amountMinor : payment.amountMinor), 0);
    report.summary.inventoryPurchases = fromMinorUnits(inventoryPurchasesMinor);
    report.summary.supplierPayments = fromMinorUnits(supplierPaymentsMinor);

    // Factor in cash payments to suppliers into drawer cashFlow
    if (report.summary.cashFlow) {
      const cashPaymentsToSuppliersMinor = purchases.reduce((sum, p) => p.amountPaidMinor || 0, 0)
        + supplierPayments.reduce((sum, p) => ((p.method?.toLowerCase().includes('cash') || !p.method) ? (p.kind === 'reversal' ? -p.amountMinor : p.amountMinor) : 0), 0);
      const totalCashOutflowMinor = Math.round((report.summary.cashFlow.cashOutflow || 0) * 100) + cashPaymentsToSuppliersMinor;
      const totalCashInflowMinor = Math.round((report.summary.cashFlow.cashInflow || 0) * 100);
      report.summary.cashFlow.cashSupplierPayments = fromMinorUnits(cashPaymentsToSuppliersMinor);
      report.summary.cashFlow.cashOutflow = fromMinorUnits(totalCashOutflowMinor);
      report.summary.cashFlow.expectedDrawerCash = fromMinorUnits(totalCashInflowMinor - totalCashOutflowMinor);
    }
    res.json({
      range: {
        startDate: range.startDate,
        endDate: range.endDate,
        timeZone: range.timeZone,
      },
      summary: report.summary,
      products: report.products,
      purchaseCount: purchases.length,
    });
  } catch (error) {
    if (error instanceof RangeError) error.statusCode = 400;
    next(error);
  }
};

export const adminExportAccountReport = async (req, res, next) => {
  try {
    noStore(res);
    const range = getAccountsDateRange(req.query);
    const { orders, expenses, purchases, supplierPayments } = await getReportData(range);
    const report = makeReport(orders, expenses);
    report.summary.inventoryPurchases = fromMinorUnits(
      purchases.reduce(
        (sum, purchase) => sum + (purchase.kind === 'reversal' ? -purchase.totalCostMinor : purchase.totalCostMinor),
        0
      )
    );
    report.summary.supplierPayments = fromMinorUnits(
      purchases.reduce((sum, purchase) => sum + purchase.amountPaidMinor, 0)
      + supplierPayments.reduce((sum, payment) => sum + (payment.kind === 'reversal' ? -payment.amountMinor : payment.amountMinor), 0)
    );
    const generatedAt = new Date();
    await audit(req, 'report.exported', 'accountReport', '', {
      startDate: range.startDate,
      endDate: range.endDate,
      orderCount: orders.length,
      expenseCount: expenses.length,
      purchaseCount: purchases.length,
    });
    const workbook = await buildAccountsXlsx({ range, report, purchases, supplierPayments, generatedAt });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="accounts-${range.startDate}-to-${range.endDate}.xlsx"`,
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(Buffer.from(workbook));
  } catch (error) {
    if (error instanceof RangeError) error.statusCode = 400;
    next(error);
  }
};
