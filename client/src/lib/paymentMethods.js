const PAYMENT_METHOD_LABELS = {
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  bank_transfer: 'Bank transfer',
  cod: 'Cash on delivery',
  other: 'Other payment',
};

export function getOrderPaymentDetails(order, settings = {}) {
  const methodId = String(order?.paymentMethod || 'easypaisa').toLowerCase();
  const configured = settings.paymentMethods?.find((method) => method.id === methodId);
  const snapshot = order?.paymentDetails;
  const hasSnapshot = snapshot && Object.values(snapshot).some(Boolean);

  return {
    id: methodId,
    name:
      (hasSnapshot && snapshot.name) ||
      configured?.name ||
      PAYMENT_METHOD_LABELS[methodId] ||
      methodId,
    accountName: hasSnapshot ? snapshot.accountName || '' : configured?.accountName || '',
    accountNumber: hasSnapshot ? snapshot.accountNumber || '' : configured?.accountNumber || '',
    instructions: hasSnapshot
      ? snapshot.instructions || ''
      : configured?.instructions || '',
    requiresPrepayment: methodId !== 'cod',
  };
}
