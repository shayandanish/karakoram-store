import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import { fmtDate, fmtPKR } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';
import SupplierPaymentVoucher from '../../components/admin/SupplierPaymentVoucher';

const EXPENSE_CATEGORIES = [
  'Shop Rent & Lease',
  'Utilities (Electricity, Internet, Water)',
  'Staff Salaries & Wages',
  'Packaging Materials & Bags',
  'Courier & Delivery Charges',
  'Marketing & Social Ads',
  'Refreshments & Petty Cash',
  'Shop Maintenance & Repairs',
  'Other / Miscellaneous',
];

const todayInPakistan = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const newPurchaseLine = () => ({
  product: '',
  variantLabel: '',
  quantity: '1',
  unitCost: '',
  transportCost: '0',
  packagingCost: '0',
});

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-apricot-500';
const labelClass = 'mb-1 block text-xs font-semibold text-stone-600';
const EMPTY_ARRAY = [];

const moneyInput = (value) => Number(value || 0);

const getMarginBadgeClass = (margin) => {
  if (margin === null || margin === undefined) return '';
  if (margin >= 35) return 'bg-emerald-100 text-emerald-800';
  if (margin >= 15) return 'bg-sky-100 text-sky-800';
  return 'bg-amber-100 text-amber-800';
};

const getNetProfitClass = (val) => Number(val) >= 0 ? 'text-emerald-700' : 'text-rose-700';
const getDrawerCashClass = (val) => Number(val) >= 0 ? 'text-emerald-900' : 'text-rose-700';

function renderPurchaseDueBadge(purchase) {
  if (!purchase.dueDate || purchase.paymentStatus === 'paid' || purchase.paymentStatus === 'reversed') {
    return null;
  }
  const dueTime = new Date(purchase.dueDate).getTime();
  const diffDays = Math.ceil((dueTime - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return (
      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
        Overdue by {Math.abs(diffDays)}d
      </span>
    );
  }
  return (
    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600">
      Due: {fmtDate(purchase.dueDate)} ({diffDays}d)
    </span>
  );
}

const TABS = [
  { id: 'report', label: 'Financial Reports', desc: 'P&L, margins, and sales analytics' },
  { id: 'purchases', label: 'Supplier Bills & Payables', desc: 'Supplier bills, payments, vouchers & debts' },
  { id: 'expenses', label: 'Operating Expenses', desc: 'Overhead costs & cash outflows' },
  { id: 'suppliers', label: 'Suppliers Directory', desc: 'Partner ledger, balances & statements' },
  { id: 'audit', label: 'Audit Trail', desc: 'Historical accounting log' },
];

export default function AdminAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'report';
  const setActiveTab = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const queryClient = useQueryClient();
  const toast = useToast();

  // Forms state
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    supplierName: '',
    reference: '',
    purchaseDate: todayInPakistan(),
    dueDate: '',
    kind: 'purchase',
    amountPaid: '0',
    notes: '',
    lines: [newPurchaseLine()],
  });
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    expenseDate: todayInPakistan(),
    paymentMethod: 'cash',
    reference: '',
  });
  const [period, setPeriod] = useState('day');
  const [startDate, setStartDate] = useState(todayInPakistan());
  const [endDate, setEndDate] = useState(todayInPakistan());
  const [paymentTarget, setPaymentTarget] = useState('');
  const [purchaseReverseTarget, setPurchaseReverseTarget] = useState('');
  const [purchaseReverseReason, setPurchaseReverseReason] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: todayInPakistan(),
    method: '',
    reference: '',
  });
  const [reversalTarget, setReversalTarget] = useState('');
  const [reversalForm, setReversalForm] = useState({ amount: '', reason: '' });

  // Selected supplier statement modal
  const [statementSupplierId, setStatementSupplierId] = useState(null);
  // Printable payment voucher modal
  const [voucherData, setVoucherData] = useState(null);

  const accountsQuery = useQuery({
    queryKey: ['admin-accounts', 'records'],
    queryFn: async () => {
      const [suppliers, purchases, expenses, audit] = await Promise.all([
        api.get('/admin/accounts/suppliers'),
        api.get('/admin/accounts/purchases'),
        api.get('/admin/accounts/expenses'),
        api.get('/admin/accounts/audit'),
      ]);
      return {
        suppliers: suppliers.data.suppliers,
        purchases: purchases.data.purchases,
        expenses: expenses.data.expenses,
        auditLogs: audit.data.auditLogs,
      };
    },
  });

  const productsQuery = useQuery({
    queryKey: ['admin-accounts', 'products'],
    queryFn: async () => {
      const { data } = await api.get('/admin/products?limit=200&active=true');
      return data.products;
    },
  });

  const reportParams = useMemo(() => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
  }), [period, startDate, endDate]);

  const reportQuery = useQuery({
    queryKey: ['admin-accounts', 'report', reportParams],
    queryFn: async () => {
      const { data } = await api.get('/admin/accounts/report', { params: reportParams });
      return data;
    },
  });

  const statementQuery = useQuery({
    queryKey: ['admin-accounts', 'supplier-statement', statementSupplierId],
    queryFn: async () => {
      if (!statementSupplierId) return null;
      const { data } = await api.get(`/admin/accounts/suppliers/${statementSupplierId}/statement`);
      return data;
    },
    enabled: Boolean(statementSupplierId),
  });

  const invalidateAccounts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  const supplierMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/accounts/suppliers', payload),
    onSuccess: () => {
      setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '' });
      toast.success('Supplier added successfully');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not add supplier'),
  });

  const supplierStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/admin/accounts/suppliers/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Supplier status updated');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update supplier'),
  });

  const purchaseMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/accounts/purchases', payload),
    onSuccess: () => {
      setPurchaseForm({
        supplier: '',
        supplierName: '',
        reference: '',
        purchaseDate: todayInPakistan(),
        dueDate: '',
        kind: 'purchase',
        amountPaid: '0',
        notes: '',
        lines: [newPurchaseLine()],
      });
      toast.success('Inventory purchase recorded & stock updated');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not record purchase'),
  });

  const expenseMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/accounts/expenses', payload),
    onSuccess: () => {
      setExpenseForm({
        category: '',
        description: '',
        amount: '',
        expenseDate: todayInPakistan(),
        paymentMethod: 'cash',
        reference: '',
      });
      toast.success('Expense recorded successfully');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not record expense'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/admin/accounts/purchases/${id}/payments`, payload),
    onSuccess: () => {
      setPaymentTarget('');
      setPaymentForm({ amount: '', paymentDate: todayInPakistan(), method: '', reference: '' });
      toast.success('Supplier payment recorded');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not record payment'),
  });

  const purchaseReverseMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/admin/accounts/purchases/${id}/reverse`, { reason }),
    onSuccess: () => {
      setPurchaseReverseTarget('');
      setPurchaseReverseReason('');
      toast.success('Purchase reversal recorded');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not reverse purchase'),
  });

  const expenseReverseMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/admin/accounts/expenses/${id}/reverse`, payload),
    onSuccess: () => {
      setReversalTarget('');
      setReversalForm({ amount: '', reason: '' });
      toast.success('Expense reversal recorded');
      invalidateAccounts();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not reverse expense'),
  });

  const records = accountsQuery.data;
  const products = productsQuery.data ?? EMPTY_ARRAY;
  const report = reportQuery.data;
  const suppliers = records?.suppliers ?? EMPTY_ARRAY;
  const activeSuppliers = suppliers.filter((supplier) => supplier.isActive);
  const purchases = records?.purchases ?? EMPTY_ARRAY;
  const expenses = records?.expenses ?? EMPTY_ARRAY;
  const auditLogs = records?.auditLogs ?? EMPTY_ARRAY;

  // Outstanding supplier payables
  const totalOutstandingPayables = useMemo(() => {
    return purchases
      .filter((p) => p.paymentStatus !== 'paid' && p.paymentStatus !== 'reversed')
      .reduce((sum, p) => sum + Math.max(0, p.totalCost - p.amountPaid), 0);
  }, [purchases]);

  const unpaidPurchasesCount = useMemo(() => {
    return purchases.filter((p) => p.paymentStatus === 'unpaid' || p.paymentStatus === 'partial').length;
  }, [purchases]);

  const updatePurchaseLine = (index, key, value) => {
    setPurchaseForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        if (key === 'product') {
          const product = products.find((entry) => entry._id === value);
          return { ...line, product: value, variantLabel: product?.variants?.[0]?.label || '' };
        }
        return { ...line, [key]: value };
      }),
    }));
  };

  const downloadReport = async () => {
    try {
      const { data } = await api.get('/admin/accounts/report.xlsx', {
        params: reportParams,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `accounts-${report?.range.startDate || startDate}-to-${report?.range.endDate || endDate}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel report downloaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not download report');
    }
  };

  const reversedExpenseAmounts = useMemo(() => {
    const amounts = new Map();
    for (const expense of expenses) {
      if (expense.kind === 'reversal' && expense.reversalOf) {
        const key = String(expense.reversalOf);
        amounts.set(key, (amounts.get(key) || 0) + expense.amount);
      }
    }
    return amounts;
  }, [expenses]);

  const submitPurchase = (event) => {
    event.preventDefault();
    purchaseMutation.mutate({
      ...purchaseForm,
      amountPaid: moneyInput(purchaseForm.amountPaid),
      lines: purchaseForm.lines.map((line) => ({
        ...line,
        quantity: Number(line.quantity),
        unitCost: moneyInput(line.unitCost),
        // additionalCost = transport + packaging (sent to backend as combined)
        additionalCost: moneyInput(line.transportCost) + moneyInput(line.packagingCost),
      })),
    });
  };

  if (accountsQuery.isLoading || productsQuery.isLoading) {
    return <div className="p-8 text-sm text-stone-500">Loading Accounts data…</div>;
  }

  if (accountsQuery.isError || productsQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        Accounts data could not be loaded.
        <button type="button" onClick={() => { accountsQuery.refetch(); productsQuery.refetch(); }} className="ml-3 font-semibold underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title="Accounts & Finance — Admin" noindex />

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-apricot-700 bg-apricot-50 px-2 py-0.5 rounded-md border border-apricot-200">
              Finance & Accounting
            </span>
            <span className="text-xs text-stone-400">Auditable Ledger</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-mountain-900 sm:text-3xl font-display">
            Accounts & Supplier Management
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Track sales profitability, inventory costs, supplier purchase bills, operating expenses, and payments.
          </p>
        </div>

        {totalOutstandingPayables > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-right">
            <p className="text-xs font-semibold text-rose-700">Total Unpaid Supplier Bills</p>
            <p className="text-lg font-bold text-rose-900">{fmtPKR(totalOutstandingPayables)}</p>
          </div>
        )}
      </header>

      {/* ── Sub-Section Tabs Bar ── */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-2 text-sm font-medium">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold whitespace-nowrap transition-colors ${isActive
                ? 'border-apricot-600 text-mountain-900 bg-apricot-50/40 rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'purchases' && unpaidPurchasesCount > 0 && (
                <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs font-bold">
                  {unpaidPurchasesCount}
                </span>
              )}
              {tab.id === 'suppliers' && suppliers.length > 0 && (
                <span className="rounded-full bg-stone-100 text-stone-600 px-2 py-0.5 text-xs">
                  {suppliers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: FINANCIAL REPORTS & PROFITABILITY
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-mountain-900">Profit & Loss Report</h2>
                <p className="mt-1 text-xs text-stone-500">
                  Sales figures exclude shipping. Cost of Goods Sold (COGS) is computed from actual weighted-average cost snapshots.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label>
                  <span className={labelClass}>Period</span>
                  <select className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value)}>
                    <option value="day">Daily</option>
                    <option value="week">Weekly (Mon–Sun)</option>
                    <option value="month">Monthly</option>
                    <option value="custom">Custom dates</option>
                  </select>
                </label>
                {period === 'custom' && (
                  <>
                    <label>
                      <span className={labelClass}>From</span>
                      <input className={inputClass} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                    </label>
                    <label>
                      <span className={labelClass}>To</span>
                      <input className={inputClass} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                    </label>
                  </>
                )}
                <button
                  type="button"
                  onClick={downloadReport}
                  disabled={reportQuery.isLoading || !report}
                  className="rounded-lg bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mountain-800 disabled:opacity-50 transition"
                >
                  Download Excel (.xlsx)
                </button>
              </div>
            </div>

            {reportQuery.isError && (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {reportQuery.error?.response?.data?.message || 'Report could not be loaded.'}
              </p>
            )}

            {report && (
              <>
                <p className="mt-4 text-xs font-medium text-stone-500">
                  Date Range: {report.range.startDate} through {report.range.endDate} ({report.range.timeZone})
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Total Sales (Revenue)', report.summary.sales],
                    ['COGS (Actual Cost)', report.summary.costOfGoodsSold],
                    ['Gross Profit', report.summary.grossProfit],
                    ['Gross Margin %', `${report.summary.grossMarginPercent}%`],
                    ['Operating Expenses', report.summary.expenses],
                    ['Customer Refunds', report.summary.refunds],
                    ['Net Profit', report.summary.netProfit],
                    ['Supplier Payments Paid', report.summary.supplierPayments],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                      <p className="text-xs font-semibold text-stone-500">{label}</p>
                      <p className={`mt-1 text-lg font-bold ${label.includes('Net Profit') ? getNetProfitClass(value) : 'text-mountain-900'}`}>
                        {typeof value === 'number' ? fmtPKR(value) : value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── Daily Cash Drawer Balancing Card ── */}
                {report.summary.cashFlow && (
                  <div className="mt-6 rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/40 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                          💵
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-emerald-950 font-display">
                            Cash Register Drawer Balancing (Cash In vs. Out)
                          </h3>
                          <p className="text-xs text-emerald-700">
                            Reconciliation of physical currency collected from POS/COD vs. cash disbursed.
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Expected Cash in Register Drawer
                        </span>
                        <span className={`text-xl font-bold font-mono ${getDrawerCashClass(report.summary.cashFlow.expectedDrawerCash)}`}>
                          {fmtPKR(report.summary.cashFlow.expectedDrawerCash)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/80">
                        <span className="text-stone-500 block text-[11px] font-medium">1. Physical Cash Inflow</span>
                        <span className="text-base font-bold text-emerald-800 font-mono">
                          +{fmtPKR(report.summary.cashFlow.cashInflow)}
                        </span>
                        <p className="text-[10px] text-stone-400 mt-0.5">POS counter cash & delivered COD</p>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/80">
                        <span className="text-stone-500 block text-[11px] font-medium">2. Cash Operating Expenses</span>
                        <span className="text-base font-bold text-stone-700 font-mono">
                          −{fmtPKR(Math.max(0, (report.summary.cashFlow.cashOutflow || 0) - (report.summary.cashFlow.cashSupplierPayments || 0)))}
                        </span>
                        <p className="text-[10px] text-stone-400 mt-0.5">Petty cash, refreshments & daily bills</p>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/80">
                        <span className="text-stone-500 block text-[11px] font-medium">3. Cash Paid to Suppliers</span>
                        <span className="text-base font-bold text-stone-700 font-mono">
                          −{fmtPKR(report.summary.cashFlow.cashSupplierPayments || 0)}
                        </span>
                        <p className="text-[10px] text-stone-400 mt-0.5">Direct hand-to-hand supplier payouts</p>
                      </div>
                    </div>
                  </div>
                )}

                {report.summary.ordersWithMissingCost > 0 && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 border border-amber-200">
                    <strong>Notice:</strong> {report.summary.ordersWithMissingCost} paid order(s) have no cost snapshot and are excluded from profit calculations.
                  </p>
                )}

                <div className="mt-6 overflow-x-auto">
                  <h3 className="mb-2 font-semibold text-mountain-900">Product Profitability Breakdown</h3>
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 bg-stone-50">
                      <tr>
                        <th className="py-2.5 px-3">Product / Variant</th>
                        <th className="py-2.5 px-3">Units Sold</th>
                        <th className="py-2.5 px-3">Sales Revenue</th>
                        <th className="py-2.5 px-3">COGS</th>
                        <th className="py-2.5 px-3">Gross Profit</th>
                        <th className="py-2.5 px-3">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.products.map((product) => {
                        const marginPercent = product.sales > 0 && product.grossProfit !== null
                          ? Math.round((product.grossProfit / product.sales) * 100)
                          : null;
                        return (
                          <tr key={`${product.name}-${product.variantLabel}`} className="border-b border-stone-100 hover:bg-stone-50/50">
                            <td className="py-3 px-3 font-medium text-mountain-900">
                              {product.name} <span className="text-stone-500 font-normal">· {product.variantLabel}</span>
                            </td>
                            <td className="py-3 px-3">{product.quantity}</td>
                            <td className="py-3 px-3 font-semibold">{fmtPKR(product.sales)}</td>
                            <td className="py-3 px-3">{product.costOfGoodsSold === null ? 'Cost unavailable' : fmtPKR(product.costOfGoodsSold)}</td>
                            <td className={`py-3 px-3 font-semibold ${product.grossProfit > 0 ? 'text-emerald-700' : 'text-stone-700'}`}>
                              {product.grossProfit === null ? 'Unavailable' : fmtPKR(product.grossProfit)}
                            </td>
                            <td className="py-3 px-3">
                              {marginPercent !== null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getMarginBadgeClass(marginPercent)}`}>
                                  {marginPercent}%
                                </span>
                              ) : (
                                <span className="text-stone-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {report.products.length === 0 && (
                        <tr><td className="py-6 text-center text-stone-500" colSpan="6">No sales recorded in this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Daily P&L Breakdown ── */}
                {report.dailyPnL && report.dailyPnL.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-3 font-semibold text-mountain-900 flex items-center gap-2">
                      📅 Daily Profit & Loss Breakdown
                      <span className="text-xs font-normal text-stone-500 ml-1">
                        (Sales − Cost of Goods − Expenses = Net Profit per day)
                      </span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="w-full min-w-[700px] text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-center">Orders</th>
                            <th className="py-2.5 px-3 text-right">Revenue</th>
                            <th className="py-2.5 px-3 text-right">Cost (COGS)</th>
                            <th className="py-2.5 px-3 text-right">Gross Profit</th>
                            <th className="py-2.5 px-3 text-right">Expenses</th>
                            <th className="py-2.5 px-3 text-right">Net Profit</th>
                            <th className="py-2.5 px-3 text-center">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {report.dailyPnL.map((day) => {
                            const isProfit = day.netProfit >= 0;
                            const marginBadge = getMarginBadgeClass(day.marginPercent);
                            return (
                              <tr key={day.date} className="hover:bg-stone-50/60">
                                <td className="py-2.5 px-3 font-mono font-semibold text-stone-700">{day.date}</td>
                                <td className="py-2.5 px-3 text-center text-stone-600">{day.orders}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-mountain-900">{fmtPKR(day.sales)}</td>
                                <td className="py-2.5 px-3 text-right text-stone-600">{fmtPKR(day.cogs)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{fmtPKR(day.grossProfit)}</td>
                                <td className="py-2.5 px-3 text-right text-rose-600">{day.expenses > 0 ? `− ${fmtPKR(day.expenses)}` : '—'}</td>
                                <td className={`py-2.5 px-3 text-right font-bold ${isProfit ? 'text-emerald-800' : 'text-rose-700'}`}>
                                  {fmtPKR(day.netProfit)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {day.sales > 0 ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${marginBadge}`}>
                                      {day.marginPercent}%
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-stone-50 border-t-2 border-stone-300 font-bold text-xs text-mountain-900">
                          <tr>
                            <td className="py-2.5 px-3">TOTAL</td>
                            <td className="py-2.5 px-3 text-center">
                              {report.dailyPnL.reduce((s, d) => s + d.orders, 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {fmtPKR(report.dailyPnL.reduce((s, d) => s + d.sales, 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {fmtPKR(report.dailyPnL.reduce((s, d) => s + d.cogs, 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">
                              {fmtPKR(report.dailyPnL.reduce((s, d) => s + d.grossProfit, 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-700">
                              {fmtPKR(report.dailyPnL.reduce((s, d) => s + d.expenses, 0))}
                            </td>
                            <td className={`py-2.5 px-3 text-right ${report.summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                              {fmtPKR(report.summary.netProfit)}
                            </td>
                            <td className="py-2.5 px-3 text-center">{report.summary.grossMarginPercent}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Monthly P&L Summary ── */}
                {report.monthlyPnL && report.monthlyPnL.length > 1 && (
                  <div className="mt-8">
                    <h3 className="mb-3 font-semibold text-mountain-900 flex items-center gap-2">
                      🗓️ Monthly Profit & Loss Summary
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="w-full min-w-[700px] text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Month</th>
                            <th className="py-2.5 px-3 text-center">Orders</th>
                            <th className="py-2.5 px-3 text-right">Revenue</th>
                            <th className="py-2.5 px-3 text-right">COGS</th>
                            <th className="py-2.5 px-3 text-right">Gross Profit</th>
                            <th className="py-2.5 px-3 text-right">Expenses</th>
                            <th className="py-2.5 px-3 text-right">Net Profit</th>
                            <th className="py-2.5 px-3 text-center">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {report.monthlyPnL.map((m) => {
                            const isProfit = m.netProfit >= 0;
                            const marginBadge = getMarginBadgeClass(m.marginPercent);
                            return (
                              <tr key={m.month} className="hover:bg-stone-50/60">
                                <td className="py-2.5 px-3 font-semibold text-stone-700">
                                  {new Date(`${m.month}-15`).toLocaleDateString('en-PK', { year: 'numeric', month: 'long' })}
                                </td>
                                <td className="py-2.5 px-3 text-center text-stone-600">{m.orders}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-mountain-900">{fmtPKR(m.sales)}</td>
                                <td className="py-2.5 px-3 text-right text-stone-600">{fmtPKR(m.cogs)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{fmtPKR(m.grossProfit)}</td>
                                <td className="py-2.5 px-3 text-right text-rose-600">{m.expenses > 0 ? fmtPKR(m.expenses) : '—'}</td>
                                <td className={`py-2.5 px-3 text-right font-bold ${isProfit ? 'text-emerald-800' : 'text-rose-700'}`}>
                                  {fmtPKR(m.netProfit)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {m.sales > 0 ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${marginBadge}`}>
                                      {m.marginPercent}%
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PURCHASES & SUPPLIER PAYABLES
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          {/* Warehouse Stock vs Financial Bills Notice */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <span>
                <strong>Physical floor stock, damage write-offs, and count audits</strong> are managed under{' '}
                <Link to="/admin/inventory" className="font-bold underline hover:text-blue-950">
                  Inventory & Stock
                </Link>
                . Use this section to record supplier purchase bills, payment vouchers, and track outstanding debts.
              </span>
            </div>
            <Link
              to="/admin/inventory"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-white border border-blue-300 rounded-md font-semibold text-blue-800 hover:bg-blue-50 transition shadow-2xs"
            >
              Open Inventory & Stock →
            </Link>
          </div>

          {/* Outstanding banner */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-mountain-900">Supplier Invoices & Payables Overview</h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Recording a purchase adds units to your warehouse inventory and recalculates weighted-average product costs.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="rounded-xl bg-white border border-stone-200 px-4 py-2 text-center">
                <span className="text-[11px] text-stone-500 font-semibold block">Total Invoices</span>
                <span className="text-base font-bold text-mountain-900">{purchases.length}</span>
              </div>
              <div className="rounded-xl bg-white border border-rose-200 px-4 py-2 text-center">
                <span className="text-[11px] text-rose-600 font-semibold block">Unpaid Bills</span>
                <span className="text-base font-bold text-rose-700">{unpaidPurchasesCount}</span>
              </div>
              <div className="rounded-xl bg-white border border-rose-200 px-4 py-2 text-center">
                <span className="text-[11px] text-rose-600 font-semibold block">Outstanding Payables</span>
                <span className="text-base font-bold text-rose-700">{fmtPKR(totalOutstandingPayables)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Form to record purchase */}
            <section className="xl:col-span-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h2 className="text-lg font-bold text-mountain-900">Record Supplier Purchase</h2>
              <p className="mb-4 mt-1 text-xs text-stone-500">
                Units received will be added directly to the product stock in the database.
              </p>

              <form className="space-y-4" onSubmit={submitPurchase}>
                <label className="block">
                  <span className={labelClass}>Supplier</span>
                  <select
                    className={inputClass}
                    value={purchaseForm.supplier}
                    onChange={(event) => {
                      const sup = activeSuppliers.find((s) => s._id === event.target.value);
                      setPurchaseForm((form) => ({
                        ...form,
                        supplier: event.target.value,
                        supplierName: sup ? sup.name : form.supplierName,
                      }));
                    }}
                  >
                    <option value="">Select an active supplier</option>
                    {activeSuppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                    ))}
                  </select>
                </label>

                {!purchaseForm.supplier && (
                  <label className="block">
                    <span className={labelClass}>Or Enter Supplier Name</span>
                    <input
                      className={inputClass}
                      required
                      placeholder="e.g. Hunza Organic Co."
                      value={purchaseForm.supplierName}
                      onChange={(event) => setPurchaseForm((form) => ({ ...form, supplierName: event.target.value }))}
                    />
                  </label>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <label>
                    <span className={labelClass}>Purchase Date</span>
                    <input
                      className={inputClass}
                      required
                      type="date"
                      value={purchaseForm.purchaseDate}
                      onChange={(event) => setPurchaseForm((form) => ({ ...form, purchaseDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Payment Due Date</span>
                    <input
                      className={inputClass}
                      type="date"
                      value={purchaseForm.dueDate || ''}
                      onChange={(event) => setPurchaseForm((form) => ({ ...form, dueDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Type</span>
                    <select
                      className={inputClass}
                      value={purchaseForm.kind}
                      onChange={(event) => setPurchaseForm((form) => ({ ...form, kind: event.target.value }))}
                    >
                      <option value="purchase">New purchase</option>
                      <option value="opening_stock">Opening stock</option>
                      <option value="adjustment">Stock adjustment</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className={labelClass}>Invoice / Ref #</span>
                    <input
                      className={inputClass}
                      placeholder="INV-2026-001"
                      value={purchaseForm.reference}
                      onChange={(event) => setPurchaseForm((form) => ({ ...form, reference: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Amount Paid (PKR)</span>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={purchaseForm.amountPaid}
                      onChange={(event) => setPurchaseForm((form) => ({ ...form, amountPaid: event.target.value }))}
                    />
                  </label>
                </div>

                {/* Line items */}
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <span className="text-xs font-bold text-stone-700 block">Product Items Received:</span>
                  {purchaseForm.lines.map((line, index) => {
                    const selectedProduct = products.find((product) => product._id === line.product);
                    return (
                      <div key={index} className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                        <label className="block">
                          <span className={labelClass}>Product</span>
                          <select
                            className={inputClass}
                            required
                            value={line.product}
                            onChange={(event) => updatePurchaseLine(index, 'product', event.target.value)}
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product._id} value={product._id}>{product.name}</option>
                            ))}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className={labelClass}>Variant</span>
                            <select
                              className={inputClass}
                              required
                              value={line.variantLabel}
                              onChange={(event) => updatePurchaseLine(index, 'variantLabel', event.target.value)}
                            >
                              <option value="">Select variant</option>
                              {selectedProduct?.variants?.map((variant) => (
                                <option key={variant._id || variant.label} value={variant.label}>{variant.label}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className={labelClass}>Qty</span>
                            <input
                              className={inputClass}
                              required
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(event) => updatePurchaseLine(index, 'quantity', event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className={labelClass}>Unit Cost (PKR) *</span>
                            <input
                              className={inputClass}
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="20"
                              value={line.unitCost}
                              onChange={(event) => updatePurchaseLine(index, 'unitCost', event.target.value)}
                            />
                          </label>
                          <label>
                            <span className={labelClass}>Qty</span>
                            <input
                              className={inputClass}
                              required
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(event) => updatePurchaseLine(index, 'quantity', event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className={labelClass}>🚚 Transport Cost (PKR)</span>
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={line.transportCost}
                              onChange={(event) => updatePurchaseLine(index, 'transportCost', event.target.value)}
                            />
                          </label>
                          <label>
                            <span className={labelClass}>📦 Packaging Cost (PKR)</span>
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={line.packagingCost}
                              onChange={(event) => updatePurchaseLine(index, 'packagingCost', event.target.value)}
                            />
                          </label>
                        </div>

                        {/* ── Live Profit Calculator ── */}
                        {(() => {
                          const qty = Math.max(1, Number(line.quantity) || 1);
                          const unitC = moneyInput(line.unitCost);
                          const transport = moneyInput(line.transportCost);
                          const packaging = moneyInput(line.packagingCost);
                          const additionalTotal = transport + packaging;
                          const landedPerUnit = unitC + (qty > 0 ? additionalTotal / qty : 0);
                          const sellingPrice = selectedProduct?.variants?.find((v) => v.label === line.variantLabel)?.price || 0;
                          const profitPerUnit = sellingPrice - landedPerUnit;
                          const margin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
                          const marginColor = margin >= 25 ? 'text-emerald-700' : margin >= 10 ? 'text-amber-700' : 'text-rose-700';

                          if (!unitC && !transport && !packaging) return null;
                          return (
                            <div className="mt-1 rounded-lg bg-gradient-to-r from-stone-100 to-stone-50 border border-stone-200 p-3 text-xs space-y-1.5">
                              <div className="font-bold text-stone-700 mb-2">📊 Cost & Profit Calculator</div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span className="text-stone-500">Supplier / Farmer Price</span>
                                <span className="font-semibold text-stone-900 text-right">
                                  Rs. {unitC.toFixed(2)} / unit
                                </span>
                                <span className="text-stone-500">Transport Cost</span>
                                <span className="font-semibold text-stone-900 text-right">
                                  Rs. {transport.toFixed(2)} (÷{qty} = Rs. {qty > 0 ? (transport / qty).toFixed(2) : '0.00'}/unit)
                                </span>
                                <span className="text-stone-500">Packaging Cost</span>
                                <span className="font-semibold text-stone-900 text-right">
                                  Rs. {packaging.toFixed(2)} (÷{qty} = Rs. {qty > 0 ? (packaging / qty).toFixed(2) : '0.00'}/unit)
                                </span>
                                <span className="font-bold text-mountain-900 border-t border-stone-300 pt-1">
                                  Total Landed Cost
                                </span>
                                <span className="font-bold text-mountain-900 border-t border-stone-300 pt-1 text-right">
                                  Rs. {landedPerUnit.toFixed(2)} / unit
                                </span>
                                {sellingPrice > 0 && (
                                  <>
                                    <span className="text-stone-500">Current Selling Price</span>
                                    <span className="font-semibold text-stone-900 text-right">
                                      Rs. {sellingPrice.toFixed(2)}
                                    </span>
                                    <span className="font-bold border-t border-stone-300 pt-1">
                                      Profit Per Unit
                                    </span>
                                    <span className={`font-bold border-t border-stone-300 pt-1 text-right ${marginColor}`}>
                                      Rs. {profitPerUnit.toFixed(2)} ({margin.toFixed(1)}% margin)
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {purchaseForm.lines.length > 1 && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-700 hover:underline pt-1"
                            onClick={() => setPurchaseForm((form) => ({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) }))}
                          >
                            Remove this line
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="text-xs font-semibold text-mountain-800 underline block"
                    onClick={() => setPurchaseForm((form) => ({ ...form, lines: [...form.lines, newPurchaseLine()] }))}
                  >
                    + Add Another Product Line
                  </button>
                </div>

                <label className="block">
                  <span className={labelClass}>Notes</span>
                  <textarea
                    className={inputClass}
                    rows="2"
                    placeholder="Invoice terms, transport note..."
                    maxLength="1000"
                    value={purchaseForm.notes}
                    onChange={(event) => setPurchaseForm((form) => ({ ...form, notes: event.target.value }))}
                  />
                </label>

                <button
                  className="w-full rounded-lg bg-apricot-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-apricot-700 disabled:opacity-50 transition shadow-xs"
                  disabled={purchaseMutation.isPending || !products.length}
                >
                  {purchaseMutation.isPending ? 'Recording Purchase…' : 'Save Purchase & Update Stock'}
                </button>
              </form>
            </section>

            {/* Recent Purchases List */}
            <section className="xl:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h2 className="text-lg font-bold text-mountain-900">Purchases & Payables Ledger</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 bg-stone-50">
                    <tr>
                      <th className="py-2.5 px-3">Date / Supplier</th>
                      <th className="py-2.5 px-3">Reference / Items</th>
                      <th className="py-2.5 px-3">Total Cost</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => {
                      const balance = Math.max(0, purchase.totalCost - purchase.amountPaid);
                      return (
                        <Fragment key={purchase._id}>
                          <tr className="border-b border-stone-100 hover:bg-stone-50/50 align-top">
                            <td className="py-3 px-3">
                              <span className="font-semibold text-mountain-900">{fmtDate(purchase.purchaseDate)}</span>
                              <span className="block text-xs text-stone-600 font-medium">{purchase.supplierName}</span>
                              {renderPurchaseDueBadge(purchase)}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-xs font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
                                {purchase.reference || purchase.kind}
                              </span>
                              <div className="mt-1 text-xs text-stone-500">
                                {purchase.lines.map((line) => `${line.productName} (${line.variantLabel}) × ${line.quantity}`).join(', ')}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold">
                              {purchase.kind === 'reversal' ? '−' : ''}{fmtPKR(purchase.totalCost)}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-mountain-900 font-medium">{fmtPKR(purchase.amountPaid)}</span>
                              {balance > 0 && purchase.paymentStatus !== 'reversed' && (
                                <span className="block text-[11px] text-rose-600 font-semibold">Due: {fmtPKR(balance)}</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold capitalize ${purchase.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : purchase.paymentStatus === 'partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : purchase.paymentStatus === 'reversed'
                                    ? 'bg-stone-100 text-stone-600'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                {purchase.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1">
                                {purchase.paymentStatus !== 'paid' && purchase.paymentStatus !== 'reversed' && (
                                  <button
                                    type="button"
                                    className="text-xs font-bold text-apricot-700 hover:underline text-left"
                                    onClick={() => {
                                      setPaymentTarget(paymentTarget === purchase._id ? '' : purchase._id);
                                      setPaymentForm({ amount: balance > 0 ? String(balance) : '', paymentDate: todayInPakistan(), method: '', reference: '' });
                                    }}
                                  >
                                    + Record Payment
                                  </button>
                                )}
                                {purchase.amountPaid > 0 && purchase.paymentStatus !== 'reversed' && (
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-emerald-700 hover:underline text-left inline-flex items-center gap-1"
                                    onClick={() => setVoucherData({
                                      purchase,
                                      payment: { amount: purchase.amountPaid, paymentDate: purchase.purchaseDate, method: 'Direct' },
                                      supplier: suppliers.find((s) => s._id === purchase.supplier),
                                    })}
                                  >
                                    <span>🖨️</span> Payment Voucher
                                  </button>
                                )}
                                {purchase.canReverse && (
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-rose-700 hover:underline text-left"
                                    onClick={() => {
                                      setPurchaseReverseTarget(purchaseReverseTarget === purchase._id ? '' : purchase._id);
                                      setPurchaseReverseReason('');
                                    }}
                                  >
                                    Reverse Invoice
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Payment Form Row */}
                          {paymentTarget === purchase._id && (
                            <tr>
                              <td colSpan="6" className="bg-stone-50 p-4 border-b border-stone-200">
                                <h4 className="text-xs font-bold text-mountain-900 mb-2">Record Supplier Payment for {purchase.supplierName}</h4>
                                <form
                                  className="grid gap-2 sm:grid-cols-5 items-end"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    paymentMutation.mutate({ id: purchase._id, payload: { ...paymentForm, amount: moneyInput(paymentForm.amount) } });
                                  }}
                                >
                                  <div>
                                    <span className={labelClass}>Amount (PKR)</span>
                                    <input className={inputClass} required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((form) => ({ ...form, amount: event.target.value }))} />
                                  </div>
                                  <div>
                                    <span className={labelClass}>Date</span>
                                    <input className={inputClass} required type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((form) => ({ ...form, paymentDate: event.target.value }))} />
                                  </div>
                                  <div>
                                    <span className={labelClass}>Method</span>
                                    <input className={inputClass} placeholder="Bank Transfer, Cash" value={paymentForm.method} onChange={(event) => setPaymentForm((form) => ({ ...form, method: event.target.value }))} />
                                  </div>
                                  <div>
                                    <span className={labelClass}>Ref #</span>
                                    <input className={inputClass} placeholder="Cheque / TR #" value={paymentForm.reference} onChange={(event) => setPaymentForm((form) => ({ ...form, reference: event.target.value }))} />
                                  </div>
                                  <button className="rounded-lg bg-mountain-900 px-3 py-2 text-xs font-semibold text-white hover:bg-mountain-800 disabled:opacity-50 transition" disabled={paymentMutation.isPending}>
                                    Save Payment
                                  </button>
                                </form>
                              </td>
                            </tr>
                          )}

                          {/* Purchase Reversal Form Row */}
                          {purchaseReverseTarget === purchase._id && (
                            <tr>
                              <td colSpan="6" className="bg-rose-50 p-4 border-b border-rose-200">
                                <form
                                  className="grid gap-2 sm:grid-cols-[1fr_auto] items-end"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    purchaseReverseMutation.mutate({ id: purchase._id, reason: purchaseReverseReason });
                                  }}
                                >
                                  <div>
                                    <span className="block text-xs font-bold text-rose-900 mb-1">Reason for Reversal</span>
                                    <input className={inputClass} required minLength="3" maxLength="300" placeholder="e.g. Returned goods to supplier" value={purchaseReverseReason} onChange={(event) => setPurchaseReverseReason(event.target.value)} />
                                  </div>
                                  <button className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50 transition" disabled={purchaseReverseMutation.isPending}>
                                    Confirm Reversal
                                  </button>
                                </form>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {purchases.length === 0 && (
                      <tr><td colSpan="6" className="py-6 text-center text-stone-500">No supplier purchases recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: OPERATING EXPENSES
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Form */}
            <section className="xl:col-span-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h2 className="text-lg font-bold text-mountain-900">Record Operating Expense</h2>
              <p className="mb-4 mt-1 text-xs text-stone-500">
                Operating expenses (packaging, utilities, rent) are deducted from Gross Profit to arrive at Net Profit.
              </p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  expenseMutation.mutate({ ...expenseForm, amount: moneyInput(expenseForm.amount) });
                }}
              >
                <div>
                  <span className={labelClass}>Category</span>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExpenseForm((form) => ({ ...form, category: cat }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${expenseForm.category === cat
                          ? 'bg-mountain-900 text-white border-mountain-900 shadow-2xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <input
                    className={inputClass}
                    required
                    maxLength="80"
                    placeholder="Selected category or custom entry..."
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm((form) => ({ ...form, category: event.target.value }))}
                  />
                </div>
                <div>
                  <span className={labelClass}>Payment Source</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: '💵 Cash Drawer' },
                      { id: 'bank', label: '🏦 Bank' },
                      { id: 'easypaisa', label: '📱 Easypaisa' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setExpenseForm((form) => ({ ...form, paymentMethod: method.id }))}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${expenseForm.paymentMethod === method.id
                          ? 'bg-mountain-900 text-white border-mountain-900 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={labelClass}>Amount (PKR)</span>
                  <input className={inputClass} required type="number" min="0.01" step="0.01" placeholder="1500" value={expenseForm.amount} onChange={(event) => setExpenseForm((form) => ({ ...form, amount: event.target.value }))} />
                </div>
                <div>
                  <span className={labelClass}>Description</span>
                  <input className={inputClass} required maxLength="300" placeholder="100x bubble wrap pouches for dry fruit jars" value={expenseForm.description} onChange={(event) => setExpenseForm((form) => ({ ...form, description: event.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={labelClass}>Date</span>
                    <input className={inputClass} required type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm((form) => ({ ...form, expenseDate: event.target.value }))} />
                  </div>
                  <div>
                    <span className={labelClass}>Reference</span>
                    <input className={inputClass} maxLength="120" placeholder="Bill / Receipt #" value={expenseForm.reference} onChange={(event) => setExpenseForm((form) => ({ ...form, reference: event.target.value }))} />
                  </div>
                </div>
                <button
                  className="w-full rounded-lg bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mountain-800 disabled:opacity-50 transition"
                  disabled={expenseMutation.isPending}
                >
                  {expenseMutation.isPending ? 'Saving Expense…' : 'Record Expense'}
                </button>
              </form>
            </section>

            {/* List */}
            <section className="xl:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h2 className="text-lg font-bold text-mountain-900">Expenses History & Adjustments</h2>
              <ul className="mt-3 divide-y divide-stone-100">
                {expenses.map((expense) => {
                  const remaining = expense.kind === 'expense'
                    ? Math.max(0, expense.amount - (reversedExpenseAmounts.get(expense._id) || 0))
                    : 0;
                  return (
                    <li key={expense._id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div>
                          <span className="font-bold text-mountain-900">{expense.category}</span>
                          <span className="text-stone-700 ml-2">{expense.description}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{fmtDate(expense.expenseDate)} · {expense.kind}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-mountain-900 block">
                            {expense.kind === 'reversal' ? '−' : ''}{fmtPKR(expense.amount)}
                          </span>
                          {remaining > 0 && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-mountain-800 underline hover:text-mountain-900"
                              onClick={() => {
                                setReversalTarget(reversalTarget === expense._id ? '' : expense._id);
                                setReversalForm({ amount: remaining.toFixed(2), reason: '' });
                              }}
                            >
                              Correct / Reverse
                            </button>
                          )}
                        </div>
                      </div>
                      {reversalTarget === expense._id && (
                        <form
                          className="mt-3 grid gap-2 sm:grid-cols-3 bg-stone-50 p-3 rounded-lg border border-stone-200"
                          onSubmit={(event) => {
                            event.preventDefault();
                            expenseReverseMutation.mutate({ id: expense._id, payload: { ...reversalForm, amount: moneyInput(reversalForm.amount) } });
                          }}
                        >
                          <input className={inputClass} required type="number" min="0.01" max={remaining} step="0.01" value={reversalForm.amount} onChange={(event) => setReversalForm((form) => ({ ...form, amount: event.target.value }))} />
                          <input className={inputClass} required maxLength="300" placeholder="Reason for reversal" value={reversalForm.reason} onChange={(event) => setReversalForm((form) => ({ ...form, reason: event.target.value }))} />
                          <button className="rounded-lg bg-mountain-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={expenseReverseMutation.isPending}>
                            Save Reversal
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
                {expenses.length === 0 && <li className="py-6 text-center text-sm text-stone-500">No expenses recorded yet.</li>}
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: SUPPLIERS DIRECTORY & STATEMENT
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Add Supplier Form */}
            <section className="xl:col-span-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h2 className="text-lg font-bold text-mountain-900">Add New Supplier</h2>
              <p className="mb-4 mt-1 text-xs text-stone-500">
                Register supplier details to link them with catalog products and track purchase balances.
              </p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  supplierMutation.mutate(supplierForm);
                }}
              >
                <div>
                  <span className={labelClass}>Company / Supplier Name</span>
                  <input className={inputClass} required minLength="2" maxLength="120" placeholder="e.g. Hunza Organic Dry Fruits" value={supplierForm.name} onChange={(event) => setSupplierForm((form) => ({ ...form, name: event.target.value }))} />
                </div>
                <div>
                  <span className={labelClass}>Contact Person</span>
                  <input className={inputClass} maxLength="120" placeholder="e.g. Karim Ali" value={supplierForm.contactName} onChange={(event) => setSupplierForm((form) => ({ ...form, contactName: event.target.value }))} />
                </div>
                <div>
                  <span className={labelClass}>Phone</span>
                  <input className={inputClass} type="tel" maxLength="30" placeholder="+92 345 1234567" value={supplierForm.phone} onChange={(event) => setSupplierForm((form) => ({ ...form, phone: event.target.value }))} />
                </div>
                <div>
                  <span className={labelClass}>Email</span>
                  <input className={inputClass} type="email" maxLength="254" placeholder="supplier@example.com" value={supplierForm.email} onChange={(event) => setSupplierForm((form) => ({ ...form, email: event.target.value }))} />
                </div>
                <div>
                  <span className={labelClass}>Address</span>
                  <input className={inputClass} maxLength="500" placeholder="Aliabad, Hunza, Gilgit-Baltistan" value={supplierForm.address} onChange={(event) => setSupplierForm((form) => ({ ...form, address: event.target.value }))} />
                </div>
                <button
                  className="w-full rounded-lg bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mountain-800 disabled:opacity-50 transition"
                  disabled={supplierMutation.isPending}
                >
                  {supplierMutation.isPending ? 'Adding…' : 'Register Supplier'}
                </button>
              </form>
            </section>

            {/* Suppliers Table */}
            <section className="xl:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h2 className="text-lg font-bold text-mountain-900">Partner Suppliers Directory</h2>
              <p className="mt-1 text-xs text-stone-500 mb-4">
                View supplier balances, products supplied, and statement of accounts.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 bg-stone-50">
                    <tr>
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Products</th>
                      <th className="py-2.5 px-3">Purchased</th>
                      <th className="py-2.5 px-3">Payable Due</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {suppliers.map((supplier) => (
                      <tr key={supplier._id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3">
                          <strong className="text-mountain-900 block">{supplier.name}</strong>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${supplier.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-stone-800">{supplier.contactName || '—'}</span>
                          {supplier.phone && <span className="block text-xs text-stone-500">{supplier.phone}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-mountain-900">{supplier.productCount ?? 0}</span>
                          <span className="text-xs text-stone-500 ml-1">items</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-stone-800">
                          {fmtPKR(supplier.totalPurchased ?? 0)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-bold ${(supplier.balance ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {fmtPKR(supplier.balance ?? 0)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-apricot-700 hover:underline"
                              onClick={() => setStatementSupplierId(supplier._id)}
                            >
                              Statement
                            </button>
                            <span className="text-stone-300">|</span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-stone-600 hover:text-mountain-900 underline"
                              onClick={() => supplierStatusMutation.mutate({ id: supplier._id, isActive: !supplier.isActive })}
                            >
                              {supplier.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {suppliers.length === 0 && (
                      <tr><td colSpan="6" className="py-6 text-center text-stone-500">No suppliers registered yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Supplier Statement Modal */}
          {statementSupplierId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-6">
                <div className="flex items-start justify-between border-b border-stone-200 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-apricot-700">Supplier Statement of Account</span>
                    <h3 className="text-xl font-bold text-mountain-900 mt-1">
                      {statementQuery.data?.supplier?.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {statementQuery.data?.supplier?.contactName} · {statementQuery.data?.supplier?.phone} · {statementQuery.data?.supplier?.email || 'No email'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatementSupplierId(null)}
                    className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  >
                    ✕
                  </button>
                </div>

                {statementQuery.isLoading && <p className="text-sm text-stone-500">Loading statement records…</p>}

                {statementQuery.data && (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                        <span className="text-xs text-stone-500 block">Total Purchases Invoiced</span>
                        <strong className="text-lg font-bold text-mountain-900">{fmtPKR(statementQuery.data.summary.totalPurchased)}</strong>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <span className="text-xs text-emerald-700 block">Total Paid to Supplier</span>
                        <strong className="text-lg font-bold text-emerald-900">{fmtPKR(statementQuery.data.summary.totalPaid)}</strong>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <span className="text-xs text-rose-700 block">Outstanding Balance Due</span>
                        <strong className="text-lg font-bold text-rose-900">{fmtPKR(statementQuery.data.summary.outstandingBalance)}</strong>
                      </div>
                    </div>

                    {/* Associated Products */}
                    <div>
                      <h4 className="font-bold text-mountain-900 text-sm mb-2">Products Supplied ({statementQuery.data.products.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {statementQuery.data.products.map((prod) => (
                          <span key={prod._id} className="rounded-lg bg-stone-100 px-3 py-1 text-xs text-stone-800 font-medium">
                            {prod.name} ({prod.category?.name || 'Category'}) · {prod.totalSold || 0} sold
                          </span>
                        ))}
                        {statementQuery.data.products.length === 0 && (
                          <span className="text-xs text-stone-400">No products currently assigned to this supplier.</span>
                        )}
                      </div>
                    </div>

                    {/* Itemized Purchases History */}
                    <div>
                      <h4 className="font-bold text-mountain-900 text-sm mb-2">Purchase Invoices & History</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                            <tr>
                              <th className="py-2 px-2">Date</th>
                              <th className="py-2 px-2">Reference</th>
                              <th className="py-2 px-2">Lines</th>
                              <th className="py-2 px-2">Total</th>
                              <th className="py-2 px-2">Paid</th>
                              <th className="py-2 px-2">Balance</th>
                              <th className="py-2 px-2">Status</th>
                              <th className="py-2 px-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {statementQuery.data.purchases.map((p) => (
                              <tr key={p._id}>
                                <td className="py-2 px-2">{fmtDate(p.purchaseDate)}</td>
                                <td className="py-2 px-2 font-mono">{p.reference || p.kind}</td>
                                <td className="py-2 px-2 text-stone-600">{p.lines.map((l) => `${l.productName} × ${l.quantity}`).join(', ')}</td>
                                <td className="py-2 px-2 font-semibold">{fmtPKR(p.totalCost)}</td>
                                <td className="py-2 px-2 text-emerald-700">{fmtPKR(p.amountPaid)}</td>
                                <td className="py-2 px-2 text-rose-700 font-bold">{fmtPKR(p.balance)}</td>
                                <td className="py-2 px-2 capitalize">{p.paymentStatus}</td>
                                <td className="py-2 px-2">
                                  {p.amountPaid > 0 && (
                                    <button
                                      type="button"
                                      className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                      onClick={() => setVoucherData({
                                        purchase: p,
                                        payment: { amount: p.amountPaid, paymentDate: p.purchaseDate, method: 'Direct' },
                                        supplier: statementQuery.data.supplier,
                                      })}
                                    >
                                      <span>🖨️</span> Voucher
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {statementQuery.data.purchases.length === 0 && (
                              <tr><td colSpan="8" className="py-4 text-center text-stone-400">No purchases found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: AUDIT TRAIL
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-mountain-900">Accounts Audit Trail</h2>
          <p className="mt-1 text-xs text-stone-500 mb-4">
            Immutable log of all financial creations, payment entries, adjustments, and report exports.
          </p>
          <ul className="divide-y divide-stone-100">
            {auditLogs.map((entry) => (
              <li key={`${entry._id || entry.occurredAt}-${entry.action}`} className="flex flex-wrap justify-between gap-2 py-3 text-xs">
                <div>
                  <span className="font-bold text-mountain-900">{entry.action}</span>
                  <span className="text-stone-600 ml-2">· {entry.entity} {entry.entityId}</span>
                </div>
                <span className="text-stone-500">{entry.actor?.name || 'Admin'} · {fmtDate(entry.occurredAt)}</span>
              </li>
            ))}
            {auditLogs.length === 0 && <li className="py-6 text-center text-sm text-stone-500">No audit events recorded yet.</li>}
          </ul>
        </section>
      )}

      {/* ── Printable Supplier Payment Voucher Modal ── */}
      {voucherData && (
        <SupplierPaymentVoucher
          {...voucherData}
          onClose={() => setVoucherData(null)}
        />
      )}
    </div>
  );
}
