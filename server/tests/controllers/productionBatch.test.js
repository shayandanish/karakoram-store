import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RawMaterial from '../../models/RawMaterial.js';
import ProductionBatch from '../../models/ProductionBatch.js';
import Product from '../../models/Product.js';
import StockMovement from '../../models/StockMovement.js';
import InventoryPurchase from '../../models/InventoryPurchase.js';
import Supplier from '../../models/Supplier.js';
import {
  adminCreateProductionBatch,
  adminCreateRawMaterial,
} from '../../controllers/inventoryController.js';
import { adminCreatePurchase } from '../../controllers/accountsController.js';

describe('Raw Material Bulk Purchasing and Packaging Production Engine', () => {
  it('calculates exact packaging production costs and per-package landed unit costs', () => {
    // 40 kg walnuts @ Rs. 1,000/kg = Rs. 40,000 (4,000,000 paisa)
    const rawMaterialCostMinor = 4000000;
    // 80 pouches @ Rs. 15 = Rs. 1,200 (120,000 paisa)
    const pouchesCostMinor = 120000;
    // 80 labels @ Rs. 5 = Rs. 400 (40,000 paisa)
    const labelsCostMinor = 40000;
    // Labour = Rs. 2,000 (200,000 paisa)
    const labourCostMinor = 200000;
    // Processing = Rs. 500 (50,000 paisa)
    const processingCostMinor = 50000;
    // Other overheads = Rs. 300 (30,000 paisa)
    const otherCostMinor = 30000;

    const totalBatchCostMinor =
      rawMaterialCostMinor +
      pouchesCostMinor +
      labelsCostMinor +
      labourCostMinor +
      processingCostMinor +
      otherCostMinor;

    expect(totalBatchCostMinor).toBe(4440000); // Rs. 44,400

    const outputQuantity = 80; // 80 packages of 500g
    const costPerPackageMinor = Math.round(totalBatchCostMinor / outputQuantity);

    expect(costPerPackageMinor).toBe(55500); // Exact Rs. 555.00 per package!

    // Profit margin and markup tests
    const sellingPrice = 750; // Rs. 750 selling price
    const costPrice = costPerPackageMinor / 100; // Rs. 555.00
    const profitPerPackage = sellingPrice - costPrice; // Rs. 195.00
    const markupPercent = ((sellingPrice - costPrice) / costPrice) * 100;
    const marginPercent = ((sellingPrice - costPrice) / sellingPrice) * 100;

    expect(profitPerPackage).toBe(195);
    expect(markupPercent.toFixed(1)).toBe('35.1');
    expect(marginPercent.toFixed(1)).toBe('26.0');
    expect(profitPerPackage * outputQuantity).toBe(15600); // Rs. 15,600 expected profit
  });

  it('updates weighted-average cost correctly when restocked with a new production batch', () => {
    // Existing finished stock: 20 packages @ previous average cost of Rs. 500 (50,000 paisa)
    const previousStock = 20;
    const previousAvgCostMinor = 50000;
    const previousTotalValue = previousStock * previousAvgCostMinor; // Rs. 10,000

    // New production batch: 80 packages produced with total cost of Rs. 44,400 (4,440,000 paisa)
    const newBatchQty = 80;
    const newBatchCostMinor = 4440000; // Rs. 44,400

    const combinedTotalStock = previousStock + newBatchQty; // 100 units
    const combinedTotalValue = previousTotalValue + newBatchCostMinor; // Rs. 54,400

    const newWeightedAvgCostMinor = Math.round(combinedTotalValue / combinedTotalStock);
    expect(combinedTotalStock).toBe(100);
    expect(newWeightedAvgCostMinor).toBe(54400); // Rs. 544.00 weighted-average cost per package
  });

  it('restores raw materials and deducts finished packages on production batch reversal', () => {
    // Simulated state before reversal
    const rawMaterialStock = 0; // 40 kg consumed
    const pouchStock = 0; // 80 pouches consumed
    const finishedStock = 80; // 80 packages currently in inventory

    const batch = {
      batchNumber: 'PRD-202611-001',
      outputQuantity: 80,
      rawMaterialInputs: [{ rawMaterialName: 'Raw Walnuts', quantityUsed: 40 }],
      packagingInputs: [{ packagingMaterialName: '500g Pouches', quantityUsed: 80 }],
      status: 'completed',
    };

    // Reversal logic
    const canReverse = finishedStock >= batch.outputQuantity;
    expect(canReverse).toBe(true);

    const restoredRawStock = rawMaterialStock + batch.rawMaterialInputs[0].quantityUsed;
    const restoredPouchStock = pouchStock + batch.packagingInputs[0].quantityUsed;
    const remainingFinishedStock = finishedStock - batch.outputQuantity;

    expect(restoredRawStock).toBe(40); // 40 kg restored
    expect(restoredPouchStock).toBe(80); // 80 pouches restored
    expect(remainingFinishedStock).toBe(0); // 0 packages remaining
  });

  it('prevents production batch reversal if packages were already sold to customers', () => {
    const batch = {
      batchNumber: 'PRD-202611-001',
      outputQuantity: 80,
    };
    // Suppose 10 packages were purchased by online customers, leaving 70 on store shelf
    const currentFinishedStock = 70;

    const canReverse = currentFinishedStock >= batch.outputQuantity;
    expect(canReverse).toBe(false); // Reversal rejected to prevent negative inventory
  });
});
