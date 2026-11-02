export const PAYMENT_METHOD_DEFAULTS = [
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    enabled: true,
    accountName: '',
    accountNumber: '',
    instructions: 'Transfer the order total and provide your transaction ID or payment screenshot.',
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    enabled: false,
    accountName: '',
    accountNumber: '',
    instructions: 'Transfer the order total and provide your transaction ID or payment screenshot.',
  },
  {
    id: 'bank_transfer',
    name: 'Bank transfer',
    enabled: false,
    accountName: '',
    accountNumber: '',
    instructions: '',
  },
  {
    id: 'cod',
    name: 'Cash on delivery',
    enabled: true,
    accountName: '',
    accountNumber: '',
    instructions: 'Pay the courier in cash when your order is delivered.',
  },
  {
    id: 'other',
    name: 'Other payment',
    enabled: false,
    accountName: '',
    accountNumber: '',
    instructions: '',
  },
];

export function resolvePaymentMethods(settings = {}) {
  const configuredMethods = Array.isArray(settings.paymentMethods)
    ? settings.paymentMethods
    : [];
  const hasConfiguredMethods = configuredMethods.length > 0;

  return PAYMENT_METHOD_DEFAULTS.map((defaults) => {
    const configured = configuredMethods.find((method) => method.id === defaults.id);
    const legacyEnabled = {
      easypaisa: settings.enableEasypaisa !== false,
      cod: settings.enableCod !== false,
      bank_transfer: Boolean(settings.enableBankTransfer),
    };

    return {
      ...defaults,
      ...(configured || {}),
      id: defaults.id,
      enabled: hasConfiguredMethods
        ? Boolean(configured?.enabled)
        : (legacyEnabled[defaults.id] ?? defaults.enabled),
      accountName: configured
        ? configured.accountName || ''
        : defaults.id === 'easypaisa'
          ? settings.easypaisaAccountName || ''
          : '',
      accountNumber: configured
        ? configured.accountNumber || ''
        : defaults.id === 'easypaisa'
          ? settings.easypaisaAccountNumber || ''
          : '',
      instructions: configured
        ? configured.instructions || ''
        : defaults.id === 'bank_transfer'
          ? settings.bankTransferDetails || ''
          : defaults.instructions,
    };
  });
}

export function getEnabledPaymentMethod(settings, methodId) {
  const normalizedMethodId = String(methodId || '').toLowerCase();
  const method = resolvePaymentMethods(settings).find(
    (candidate) => candidate.id === normalizedMethodId && candidate.enabled
  );
  return method || null;
}
