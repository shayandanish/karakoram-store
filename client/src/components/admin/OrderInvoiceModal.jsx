import { useState } from 'react';
import { fmtPKR, fmtDate } from '../../lib/utils';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import SiteLogoMark from '../ui/SiteLogoMark';

/**
 * OrderInvoiceModal Component
 * Supports both standard A4 Tax Invoice / Packing Slip and 80mm POS Thermal Receipt modes.
 * Prints cleanly without headers, backgrounds, or UI chrome using tailored CSS media print styles.
 */
export default function OrderInvoiceModal({ order, onClose }) {
  const { settings } = useSiteSettings();
  const [printMode, setPrintMode] = useState(order?.source === 'pos' ? 'thermal' : 'a4'); // 'a4' | 'thermal'

  if (!order) return null;

  const orderId = order.orderId || order._id;
  const customerName = order.shippingAddress?.name || order.guestName || 'Customer';
  const customerPhone = order.shippingAddress?.phone || order.guestPhone || '—';
  const customerEmail = order.guestEmail || order.user?.email || '—';
  const address = order.shippingAddress;
  const fullAddress = address
    ? [address.street, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(', ')
    : 'In-store Walk-in';

  const orderDate = fmtDate(order.createdAt || new Date());
  const paymentMethodLabel = {
    COD: 'Cash on Delivery (COD)',
    cash: 'Cash (POS Walk-in)',
    card: 'Credit/Debit Card (POS)',
    easypaisa: 'Easypaisa',
    jazzcash: 'JazzCash',
    bank_transfer: 'Direct Bank Transfer',
    other: 'Cash / Other',
  }[order.paymentMethod] || order.paymentMethod;

  const items = order.items || [];
  const subtotal = order.subtotal ?? items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = order.shippingFee ?? 0;
  const discount = order.discount ?? 0;
  const total = order.total ?? (subtotal + shippingFee - discount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="invoice-print-root" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Outer Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* ── Top Bar (Hidden in Print) ── */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-apricot-700 bg-apricot-50 px-2.5 py-1 rounded-md border border-apricot-200">
              Printable Invoice
            </span>
            <span className="text-xs font-mono font-bold text-mountain-900">
              #{orderId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector */}
            <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintMode('a4')}
                className={`px-3 py-1.5 rounded-md transition ${printMode === 'a4' ? 'bg-mountain-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                A4 / Packing Slip
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`px-3 py-1.5 rounded-md transition ${printMode === 'thermal' ? 'bg-mountain-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                80mm Thermal Receipt
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-apricot-600 px-4 py-2 text-xs font-bold text-white hover:bg-apricot-700 transition shadow-xs cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
              aria-label="Close invoice"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable Printable Area ── */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 print:p-0 print:overflow-visible">

          {/* ══════════════════════════════════════════════════════════
              FORMAT 1: A4 PACKING SLIP & TAX INVOICE
          ══════════════════════════════════════════════════════════ */}
          {printMode === 'a4' && (
            <div className="max-w-3xl mx-auto space-y-6 text-stone-800 print:text-black">
              {/* Header: Company & Invoice Info */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-stone-200 pb-6 print:border-black">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SiteLogoMark size="md" />
                    <span className="text-xl font-bold font-display text-mountain-900 tracking-tight print:text-black">
                      {settings.storeName}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 max-w-sm pt-1 print:text-stone-700">
                    Authentic Himalayan & Karakoram dry fruits, wild herbs, pure shilajit, and artisan crafts.
                  </p>
                  <p className="text-xs text-stone-600 print:text-black">
                    Gilgit-Baltistan, Pakistan · WhatsApp: +{settings.whatsappNumber || '923495144486'}
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1 bg-stone-50 p-3 sm:bg-transparent sm:p-0 rounded-xl">
                  <h2 className="text-2xl font-black font-display uppercase tracking-wider text-mountain-900 print:text-black">
                    INVOICE
                  </h2>
                  <p className="text-xs text-stone-500 font-mono print:text-black">
                    Invoice #: <strong className="text-stone-900">{orderId}</strong>
                  </p>
                  <p className="text-xs text-stone-500 print:text-black">
                    Date: <strong className="text-stone-900">{orderDate}</strong>
                  </p>
                  <div className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 border print:border-black border-stone-300">
                    Status: <span className="text-mountain-900">{order.paymentStatus?.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Billed To / Shipped To Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-stone-50/60 p-4 rounded-xl border border-stone-100 print:bg-white print:border-stone-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Customer / Billed To
                  </span>
                  <strong className="text-sm font-bold text-mountain-900 block print:text-black">{customerName}</strong>
                  <p className="text-stone-600 mt-0.5 print:text-black">Phone: {customerPhone}</p>
                  {customerEmail !== '—' && <p className="text-stone-600 print:text-black">Email: {customerEmail}</p>}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Shipping & Delivery Details
                  </span>
                  <p className="text-stone-700 font-medium leading-relaxed print:text-black">{fullAddress}</p>
                  <div className="mt-2 text-stone-600 print:text-black flex flex-wrap gap-x-4">
                    <span>Payment: <strong>{paymentMethodLabel}</strong></span>
                    {order.shipment?.courierName && (
                      <span>Courier: <strong>{order.shipment.courierName}</strong></span>
                    )}
                    {order.shipment?.trackingId && (
                      <span>Tracking: <strong>{order.shipment.trackingId}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="overflow-hidden border border-stone-200 rounded-xl print:border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/90 text-stone-700 font-bold uppercase tracking-wider border-b border-stone-200 print:bg-stone-200 print:border-black">
                    <tr>
                      <th className="py-2.5 px-3">Item / Description</th>
                      <th className="py-2.5 px-3">Variant / Size</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 print:divide-black">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 font-semibold text-mountain-900 print:text-black">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-stone-600 print:text-black">
                          {item.variantLabel || 'Standard'}
                        </td>
                        <td className="py-3 px-3 text-right text-stone-700 print:text-black">
                          {fmtPKR(item.price)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-stone-900 print:text-black">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-mountain-900 print:text-black">
                          {fmtPKR(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 space-y-1.5 text-xs bg-stone-50 p-4 rounded-xl border border-stone-100 print:bg-white print:border-stone-200">
                  <div className="flex justify-between text-stone-600 print:text-black">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{fmtPKR(subtotal)}</span>
                  </div>
                  {shippingFee > 0 && (
                    <div className="flex justify-between text-stone-600 print:text-black">
                      <span>Delivery / Shipping:</span>
                      <span className="font-semibold">{fmtPKR(shippingFee)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 print:text-black">
                      <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                      <span className="font-semibold">−{fmtPKR(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-mountain-900 border-t border-stone-200 pt-2 print:border-black print:text-black">
                    <span>Grand Total:</span>
                    <span className="text-base text-apricot-700 print:text-black">{fmtPKR(total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-stone-200 pt-4 text-center text-[11px] text-stone-500 print:text-stone-700 print:border-stone-300">
                <p className="font-semibold text-stone-700 print:text-black">Thank you for supporting traditional Karakoram mountain growers and artisans!</p>
                <p className="mt-0.5">For inquiries or order assistance, WhatsApp us with your Invoice # at +{settings.whatsappNumber || '923495144486'}.</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              FORMAT 2: 80MM POS THERMAL RECEIPT
          ══════════════════════════════════════════════════════════ */}
          {printMode === 'thermal' && (
            <div className="max-w-[320px] mx-auto p-4 bg-white border border-stone-200 rounded-xl font-mono text-xs text-black leading-relaxed space-y-3 print:border-none print:p-0 print:max-w-none">
              {/* Thermal Header */}
              <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-3">
                <h3 className="font-bold text-base tracking-wide uppercase font-sans">
                  {settings.storeName}
                </h3>
                <p className="text-[10px] text-stone-600">Pure Mountain Harvest & Crafts</p>
                <p className="text-[10px]">WhatsApp: +{settings.whatsappNumber || '923495144486'}</p>
                <div className="border-t border-dashed border-stone-200 pt-1 text-[11px] text-left">
                  <div className="flex justify-between">
                    <span>INV: #{orderId.slice(-8)}</span>
                    <span>{orderDate}</span>
                  </div>
                  <div>Cust: {customerName}</div>
                  <div>Pay: {paymentMethodLabel}</div>
                </div>
              </div>

              {/* Thermal Item Rows */}
              <div className="border-b border-dashed border-stone-300 pb-3 space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold border-b border-stone-200 pb-1">
                  <span>ITEM</span>
                  <span>TOTAL</span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-semibold truncate">{item.name}</div>
                    <div className="flex justify-between text-[10px] text-stone-600">
                      <span>{item.variantLabel} ({item.quantity} × {item.price})</span>
                      <span className="font-bold text-black">{fmtPKR(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Thermal Totals */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-stone-300 pb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{fmtPKR(subtotal)}</span>
                </div>
                {shippingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>{fmtPKR(shippingFee)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>−{fmtPKR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-300">
                  <span>TOTAL:</span>
                  <span>{fmtPKR(total)}</span>
                </div>
              </div>

              {/* Thermal Footer */}
              <div className="text-center text-[10px] text-stone-600 pt-1">
                <p>Thank you for your purchase!</p>
                <p className="font-mono">karakoramstore.vercel.app</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

