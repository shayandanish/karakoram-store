// ── Slim announcement bar ────────────────────────────────────
// Messages are derived from live store settings only, so nothing here
// promises a discount or offer the shop does not actually run.
import { useSiteSettings } from '../../hooks/useSiteSettings';

export default function AnnouncementBar() {
  const { settings, paymentMethods } = useSiteSettings();

  const minDays = Math.max(1, Number(settings.deliveryMinDays) || 2);
  const maxDays = Math.max(minDays, Number(settings.deliveryMaxDays) || 5);

  const enabledPayments = paymentMethods.filter((method) => method.enabled);
  const hasCashOnDelivery = enabledPayments.some((method) => method.id === 'cod');
  const otherPaymentNames = enabledPayments
    .filter((method) => method.id !== 'cod' && method.name)
    .map((method) => method.name);

  const paymentMessage = hasCashOnDelivery
    ? 'Cash on delivery available'
    : otherPaymentNames.length === 1
      ? `${otherPaymentNames[0]} accepted`
      : otherPaymentNames.length > 1
        ? `${otherPaymentNames.slice(0, 2).join(' & ')} accepted`
        : '';

  const sourcingMessage = /gilgit[\s-]?baltistan/i.test(
    `${settings.storeDescription} ${settings.storeTagline}`
  )
    ? 'Sourced from Gilgit-Baltistan'
    : '';

  const messages = [
    `Delivery in ${minDays}–${maxDays} working days`,
    paymentMessage,
    sourcingMessage,
  ].filter(Boolean);

  return (
    <div className="bg-mountain-900 text-cream-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-[11px] font-medium leading-snug tracking-wide sm:px-6 lg:px-8">
        {messages.map((message, index) => (
          <span
            key={message}
            className={index === 0 ? 'inline-flex items-center gap-4' : 'hidden items-center gap-4 sm:inline-flex'}
          >
            {index > 0 && <span aria-hidden="true" className="h-3 w-px bg-cream-100/25" />}
            <span>{message}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
