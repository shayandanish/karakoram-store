import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildAccountsXlsx, calculateAccountsReport, getAccountsDateRange } from '../../utils/accountsReport.js';
import { fromMinorUnits, toMinorUnits } from '../../utils/money.js';

describe('getAccountsDateRange', () => {
  const now = new Date('2026-11-03T08:30:00.000Z');

  it('uses Pakistan local-day boundaries', () => {
    const range = getAccountsDateRange({ period: 'day' }, now);
    expect(range.startDate).toBe('2026-11-03');
    expect(range.from.toISOString()).toBe('2026-11-02T19:00:00.000Z');
    expect(range.until.toISOString()).toBe('2026-11-03T18:59:59.999Z');
  });

  it('uses Monday through Sunday for weekly ranges', () => {
    const range = getAccountsDateRange({ period: 'week' }, now);
    expect([range.startDate, range.endDate]).toEqual(['2026-11-02', '2026-11-08']);
  });

  it('uses month boundaries and rejects overlong custom periods', () => {
    const month = getAccountsDateRange({ period: 'month' }, now);
    expect([month.startDate, month.endDate]).toEqual(['2026-11-01', '2026-11-30']);
    expect(() => getAccountsDateRange({
      period: 'custom',
      startDate: '2025-01-01',
      endDate: '2026-11-03',
    }, now)).toThrow(RangeError);
  });

  it('rejects invalid and reversed custom ranges', () => {
    expect(() => getAccountsDateRange({
      period: 'custom',
      startDate: '2026-02-30',
      endDate: '2026-03-01',
    }, now)).toThrow(RangeError);
    expect(() => getAccountsDateRange({
      period: 'custom',
      startDate: '2026-11-04',
      endDate: '2026-11-03',
    }, now)).toThrow(RangeError);
  });
});

describe('accounts report calculations', () => {
  it('calculates paid sales, cost, refunds, expenses, and excludes missing-cost profit', () => {
    const report = calculateAccountsReport([
      {
        orderId: 'KS-1',
        createdAt: new Date('2026-11-03T10:00:00Z'),
        paymentStatus: 'paid',
        orderStatus: 'delivered',
        subtotal: 1200,
        discount: 100,
        items: [{ name: 'Apricot', variantLabel: '500g', price: 600, quantity: 2, unitCostMinor: 40000 }],
      },
      {
        orderId: 'KS-2',
        createdAt: new Date('2026-11-03T11:00:00Z'),
        paymentStatus: 'paid',
        subtotal: 500,
        discount: 0,
        items: [{ name: 'Honey', variantLabel: 'Jar', price: 500, quantity: 1, unitCostMinor: null }],
      },
      {
        orderId: 'KS-3',
        createdAt: new Date('2026-11-03T12:00:00Z'),
        paymentStatus: 'refunded',
        total: 200,
        items: [],
      },
      {
        orderId: 'KS-4',
        paymentStatus: 'pending',
        subtotal: 999,
        items: [],
      },
    ], [
      { kind: 'expense', description: 'Packaging', amountMinor: 5000, expenseDate: new Date(), reference: '' },
      { kind: 'reversal', description: 'Correction', amountMinor: 1000, expenseDate: new Date(), reference: '' },
    ]);

    expect(report.summary).toMatchObject({
      sales: 1600,
      salesWithKnownCost: 1100,
      costOfGoodsSold: 800,
      grossProfit: 300,
      grossMarginPercent: 27.27,
      expenses: 40,
      refunds: 200,
      netProfit: 60,
      paidOrderCount: 2,
      refundedOrderCount: 1,
      ordersWithMissingCost: 1,
    });
  });

  it('exports a native Excel workbook with formulas and reversal values', async () => {
    const report = calculateAccountsReport([{
      orderId: 'KS<&1',
      createdAt: new Date('2026-11-03T10:00:00Z'),
      paymentStatus: 'paid',
      subtotal: 100,
      discount: 0,
      items: [{ name: 'Honey & <Nuts>', variantLabel: 'Small', price: 100, quantity: 1, unitCostMinor: 2500 }],
    }], []);
    report.products = [{
      name: 'Honey & <Nuts>',
      variantLabel: 'Small',
      quantity: 1,
      sales: 100,
      costOfGoodsSold: 25,
      grossProfit: 75,
      missingCostOrders: 0,
    }];
    const buffer = await buildAccountsXlsx({
      range: { startDate: '2026-11-03', endDate: '2026-11-03', timeZone: 'Asia/Karachi' },
      report,
      purchases: [{
        purchaseDate: new Date('2026-11-03T12:00:00Z'),
        reference: 'REV-1',
        supplierName: 'Supplier',
        kind: 'reversal',
        totalCostMinor: 2500,
        amountPaidMinor: 0,
        lines: [{
          productName: 'Honey',
          variantLabel: 'Small',
          quantity: 1,
          unitCostMinor: 2500,
          additionalCostMinor: 0,
        }],
      }],
      generatedAt: new Date('2026-11-03T12:00:00Z'),
    });
    const files = unzipSync(buffer);
    const workbookXml = strFromU8(files['xl/workbook.xml']);
    const summaryXml = strFromU8(files['xl/worksheets/sheet1.xml']);
    const transactionXml = strFromU8(files['xl/worksheets/sheet2.xml']);
    const purchaseXml = strFromU8(files['xl/worksheets/sheet4.xml']);
    expect(new TextDecoder().decode(buffer.slice(0, 2))).toBe('PK');
    expect(workbookXml).toContain('name="Summary"');
    expect(workbookXml).toContain('name="Supplier Payments"');
    expect(summaryXml).toContain('<f>SUM(Transactions!D2:D2)</f><v>100</v>');
    expect(summaryXml).toContain('<f>B10-B9</f><v>75</v>');
    expect(transactionXml).toContain('KS&lt;&amp;1');
    expect(transactionXml).toContain('<f>D2-E2</f><v>75</v>');
    expect(purchaseXml).toContain('<f>0-H2*G2-I2</f><v>-25</v>');
    expect(purchaseXml).toContain('<c r="K2" s="2"><v>-25</v></c>');
  });
});

describe('financial units', () => {
  it('converts rupees to exact paisa and rejects excess precision', () => {
    expect(toMinorUnits(12.34)).toBe(1234);
    expect(fromMinorUnits(1234)).toBe(12.34);
    expect(() => toMinorUnits(1.234)).toThrow(RangeError);
  });
});
