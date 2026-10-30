import { fmtDate } from '../../lib/utils';

export const ORDER_STAGES = [
  { key: 'pending', label: 'Order Placed', icon: '📝', desc: 'Received & logged in database' },
  { key: 'confirmed', label: 'Order Confirmed', icon: '🔔', desc: 'Details verified & accepted' },
  { key: 'processing', label: 'Processing', icon: '🔄', desc: 'Sourcing authentic mountain goods' },
  { key: 'packed', label: 'Packed', icon: '📦', desc: 'Quality checked & securely packed' },
  { key: 'shipped', label: 'Shipped', icon: '🚚', desc: 'Handed over to courier with CN' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵', desc: 'Courier rider delivering today' },
  { key: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Safely arrived at destination' },
];

export const STATUS_MAP = {
  pending: { label: 'Order Placed', color: 'amber', step: 1, bg: 'bg-amber-100 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Order Confirmed', color: 'blue', step: 2, bg: 'bg-blue-100 text-blue-900 border-blue-200', dot: 'bg-blue-500' },
  processing: { label: 'Processing', color: 'indigo', step: 3, bg: 'bg-indigo-100 text-indigo-900 border-indigo-200', dot: 'bg-indigo-500' },
  packed: { label: 'Packed', color: 'purple', step: 4, bg: 'bg-purple-100 text-purple-900 border-purple-200', dot: 'bg-purple-500' },
  shipped: { label: 'Shipped', color: 'fuchsia', step: 5, bg: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200', dot: 'bg-fuchsia-500' },
  out_for_delivery: { label: 'Out for Delivery', color: 'orange', step: 6, bg: 'bg-orange-100 text-orange-900 border-orange-200', dot: 'bg-orange-500' },
  delivered: { label: 'Delivered', color: 'emerald', step: 7, bg: 'bg-emerald-100 text-emerald-900 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', color: 'rose', step: 0, bg: 'bg-rose-100 text-rose-900 border-rose-200', dot: 'bg-rose-500' },
  returned: { label: 'Returned', color: 'stone', step: 0, bg: 'bg-stone-200 text-stone-800 border-stone-300', dot: 'bg-stone-500' },
};

export default function OrderTimeline({ currentStatus = 'pending', statusHistory = [], compact = false }) {
  const normalizedStatus = (currentStatus || 'pending').toLowerCase();
  const currentStageIndex = ORDER_STAGES.findIndex((s) => s.key === normalizedStatus);

  if (normalizedStatus === 'cancelled') {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-bold text-sm">Order Cancelled</p>
          <p className="text-xs text-rose-700 mt-0.5">This order has been cancelled. If you need any assistance or refund verification, contact our support.</p>
        </div>
      </div>
    );
  }

  if (normalizedStatus === 'returned') {
    return (
      <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 text-stone-900 flex items-center gap-3">
        <span className="text-2xl">↩️</span>
        <div>
          <p className="font-bold text-sm">Order Return Processed</p>
          <p className="text-xs text-stone-600 mt-0.5">A return was recorded for this parcel. Contact our WhatsApp helpline for queries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Horizontal on Desktop, Stepper on Mobile */}
      <div className="hidden lg:grid grid-cols-7 gap-2 relative">
        {ORDER_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isUpcoming = idx > currentStageIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center text-center relative group">
              {/* Connector line */}
              {idx < ORDER_STAGES.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-1 -z-0 transition-colors ${
                    idx < currentStageIndex ? 'bg-emerald-500' : 'bg-cream-200'
                  }`}
                />
              )}

              {/* Step circle */}
              <div
                className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-apricot-500 text-white ring-4 ring-apricot-200 shadow-md animate-pulse'
                    : 'bg-cream-200 text-mountain-400'
                }`}
              >
                {isCompleted ? '✓' : stage.icon}
              </div>

              {/* Label */}
              <p
                className={`text-[11px] font-bold mt-2 leading-tight ${
                  isCurrent
                    ? 'text-apricot-600 font-extrabold'
                    : isCompleted
                    ? 'text-mountain-900'
                    : 'text-mountain-400'
                }`}
              >
                {stage.label}
              </p>
              {!compact && (
                <p className="text-[10px] text-mountain-400 mt-0.5 max-w-[90px] hidden xl:block">
                  {stage.desc}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile / Tablet Vertical Flow */}
      <div className="lg:hidden space-y-3">
        {ORDER_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isUpcoming = idx > currentStageIndex;

          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-apricot-500 text-white ring-4 ring-apricot-100 shadow-sm animate-pulse'
                      : 'bg-cream-200 text-mountain-400'
                  }`}
                >
                  {isCompleted ? '✓' : stage.icon}
                </div>
                {idx < ORDER_STAGES.length - 1 && (
                  <div
                    className={`w-0.5 h-6 my-0.5 ${
                      idx < currentStageIndex ? 'bg-emerald-500' : 'bg-cream-200'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-xs font-bold ${
                    isCurrent
                      ? 'text-apricot-600 font-extrabold'
                      : isCompleted
                      ? 'text-mountain-900'
                      : 'text-mountain-400'
                  }`}
                >
                  {stage.label}
                </p>
                <p className="text-[11px] text-mountain-500">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

