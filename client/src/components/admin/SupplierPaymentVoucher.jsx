import { useState } from 'react';
import { fmtPKR, fmtDate } from '../../lib/utils';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import SiteLogoMark from '../ui/SiteLogoMark';

/**
 * SupplierPaymentVoucher Modal Component
 * Generates an official payment voucher for supplier / artisan payouts.
 * Supports both A4 Formal Voucher (with signature lines) and 80mm Thermal Receipt.
 */
export default function SupplierPaymentVoucher({ payment, purchase, supplier, onClose }) {
  const { settings } = useSiteSettings();
  const [printMode, setPrintMode] = useState('a4'); // 'a4' | 'thermal'

  if (!payment && !purchase) return null;

  const supplierName = supplier?.name || purchase?.supplierName || 'Valued Supplier / Artisan';
  const supplierContact = supplier?.contactName || '—';
  const supplierPhone = supplier?.phone || '—';
  const supplierAddress = supplier?.address || '—';

  const paymentDate = fmtDate(payment?.paymentDate || purchase?.purchaseDate || new Date());
  const paymentAmount = payment?.amount ?? purchase?.amountPaid ?? 0;
  const paymentMethod = payment?.method || (paymentAmount > 0 ? 'Cash' : 'Credit / Unpaid');
  const paymentRef = payment?.reference || purchase?.reference || 'Direct Counter Payment';

  const totalBill = purchase?.totalCost ?? 0;
  const currentPaid = purchase?.amountPaid ?? paymentAmount;
  const balanceDue = Math.max(0, totalBill - currentPaid);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="invoice-print-root" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Supplier Payment Voucher
            </span>
            <span className="text-xs font-mono font-bold text-stone-600">
              Ref: {purchase?.reference || 'SPV-' + Date.now().toString(36).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector */}
            <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintMode('a4')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${printMode === 'a4' ? 'bg-mountain-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                A4 Voucher
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${printMode === 'thermal' ? 'bg-mountain-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                80mm Thermal
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print Voucher</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center font-bold text-sm transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Voucher Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-0 print:overflow-visible text-mountain-900">
          
          {/* MODE 1: A4 VOUCHER */}
          {printMode === 'a4' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Header */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-stone-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SiteLogoMark className="w-8 h-8 rounded-lg bg-mountain-900 text-white p-1" />
                    <span className="font-display font-extrabold text-xl text-mountain-900 uppercase tracking-tight">
                      {settings.storeName || 'Karakoram Store'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">{settings.storeTagline || 'Authentic Handcrafted Treasures & Dry Fruits of Gilgit-Baltistan'}</p>
                  <p className="text-xs text-stone-500">{settings.contactPhone} • {settings.contactEmail}</p>
                </div>

                <div className="text-right">
                  <h2 className="text-base font-extrabold uppercase tracking-wider text-mountain-900">
                    Payment Voucher
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">Date: <strong className="text-stone-800">{paymentDate}</strong></p>
                  <p className="text-xs text-stone-500">Method: <strong className="text-stone-800 capitalize">{paymentMethod}</strong></p>
                </div>
              </div>

              {/* Payee / Supplier Details */}
              <div className="grid grid-cols-2 gap-6 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Paid To (Supplier / Payee)
                  </span>
                  <p className="font-bold text-sm text-stone-900">{supplierName}</p>
                  {supplierContact !== '—' && <p className="text-stone-600">Attn: {supplierContact}</p>}
                  {supplierPhone !== '—' && <p className="text-stone-600">Phone: {supplierPhone}</p>}
                  {supplierAddress !== '—' && <p className="text-stone-600">{supplierAddress}</p>}
                </div>

                <div className="text-right sm:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Invoice & Bill References
                  </span>
                  <p className="text-stone-700">Purchase Ref: <strong>{purchase?.reference || 'N/A'}</strong></p>
                  <p className="text-stone-700">Payment Ref / Trx: <strong>{paymentRef}</strong></p>
                  <p className="text-stone-700">Recorded By: <strong>{payment?.createdBy?.name || 'Accounts Dept'}</strong></p>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <table className="w-full text-xs border border-stone-200 rounded-lg overflow-hidden">
                <thead className="bg-stone-100 border-b border-stone-200 text-stone-700">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-bold">Description / Particulars</th>
                    <th className="py-2.5 px-3 text-right font-bold">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-stone-900">Total Purchase Value of Consignment</p>
                      <p className="text-[11px] text-stone-500">Inventory bill items received & stocked</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {fmtPKR(totalBill)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50">
                    <td className="py-3 px-3">
                      <p className="font-bold text-emerald-900">Amount Paid on this Voucher</p>
                      <p className="text-[11px] text-emerald-700">Settled via {paymentMethod} ({paymentRef})</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 text-sm">
                      {fmtPKR(paymentAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-stone-700">Remaining Balance Due to Supplier</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                      {fmtPKR(balanceDue)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures Footer */}
              <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                  <div className="border-t border-stone-400 pt-2 font-bold text-stone-800">
                    Authorized Accounts Officer
                  </div>
                  <p className="text-[10px] text-stone-400">For {settings.storeName || 'Karakoram Store'}</p>
                </div>
                <div>
                  <div className="border-t border-stone-400 pt-2 font-bold text-stone-800">
                    Supplier / Receiver's Signature
                  </div>
                  <p className="text-[10px] text-stone-400">{supplierName}</p>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: 80mm THERMAL RECEIPT */}
          {printMode === 'thermal' && (
            <div className="max-w-[320px] mx-auto font-mono text-xs text-stone-900 leading-tight space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-stone-400 space-y-1">
                <p className="font-bold text-sm uppercase tracking-wider">{settings.storeName || 'KARAKORAM STORE'}</p>
                <p className="text-[10px] text-stone-500">SUPPLIER PAYMENT RECEIPT</p>
                <p className="text-[10px]">{paymentDate}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <p>SUPPLIER: <strong>{supplierName}</strong></p>
                <p>BILL REF: {purchase?.reference || 'N/A'}</p>
                <p>METHOD: {paymentMethod.toUpperCase()}</p>
                {paymentRef && <p>TRX REF: {paymentRef}</p>}
              </div>

              <div className="py-2 border-t border-b border-dashed border-stone-400 space-y-1">
                <div className="flex justify-between">
                  <span>BILL TOTAL:</span>
                  <span>{fmtPKR(totalBill)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>AMOUNT PAID:</span>
                  <span>{fmtPKR(paymentAmount)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200">
                  <span>BALANCE DUE:</span>
                  <span>{fmtPKR(balanceDue)}</span>
                </div>
              </div>

              <div className="text-center pt-4 space-y-4 text-[10px]">
                <div className="border-t border-stone-300 pt-1">
                  Receiver Signature: __________________
                </div>
                <p className="text-[9px] text-stone-400">Thank you for your business & partnership</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

