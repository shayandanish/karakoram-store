import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import api from '../../lib/axios';
import { fmtDate, fmtPKR } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { firebaseAuth } from '../../firebase';
import SEO from '../../components/ui/SEO';

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
  additionalCost: '0',
});

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-apricot-500';
const labelClass = 'mb-1 block text-xs font-semibold text-stone-600';
const EMPTY_ARRAY = [];

const moneyInput = (value) => Number(value || 0);

function AdminMfaSetup() {
  const { logout } = useAuth();
  const toast = useToast();
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firebaseUser = firebaseAuth?.currentUser;
  const alreadyEnrolled = firebaseUser
    ? multiFactor(firebaseUser).enrolledFactors.some((factor) => factor.factorId === 'totp')
    : false;

  const startEnrollment = async () => {
    if (!firebaseUser) {
      setError('Sign in to the administrator account using Firebase before enrolling an authenticator. Legacy password-only accounts cannot use Accounts.');
      return;
    }
    if (alreadyEnrolled) {
      setError('An authenticator is already enrolled. Sign out and sign in again with its current code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const session = await multiFactor(firebaseUser).getSession();
      const generated = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(generated);
    } catch (enrollmentError) {
      setError(enrollmentError.message || 'Could not start authenticator enrollment. Check Firebase MFA project settings.');
    } finally {
      setBusy(false);
    }
  };

  const finishEnrollment = async (event) => {
    event.preventDefault();
    if (!secret || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError('');
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(firebaseUser).enroll(assertion, 'Karakoram Store Admin');
      setSecret(null);
      setCode('');
      toast.success('Authenticator enrolled. Sign out and sign in again to verify it.');
    } catch (enrollmentError) {
      setError(enrollmentError.message || 'Authenticator verification failed. Check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 shadow-xs">
      <SEO title="Secure Accounts — Admin" noindex />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Additional verification required</p>
      <h1 className="mt-1 text-2xl font-bold text-mountain-900">Secure Accounts with an authenticator</h1>
      <p className="mt-3 text-sm text-stone-600">
        Production access requires administrator TOTP multi-factor authentication verified within the last 10 minutes.
        Enroll an authenticator app below, then sign in again and enter its 6-digit code.
      </p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {alreadyEnrolled ? (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm text-stone-700">
          This account already has an authenticator enrolled. Use the sign-in flow to verify it; do not enroll a second factor to bypass reauthentication.
        </p>
      ) : !secret ? (
        <button type="button" disabled={busy} onClick={startEnrollment} className="mt-5 rounded-lg bg-mountain-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? 'Preparing…' : 'Set up authenticator'}
        </button>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={finishEnrollment}>
          <div className="rounded-lg bg-stone-50 p-4">
            <p className="text-sm font-semibold text-mountain-900">Add this key to your authenticator app</p>
            <code className="mt-2 block select-all break-all rounded bg-white p-3 text-sm tracking-wider">{secret.secretKey}</code>
            <p className="mt-2 text-xs text-stone-500">Keep this setup key private. Do not send it to anyone or include it in support messages.</p>
          </div>
          <label className="block">
            <span className={labelClass}>Authenticator code</span>
            <input className={inputClass} required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className="rounded-lg bg-apricot-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Verifying…' : 'Verify and enroll'}
          </button>
        </form>
      )}
      <div className="mt-6 border-t border-stone-100 pt-4 text-sm">
        <button type="button" onClick={async () => { await logout(); window.location.assign('/login?redirect=%2Fadmin%2Faccounts'); }} className="font-semibold text-mountain-800 underline">
          Sign out and return to admin sign in
        </button>
        <span className="mx-2 text-stone-400">·</span>
        <Link to="/admin" className="text-stone-600 underline">Return to dashboard</Link>
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', phone: '', email: '' });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    supplierName: '',
    reference: '',
    purchaseDate: todayInPakistan(),
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
      const { data } = await api.get('/admin/products?limit=100&active=true');
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

  const invalidateAccounts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  const supplierMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/accounts/suppliers', payload),
    onSuccess: () => {
      setSupplierForm({ name: '', contactName: '', phone: '', email: '' });
      toast.success('Supplier added');
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
        kind: 'purchase',
        amountPaid: '0',
        notes: '',
        lines: [newPurchaseLine()],
      });
      toast.success('Inventory purchase recorded');
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
        reference: '',
      });
      toast.success('Expense recorded');
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
        additionalCost: moneyInput(line.additionalCost),
      })),
    });
  };

  if (accountsQuery.isLoading || productsQuery.isLoading) {
    return <div className="p-8 text-sm text-stone-500">Loading Accounts…</div>;
  }

  if (accountsQuery.error?.response?.data?.code === 'ADMIN_MFA_REQUIRED') {
    return <AdminMfaSetup />;
  }

  if (accountsQuery.isError || productsQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        Accounts data could not be loaded. Please retry; financial records are not editable until they load.
        <button type="button" onClick={() => { accountsQuery.refetch(); productsQuery.refetch(); }} className="ml-3 font-semibold underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <SEO title="Accounts — Admin" noindex />
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-apricot-700">Administrator only</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-mountain-900 sm:text-3xl">Accounts</h1>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Supplier purchases, inventory cost, expenses, and profit reports. Financial entries are auditable and cannot be deleted.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Cost history notice:</strong> profit is calculated only for paid orders with a recorded cost snapshot.
        Existing orders without purchase-cost history are excluded from profit and shown as missing-cost orders.
        Stock quantities must be changed here so inventory records stay auditable.
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-mountain-900">Profit & sales report</h2>
            <p className="mt-1 text-xs text-stone-500">Date periods use Asia/Karachi. Sales exclude shipping; inventory purchases are not deducted twice from profit.</p>
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
            <button type="button" onClick={downloadReport} disabled={reportQuery.isLoading || !report} className="rounded-lg bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mountain-800 disabled:opacity-50">
              Download Excel
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
            <p className="mt-4 text-xs text-stone-500">
              {report.range.startDate} through {report.range.endDate} ({report.range.timeZone})
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Sales (excl. shipping)', report.summary.sales],
                ['COGS (known cost)', report.summary.costOfGoodsSold],
                ['Gross profit', report.summary.grossProfit],
                ['Gross margin', `${report.summary.grossMarginPercent}%`],
                ['Expenses', report.summary.expenses],
                ['Refunds', report.summary.refunds],
                ['Net profit', report.summary.netProfit],
                ['Supplier payments', report.summary.supplierPayments],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold text-stone-500">{label}</p>
                  <p className="mt-1 text-lg font-bold text-mountain-900">
                    {typeof value === 'number' ? fmtPKR(value) : value}
                  </p>
                </div>
              ))}
            </div>
            {report.summary.ordersWithMissingCost > 0 && (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                {report.summary.ordersWithMissingCost} paid order(s) have no cost snapshot and are excluded from profit calculations.
              </p>
            )}
            {report.summary.paidCancelledOrderCount > 0 && (
              <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
                {report.summary.paidCancelledOrderCount} paid cancelled/returned order(s), totaling {fmtPKR(report.summary.paidCancelledTotal)}, need manual reconciliation. They are excluded from profit.
              </p>
            )}
            <div className="mt-6 overflow-x-auto">
              <h3 className="mb-2 font-semibold text-mountain-900">Product sales & profit</h3>
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
                  <tr><th className="py-2 pr-3">Product / variant</th><th className="py-2 pr-3">Qty sold</th><th className="py-2 pr-3">Sales</th><th className="py-2 pr-3">COGS</th><th className="py-2 pr-3">Gross profit</th></tr>
                </thead>
                <tbody>
                  {report.products.map((product) => (
                    <tr key={`${product.name}-${product.variantLabel}`} className="border-b border-stone-100">
                      <td className="py-3 pr-3 font-medium">{product.name} <span className="text-stone-500">· {product.variantLabel}</span></td>
                      <td className="py-3 pr-3">{product.quantity}</td>
                      <td className="py-3 pr-3">{fmtPKR(product.sales)}</td>
                      <td className="py-3 pr-3">{product.costOfGoodsSold === null ? 'Cost unavailable' : fmtPKR(product.costOfGoodsSold)}</td>
                      <td className="py-3 pr-3">{product.grossProfit === null ? 'Unavailable' : fmtPKR(product.grossProfit)}</td>
                    </tr>
                  ))}
                  {report.products.length === 0 && <tr><td className="py-4 text-stone-500" colSpan="5">No paid sales in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-mountain-900">Record supplier purchase</h2>
          <p className="mb-4 mt-1 text-xs text-stone-500">Purchase cost and additional landed costs update the variant weighted-average cost.</p>
          <form className="space-y-4" onSubmit={submitPurchase}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Supplier</span>
                <select className={inputClass} value={purchaseForm.supplier} onChange={(event) => setPurchaseForm((form) => ({ ...form, supplier: event.target.value }))}>
                  <option value="">Enter supplier name</option>
                  {activeSuppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
                </select>
              </label>
              {!purchaseForm.supplier && (
                <label>
                  <span className={labelClass}>Supplier name</span>
                  <input className={inputClass} required value={purchaseForm.supplierName} onChange={(event) => setPurchaseForm((form) => ({ ...form, supplierName: event.target.value }))} />
                </label>
              )}
              <label>
                <span className={labelClass}>Purchase date</span>
                <input className={inputClass} required type="date" value={purchaseForm.purchaseDate} onChange={(event) => setPurchaseForm((form) => ({ ...form, purchaseDate: event.target.value }))} />
              </label>
              <label>
                <span className={labelClass}>Record type</span>
                <select className={inputClass} value={purchaseForm.kind} onChange={(event) => setPurchaseForm((form) => ({ ...form, kind: event.target.value }))}>
                  <option value="purchase">New purchase</option>
                  <option value="opening_stock">Opening stock (sets current quantity)</option>
                  <option value="adjustment">Stock addition / correction</option>
                </select>
              </label>
              <label>
                <span className={labelClass}>Invoice / reference</span>
                <input className={inputClass} value={purchaseForm.reference} onChange={(event) => setPurchaseForm((form) => ({ ...form, reference: event.target.value }))} />
              </label>
              <label>
                <span className={labelClass}>Amount paid (PKR)</span>
                <input className={inputClass} type="number" min="0" step="0.01" value={purchaseForm.amountPaid} onChange={(event) => setPurchaseForm((form) => ({ ...form, amountPaid: event.target.value }))} />
              </label>
            </div>

            <div className="space-y-3">
              {purchaseForm.lines.map((line, index) => {
                const selectedProduct = products.find((product) => product._id === line.product);
                return (
                  <div key={index} className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="sm:col-span-2 xl:col-span-1">
                      <span className={labelClass}>Product</span>
                      <select className={inputClass} required value={line.product} onChange={(event) => updatePurchaseLine(index, 'product', event.target.value)}>
                        <option value="">Select product</option>
                        {products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className={labelClass}>Variant</span>
                      <select className={inputClass} required value={line.variantLabel} onChange={(event) => updatePurchaseLine(index, 'variantLabel', event.target.value)}>
                        <option value="">Select variant</option>
                        {selectedProduct?.variants?.map((variant) => <option key={variant._id || variant.label} value={variant.label}>{variant.label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className={labelClass}>Quantity</span>
                      <input className={inputClass} required type="number" min="1" step="1" value={line.quantity} onChange={(event) => updatePurchaseLine(index, 'quantity', event.target.value)} />
                    </label>
                    <label>
                      <span className={labelClass}>Unit cost (PKR)</span>
                      <input className={inputClass} required type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updatePurchaseLine(index, 'unitCost', event.target.value)} />
                    </label>
                    <label>
                      <span className={labelClass}>Additional landed cost (PKR)</span>
                      <input className={inputClass} type="number" min="0" step="0.01" value={line.additionalCost} onChange={(event) => updatePurchaseLine(index, 'additionalCost', event.target.value)} />
                    </label>
                    {purchaseForm.lines.length > 1 && (
                      <button type="button" className="self-end text-left text-xs font-semibold text-rose-700" onClick={() => setPurchaseForm((form) => ({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) }))}>
                        Remove line
                      </button>
                    )}
                  </div>
                );
              })}
              <button type="button" className="text-sm font-semibold text-mountain-800 underline" onClick={() => setPurchaseForm((form) => ({ ...form, lines: [...form.lines, newPurchaseLine()] }))}>
                Add another product
              </button>
            </div>
            <label className="block">
              <span className={labelClass}>Notes</span>
              <textarea className={inputClass} rows="2" maxLength="1000" value={purchaseForm.notes} onChange={(event) => setPurchaseForm((form) => ({ ...form, notes: event.target.value }))} />
            </label>
            <button className="rounded-lg bg-apricot-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-apricot-700 disabled:opacity-50" disabled={purchaseMutation.isPending || !products.length}>
              {purchaseMutation.isPending ? 'Saving…' : 'Save purchase'}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <h2 className="text-lg font-bold text-mountain-900">Record expense</h2>
            <p className="mb-4 mt-1 text-xs text-stone-500">Expenses are append-only; corrections are entered as reversal records.</p>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault();
              expenseMutation.mutate({ ...expenseForm, amount: moneyInput(expenseForm.amount) });
            }}>
              <label><span className={labelClass}>Category</span><input className={inputClass} required maxLength="80" value={expenseForm.category} onChange={(event) => setExpenseForm((form) => ({ ...form, category: event.target.value }))} placeholder="Packaging, utilities…" /></label>
              <label><span className={labelClass}>Amount (PKR)</span><input className={inputClass} required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((form) => ({ ...form, amount: event.target.value }))} /></label>
              <label className="sm:col-span-2"><span className={labelClass}>Description</span><input className={inputClass} required maxLength="300" value={expenseForm.description} onChange={(event) => setExpenseForm((form) => ({ ...form, description: event.target.value }))} /></label>
              <label><span className={labelClass}>Date</span><input className={inputClass} required type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm((form) => ({ ...form, expenseDate: event.target.value }))} /></label>
              <label><span className={labelClass}>Reference</span><input className={inputClass} maxLength="120" value={expenseForm.reference} onChange={(event) => setExpenseForm((form) => ({ ...form, reference: event.target.value }))} /></label>
              <button className="w-fit rounded-lg bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={expenseMutation.isPending}>
                {expenseMutation.isPending ? 'Saving…' : 'Save expense'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <h2 className="text-lg font-bold text-mountain-900">Suppliers</h2>
            <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault();
              supplierMutation.mutate(supplierForm);
            }}>
              <input className={inputClass} required minLength="2" maxLength="120" aria-label="Supplier name" placeholder="Supplier name" value={supplierForm.name} onChange={(event) => setSupplierForm((form) => ({ ...form, name: event.target.value }))} />
              <input className={inputClass} maxLength="120" aria-label="Contact person" placeholder="Contact person" value={supplierForm.contactName} onChange={(event) => setSupplierForm((form) => ({ ...form, contactName: event.target.value }))} />
              <input className={inputClass} type="tel" maxLength="30" aria-label="Supplier phone" placeholder="Phone" value={supplierForm.phone} onChange={(event) => setSupplierForm((form) => ({ ...form, phone: event.target.value }))} />
              <input className={inputClass} type="email" maxLength="254" aria-label="Supplier email" placeholder="Email" value={supplierForm.email} onChange={(event) => setSupplierForm((form) => ({ ...form, email: event.target.value }))} />
              <button className="w-fit rounded-lg border border-mountain-800 px-3 py-2 text-sm font-semibold text-mountain-900 disabled:opacity-50" disabled={supplierMutation.isPending}>Add supplier</button>
            </form>
            <ul className="mt-4 divide-y divide-stone-100">
              {suppliers.map((supplier) => (
                <li key={supplier._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><strong>{supplier.name}</strong>{supplier.phone && <span className="ml-2 text-xs text-stone-500">{supplier.phone}</span>}</span>
                  <button type="button" className="text-xs font-semibold text-mountain-700 underline" onClick={() => supplierStatusMutation.mutate({ id: supplier._id, isActive: !supplier.isActive })}>
                    {supplier.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-mountain-900">Recent purchases</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase text-stone-500"><tr><th className="py-2 pr-3">Date / supplier</th><th className="py-2 pr-3">Reference</th><th className="py-2 pr-3">Inventory cost</th><th className="py-2 pr-3">Paid</th><th className="py-2 pr-3">Status</th><th className="py-2">Action</th></tr></thead>
            <tbody>
              {purchases.map((purchase) => (
                <Fragment key={purchase._id}>
                  <tr className="border-b border-stone-100 align-top">
                    <td className="py-3 pr-3">{fmtDate(purchase.purchaseDate)}<span className="block text-xs text-stone-500">{purchase.supplierName}</span></td>
                    <td className="py-3 pr-3">{purchase.reference || purchase.kind}<span className="block text-xs text-stone-500">{purchase.lines.map((line) => `${line.productName} (${line.variantLabel}) × ${line.quantity}`).join(', ')}</span></td>
                    <td className="py-3 pr-3">{purchase.kind === 'reversal' ? '−' : ''}{fmtPKR(purchase.totalCost)}</td>
                    <td className="py-3 pr-3">{fmtPKR(purchase.amountPaid)}</td>
                    <td className="py-3 pr-3 capitalize">{purchase.paymentStatus}</td>
                    <td className="py-3">
                      {purchase.paymentStatus !== 'paid' && purchase.paymentStatus !== 'reversed' && (
                        <button type="button" className="text-xs font-semibold text-mountain-800 underline" onClick={() => {
                          setPaymentTarget(paymentTarget === purchase._id ? '' : purchase._id);
                          setPaymentForm({ amount: '', paymentDate: todayInPakistan(), method: '', reference: '' });
                        }}>Record payment</button>
                      )}
                      {purchase.canReverse && (
                        <button type="button" className="ml-2 text-xs font-semibold text-rose-700 underline" onClick={() => {
                          setPurchaseReverseTarget(purchaseReverseTarget === purchase._id ? '' : purchase._id);
                          setPurchaseReverseReason('');
                        }}>Reverse</button>
                      )}
                    </td>
                  </tr>
                  {paymentTarget === purchase._id && (
                    <tr><td colSpan="6" className="pb-3">
                      <form className="grid gap-2 rounded-lg bg-stone-50 p-3 sm:grid-cols-5" onSubmit={(event) => {
                        event.preventDefault();
                        paymentMutation.mutate({ id: purchase._id, payload: { ...paymentForm, amount: moneyInput(paymentForm.amount) } });
                      }}>
                        <input className={inputClass} required type="number" min="0.01" step="0.01" placeholder="Amount PKR" value={paymentForm.amount} onChange={(event) => setPaymentForm((form) => ({ ...form, amount: event.target.value }))} />
                        <input className={inputClass} required type="date" aria-label="Payment date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((form) => ({ ...form, paymentDate: event.target.value }))} />
                        <input className={inputClass} maxLength="60" placeholder="Method" value={paymentForm.method} onChange={(event) => setPaymentForm((form) => ({ ...form, method: event.target.value }))} />
                        <input className={inputClass} maxLength="120" placeholder="Reference" value={paymentForm.reference} onChange={(event) => setPaymentForm((form) => ({ ...form, reference: event.target.value }))} />
                        <button className="rounded-lg bg-mountain-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={paymentMutation.isPending}>Save payment</button>
                      </form>
                    </td></tr>
                  )}
                  {purchaseReverseTarget === purchase._id && (
                    <tr><td colSpan="6" className="pb-3">
                      <form className="grid gap-2 rounded-lg bg-rose-50 p-3 sm:grid-cols-[1fr_auto]" onSubmit={(event) => {
                        event.preventDefault();
                        purchaseReverseMutation.mutate({ id: purchase._id, reason: purchaseReverseReason });
                      }}>
                        <input className={inputClass} required minLength="3" maxLength="300" aria-label="Purchase reversal reason" placeholder="Reason for reversal" value={purchaseReverseReason} onChange={(event) => setPurchaseReverseReason(event.target.value)} />
                        <button className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={purchaseReverseMutation.isPending}>Save reversal</button>
                        <p className="text-xs text-rose-900 sm:col-span-2">Reversal is allowed only if no stock movement or supplier payment needs reversing first.</p>
                      </form>
                    </td></tr>
                  )}
                </Fragment>
              ))}
              {purchases.length === 0 && <tr><td colSpan="6" className="py-4 text-stone-500">No purchases recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-mountain-900">Recent expenses & reversals</h2>
        <ul className="mt-3 divide-y divide-stone-100">
          {expenses.map((expense) => {
            const remaining = expense.kind === 'expense'
              ? Math.max(0, expense.amount - (reversedExpenseAmounts.get(expense._id) || 0))
              : 0;
            return (
              <li key={expense._id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span><strong>{expense.category}</strong> · {expense.description}<span className="ml-2 text-xs text-stone-500">{fmtDate(expense.expenseDate)} · {expense.kind}</span></span>
                  <span className="font-semibold">{expense.kind === 'reversal' ? '−' : ''}{fmtPKR(expense.amount)}</span>
                  {remaining > 0 && (
                    <button type="button" className="text-xs font-semibold text-mountain-800 underline" onClick={() => {
                      setReversalTarget(reversalTarget === expense._id ? '' : expense._id);
                      setReversalForm({ amount: remaining.toFixed(2), reason: '' });
                    }}>Correct / reverse</button>
                  )}
                </div>
                {reversalTarget === expense._id && (
                  <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={(event) => {
                    event.preventDefault();
                    expenseReverseMutation.mutate({ id: expense._id, payload: { ...reversalForm, amount: moneyInput(reversalForm.amount) } });
                  }}>
                    <input className={inputClass} required type="number" min="0.01" max={remaining} step="0.01" aria-label="Reversal amount" value={reversalForm.amount} onChange={(event) => setReversalForm((form) => ({ ...form, amount: event.target.value }))} />
                    <input className={inputClass} required maxLength="300" aria-label="Reversal reason" placeholder="Reason" value={reversalForm.reason} onChange={(event) => setReversalForm((form) => ({ ...form, reason: event.target.value }))} />
                    <button className="rounded-lg border border-mountain-800 px-3 py-2 text-sm font-semibold text-mountain-900 disabled:opacity-50" disabled={expenseReverseMutation.isPending}>Save reversal</button>
                  </form>
                )}
              </li>
            );
          })}
          {expenses.length === 0 && <li className="py-4 text-sm text-stone-500">No expenses recorded yet.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-mountain-900">Accounts audit trail</h2>
        <p className="mt-1 text-xs text-stone-500">Latest 100 changes and report exports; entries are retained for accountability.</p>
        <ul className="mt-3 divide-y divide-stone-100">
          {auditLogs.slice(0, 20).map((entry) => (
            <li key={`${entry._id || entry.occurredAt}-${entry.action}`} className="flex flex-wrap justify-between gap-2 py-2 text-xs">
              <span><strong>{entry.action}</strong> · {entry.entity} {entry.entityId}</span>
              <span className="text-stone-500">{entry.actor?.name || 'Admin'} · {fmtDate(entry.occurredAt)}</span>
            </li>
          ))}
          {auditLogs.length === 0 && <li className="py-4 text-sm text-stone-500">No Accounts actions recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}
