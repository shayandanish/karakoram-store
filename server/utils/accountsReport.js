import { strToU8, zipSync } from 'fflate';

const TIME_ZONE = 'Asia/Karachi';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

const dateInPakistan = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const shiftDate = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

const parsePakistanMidnight = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new RangeError('Dates must use YYYY-MM-DD format');
  }
  const [year, month, day] = dateString.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, -5));
  if (dateInPakistan(parsed) !== dateString) {
    throw new RangeError('Invalid calendar date');
  }
  return parsed;
};

export function getAccountsDateRange({ period = 'day', startDate, endDate } = {}, now = new Date()) {
  const today = dateInPakistan(now);
  let start;
  let end;

  if (period === 'day') {
    start = end = today;
  } else if (period === 'week') {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const sinceMonday = (weekday + 6) % 7;
    start = shiftDate(today, -sinceMonday);
    end = shiftDate(start, 6);
  } else if (period === 'month') {
    start = `${today.slice(0, 7)}-01`;
    const [year, month] = today.split('-').map(Number);
    end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  } else if (period === 'custom') {
    start = startDate;
    end = endDate;
    if (!start || !end) throw new RangeError('Custom reports require a start and end date');
  } else {
    throw new RangeError('Unsupported report period');
  }

  const from = parsePakistanMidnight(start);
  const until = new Date(parsePakistanMidnight(shiftDate(end, 1)).getTime() - 1);
  const rangeDays = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS + 1;
  if (from > until || rangeDays > MAX_RANGE_DAYS) {
    throw new RangeError(`Report period must be between 1 and ${MAX_RANGE_DAYS} days`);
  }

  return { startDate: start, endDate: end, from, until, timeZone: TIME_ZONE };
}

const toMinor = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && Math.abs(amount * 100) <= Number.MAX_SAFE_INTEGER
    ? Math.round(amount * 100)
    : 0;
};
const safeMinor = (value) => Number.isSafeInteger(value) ? value : 0;
const fromMinor = (value) => Number((value / 100).toFixed(2));

export function calculateAccountsReport(orders, expenses) {
  const rows = [];
  let salesMinor = 0;
  let profitEligibleSalesMinor = 0;
  let costOfGoodsSoldMinor = 0;
  let expensesMinor = 0;
  let refundsMinor = 0;
  let ordersWithMissingCost = 0;
  let paidCancelledOrderCount = 0;
  let paidCancelledTotalMinor = 0;
  let paidOrderCount = 0;
  let refundedOrderCount = 0;

  for (const order of orders) {
    if (order.paymentStatus === 'refunded') {
      const refundMinor = toMinor(order.total);
      refundsMinor += refundMinor;
      refundedOrderCount += 1;
      rows.push({
        kind: 'refund',
        date: order.createdAt,
        reference: order.orderId || String(order._id),
        sales: 0,
        cogs: 0,
        expense: 0,
        refund: fromMinor(refundMinor),
        grossProfit: 0,
        netProfit: fromMinor(-refundMinor),
        costAvailable: true,
      });
      continue;
    }

    if (order.paymentStatus === 'paid' && ['cancelled', 'returned'].includes(order.orderStatus)) {
      paidCancelledOrderCount += 1;
      paidCancelledTotalMinor += toMinor(order.total);
      rows.push({
        kind: 'review',
        date: order.createdAt,
        reference: order.orderId || String(order._id),
        sales: null,
        cogs: null,
        expense: 0,
        refund: 0,
        grossProfit: null,
        netProfit: null,
        reviewAmount: fromMinor(toMinor(order.total)),
        costAvailable: false,
      });
      continue;
    }

    if (order.paymentStatus !== 'paid') continue;

    const orderSalesMinor = Math.max(0, toMinor(order.subtotal) - toMinor(order.discount));
    const hasCost = order.items?.every((item) => Number.isSafeInteger(item.unitCostMinor) && item.unitCostMinor >= 0);
    const cogsMinor = hasCost
      ? order.items.reduce((sum, item) => sum + item.unitCostMinor * item.quantity, 0)
      : null;
    salesMinor += orderSalesMinor;
    paidOrderCount += 1;
    if (hasCost) {
      costOfGoodsSoldMinor += cogsMinor;
      profitEligibleSalesMinor += orderSalesMinor;
    } else {
      ordersWithMissingCost += 1;
    }

    rows.push({
      kind: 'sale',
      date: order.createdAt,
      reference: order.orderId || String(order._id),
      sales: fromMinor(orderSalesMinor),
      cogs: cogsMinor === null ? null : fromMinor(cogsMinor),
      expense: 0,
      refund: 0,
      grossProfit: hasCost ? fromMinor(orderSalesMinor - cogsMinor) : null,
      netProfit: hasCost ? fromMinor(orderSalesMinor - cogsMinor) : null,
      costAvailable: hasCost,
    });
  }

  for (const expense of expenses) {
    const amountMinor = safeMinor(expense.amountMinor);
    const signedAmountMinor = expense.kind === 'reversal' ? -amountMinor : amountMinor;
    expensesMinor += signedAmountMinor;
    rows.push({
      kind: expense.kind,
      date: expense.expenseDate,
      reference: expense.reference || expense.description,
      sales: 0,
      cogs: 0,
      expense: fromMinor(signedAmountMinor),
      refund: 0,
      grossProfit: 0,
      netProfit: fromMinor(-signedAmountMinor),
      costAvailable: true,
    });
  }

  const reportableGrossProfitMinor = profitEligibleSalesMinor - costOfGoodsSoldMinor;
  const reportableNetProfitMinor = reportableGrossProfitMinor - expensesMinor - refundsMinor;
  const sales = fromMinor(salesMinor);
  const costOfGoodsSold = fromMinor(costOfGoodsSoldMinor);
  const reportableGrossProfit = fromMinor(reportableGrossProfitMinor);
  return {
    summary: {
      sales,
      salesWithKnownCost: fromMinor(profitEligibleSalesMinor),
      costOfGoodsSold,
      grossProfit: reportableGrossProfit,
      grossMarginPercent: profitEligibleSalesMinor > 0
        ? Number((reportableGrossProfitMinor / profitEligibleSalesMinor * 100).toFixed(2))
        : 0,
      expenses: fromMinor(expensesMinor),
      refunds: fromMinor(refundsMinor),
      netProfit: fromMinor(reportableNetProfitMinor),
      paidOrderCount,
      refundedOrderCount,
      ordersWithMissingCost,
      paidCancelledOrderCount,
      paidCancelledTotal: fromMinor(paidCancelledTotalMinor),
      profitExcludesOrdersWithMissingCost: ordersWithMissingCost > 0,
    },
    rows,
  };
}

const formulaCell = (formula, result) => ({ formula, result });
const cell = (value, style = 0) => ({ value, style });
const currencyStyle = 2;
const dateStyle = 3;
const headerStyle = 1;
const percentStyle = 4;
const titleStyle = 5;

const xmlEscape = (value) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const columnName = (columnNumber) => {
  let number = columnNumber;
  let name = '';
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
};

const excelDateSerial = (value) => (new Date(value).getTime() - Date.UTC(1899, 11, 30)) / 86400000;

const cellXml = (entry, reference) => {
  const { value, style = 0 } = entry && typeof entry === 'object' && 'value' in entry
    ? entry
    : { value: entry };
  const styleAttribute = style ? ` s="${style}"` : '';
  if (value && typeof value === 'object' && 'formula' in value) {
    return `<c r="${reference}"${styleAttribute}><f>${xmlEscape(value.formula)}</f><v>${xmlEscape(value.result)}</v></c>`;
  }
  if (value === null || value === undefined) return `<c r="${reference}"${styleAttribute}/>`;
  if (value instanceof Date) {
    return `<c r="${reference}"${styleAttribute}><v>${excelDateSerial(value)}</v></c>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}"${styleAttribute} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
};

const worksheetXml = (rows, {
  widths = [],
  freezeRows = 1,
  filterEndColumn,
  mergeCells,
} = {}) => {
  const lastColumn = rows.reduce((max, row) => Math.max(max, row.length), 1);
  const lastRow = Math.max(rows.length, 1);
  const sheetRows = rows.map((row, rowIndex) => (
    `<row r="${rowIndex + 1}">${row.map((entry, columnIndex) => (
      cellXml(entry, `${columnName(columnIndex + 1)}${rowIndex + 1}`)
    )).join('')}</row>`
  )).join('');
  const columns = widths.length
    ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const views = freezeRows
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '';
  const autoFilter = filterEndColumn
    ? `<autoFilter ref="A1:${filterEndColumn}${lastRow}"/>`
    : '';
  const merges = mergeCells?.length
    ? `<mergeCells count="${mergeCells.length}">${mergeCells.map((range) => `<mergeCell ref="${range}"/>`).join('')}</mergeCells>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${columnName(lastColumn)}${lastRow}"/>
${views}<sheetFormatPr defaultRowHeight="15"/>${columns}<sheetData>${sheetRows}</sheetData>${autoFilter}${merges}
</worksheet>`;
};

const workbookStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00;[Red]-#,##0.00"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="166" formatCode="0.00&quot;%&quot;"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173D36"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export async function buildAccountsXlsx({
  range,
  report,
  purchases = [],
  supplierPayments = [],
  generatedAt = new Date(),
}) {
  const transactionRows = [[
    'Type', 'Date (UTC)', 'Reference', 'Sales (PKR)', 'COGS (PKR)', 'Expenses (PKR)',
    'Refunds (PKR)', 'Gross profit (PKR)', 'Net profit (PKR)', 'Paid cancelled value (review)', 'Cost available',
  ].map((value) => cell(value, headerStyle))];
  report.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const grossProfit = row.kind === 'sale' && row.costAvailable
      ? formulaCell(`D${rowNumber}-E${rowNumber}`, row.grossProfit)
      : row.grossProfit;
    let netProfit = row.netProfit;
    if (row.kind === 'sale' && row.costAvailable) {
      netProfit = formulaCell(`H${rowNumber}-F${rowNumber}-G${rowNumber}`, row.netProfit);
    } else if (row.kind === 'refund') {
      netProfit = formulaCell(`0-G${rowNumber}`, row.netProfit);
    } else if (['expense', 'reversal'].includes(row.kind)) {
      netProfit = formulaCell(`0-F${rowNumber}`, row.netProfit);
    }
    transactionRows.push([
      cell(row.kind),
      cell(row.date ? new Date(row.date) : null, dateStyle),
      cell(row.reference),
      cell(row.sales, currencyStyle),
      cell(row.cogs, currencyStyle),
      cell(row.expense, currencyStyle),
      cell(row.refund, currencyStyle),
      cell(grossProfit, currencyStyle),
      cell(netProfit, currencyStyle),
      cell(row.reviewAmount || 0, currencyStyle),
      cell(row.costAvailable),
    ]);
  });

  const productsRows = [[
    'Product', 'Variant', 'Quantity sold', 'Sales (PKR)', 'COGS (PKR)',
    'Gross profit (PKR)', 'Orders with missing cost',
  ].map((value) => cell(value, headerStyle))];
  report.products.forEach((product) => productsRows.push([
    cell(product.name),
    cell(product.variantLabel),
    cell(product.quantity),
    cell(product.sales, currencyStyle),
    cell(product.costOfGoodsSold, currencyStyle),
    cell(product.grossProfit, currencyStyle),
    cell(product.missingCostOrders),
  ]));

  const purchaseRows = [[
    'Date (UTC)', 'Reference', 'Supplier', 'Type', 'Product', 'Variant', 'Quantity',
    'Unit cost (PKR)', 'Additional cost (PKR)', 'Line total (PKR)', 'Purchase total (PKR)', 'Paid at purchase (PKR)',
  ].map((value) => cell(value, headerStyle))];
  purchases.forEach((purchase) => purchase.lines.forEach((line, lineIndex) => {
    const rowNumber = purchaseRows.length + 1;
    const isReversal = purchase.kind === 'reversal';
    const lineTotal = fromMinor(line.unitCostMinor * line.quantity + line.additionalCostMinor)
      * (isReversal ? -1 : 1);
    purchaseRows.push([
      cell(new Date(purchase.purchaseDate), dateStyle),
      cell(purchase.reference),
      cell(purchase.supplierName),
      cell(purchase.kind),
      cell(line.productName),
      cell(line.variantLabel),
      cell(line.quantity),
      cell(fromMinor(line.unitCostMinor), currencyStyle),
      cell(fromMinor(line.additionalCostMinor), currencyStyle),
      cell(formulaCell(
        isReversal ? `0-H${rowNumber}*G${rowNumber}-I${rowNumber}` : `H${rowNumber}*G${rowNumber}+I${rowNumber}`,
        lineTotal
      ), currencyStyle),
      cell(lineIndex === 0 ? fromMinor(purchase.totalCostMinor) * (isReversal ? -1 : 1) : null, currencyStyle),
      cell(lineIndex === 0 ? fromMinor(purchase.amountPaidMinor) : null, currencyStyle),
    ]);
  }));

  const paymentRows = [[
    'Date (UTC)', 'Purchase ID', 'Kind', 'Amount (PKR)', 'Method', 'Reference', 'Reason',
  ].map((value) => cell(value, headerStyle))];
  supplierPayments.forEach((payment) => paymentRows.push([
    cell(new Date(payment.paymentDate), dateStyle),
    cell(String(payment.purchase)),
    cell(payment.kind),
    cell(fromMinor(payment.amountMinor) * (payment.kind === 'reversal' ? -1 : 1), currencyStyle),
    cell(payment.method),
    cell(payment.reference),
    cell(payment.reason),
  ]));

  const summaryRows = [
    [cell('Karakoram Store | Accounts Report', titleStyle), cell('', titleStyle)],
    [cell('Report period'), cell(`${range.startDate} to ${range.endDate}`)],
    [cell('Timezone'), cell(range.timeZone)],
    [cell('Currency'), cell('PKR')],
    [cell('Generated at (UTC)'), cell(generatedAt.toISOString())],
    [],
    [cell('Metric', headerStyle), cell('Value', headerStyle)],
  ];
  const lastTransactionRow = Math.max(2, report.rows.length + 1);
  const metricRows = [
    ['Sales (excluding shipping)', formulaCell(`SUM(Transactions!D2:D${lastTransactionRow})`, report.summary.sales), currencyStyle],
    ['Cost of goods sold (known-cost orders)', formulaCell(`SUM(Transactions!E2:E${lastTransactionRow})`, report.summary.costOfGoodsSold), currencyStyle],
    ['Sales with known cost', formulaCell(`SUMIF(Transactions!K2:K${lastTransactionRow},TRUE,Transactions!D2:D${lastTransactionRow})`, report.summary.salesWithKnownCost), currencyStyle],
    ['Gross profit (known-cost orders)', formulaCell('B10-B9', report.summary.grossProfit), currencyStyle],
    ['Expenses (net of reversals)', formulaCell(`SUM(Transactions!F2:F${lastTransactionRow})`, report.summary.expenses), currencyStyle],
    ['Refunds', formulaCell(`SUM(Transactions!G2:G${lastTransactionRow})`, report.summary.refunds), currencyStyle],
    ['Net profit (known-cost orders)', formulaCell('B11-B12-B13', report.summary.netProfit), currencyStyle],
    ['Gross margin percent (known-cost orders)', formulaCell('IF(B10=0,0,B11/B10*100)', report.summary.grossMarginPercent), percentStyle],
    ['Paid orders with missing cost', report.summary.ordersWithMissingCost, 0],
    ['Paid cancelled/returned orders requiring review', report.summary.paidCancelledOrderCount, 0],
    ['Paid cancelled/returned value (review)', report.summary.paidCancelledTotal, currencyStyle],
    ['Inventory purchases (not expensed twice)', report.summary.inventoryPurchases || 0, currencyStyle],
    ['Supplier payments recorded in period', report.summary.supplierPayments || 0, currencyStyle],
  ];
  metricRows.forEach(([label, value, style]) => summaryRows.push([cell(label), cell(value, style)]));
  summaryRows.push([], [
    cell('Formula definitions'),
    cell('Gross profit = known-cost sales - COGS; net profit = gross profit - expenses - refunds'),
  ]);

  const sheetDefinitions = [
    {
      name: 'Summary',
      rows: summaryRows,
      widths: [48, 86],
      freezeRows: 7,
      mergeCells: ['A1:B1'],
    },
    { name: 'Transactions', rows: transactionRows, widths: [14, 22, 30, 16, 16, 17, 16, 20, 18, 30, 16], filterEndColumn: 'K' },
    { name: 'Products', rows: productsRows, widths: [34, 20, 16, 16, 16, 20, 25], filterEndColumn: 'G' },
    { name: 'Purchases', rows: purchaseRows, widths: [22, 20, 24, 16, 30, 18, 12, 18, 22, 18, 21, 23], filterEndColumn: 'L' },
    { name: 'Supplier Payments', rows: paymentRows, widths: [22, 28, 14, 18, 18, 24, 36], filterEndColumn: 'G' },
  ];

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheetDefinitions.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>${sheetDefinitions.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets>
<calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetDefinitions.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
<Relationship Id="rId${sheetDefinitions.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/styles.xml': strToU8(workbookStylesXml),
  };
  sheetDefinitions.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet.rows, sheet));
  });
  return zipSync(files, { level: 6 });
}
