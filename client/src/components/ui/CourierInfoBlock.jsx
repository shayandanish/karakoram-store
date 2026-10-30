import { useState } from 'react';
import { fmtDate } from '../../lib/utils';

export default function CourierInfoBlock({ shipment }) {
  const [copiedCn, setCopiedCn] = useState(false);

  if (!shipment || (!shipment.courierName && !shipment.trackingId)) {
    return null;
  }

  const handleCopyCn = () => {
    if (!shipment.trackingId) return;
    navigator.clipboard?.writeText(shipment.trackingId);
    setCopiedCn(true);
    setTimeout(() => setCopiedCn(false), 2000);
  };

  const estDate = shipment.estimatedDelivery
    ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-sky-50/80 to-emerald-50/90 border border-sky-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-sky-200 flex items-center justify-center text-lg">
            🚚
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">Courier Dispatch Logistics</span>
            <h4 className="font-display font-bold text-base text-mountain-900 leading-tight">
              {shipment.courierName || 'Assigned Courier Service'}
            </h4>
          </div>
        </div>

        {shipment.trackingUrl && (
          <a
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-mountain-900 hover:bg-mountain-800 text-white text-xs font-bold transition shadow-xs self-start sm:self-auto"
          >
            <span>Track on Courier Site</span>
            <span>&rarr;</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-3.5 text-xs">
        {shipment.trackingId && (
          <div className="bg-white/80 rounded-xl p-2.5 border border-sky-100">
            <span className="text-mountain-400 font-medium block text-[11px]">Consignment Number (CN)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-sm text-mountain-900 tracking-wider">
                {shipment.trackingId}
              </span>
              <button
                type="button"
                onClick={handleCopyCn}
                className="text-[10px] font-semibold text-apricot-600 hover:text-apricot-700 bg-apricot-50 px-2 py-0.5 rounded cursor-pointer transition"
              >
                {copiedCn ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {estDate && (
          <div className="bg-white/80 rounded-xl p-2.5 border border-sky-100">
            <span className="text-mountain-400 font-medium block text-[11px]">Estimated Delivery</span>
            <p className="font-bold text-sm text-emerald-800 mt-0.5 flex items-center gap-1">
              <span>📅</span>
              <span>{estDate}</span>
            </p>
          </div>
        )}

        {shipment.shippedAt && (
          <div className="bg-white/80 rounded-xl p-2.5 border border-sky-100">
            <span className="text-mountain-400 font-medium block text-[11px]">Dispatch Date</span>
            <p className="font-semibold text-mountain-800 mt-0.5">
              {fmtDate(shipment.shippedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

