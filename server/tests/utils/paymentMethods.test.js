import { describe, expect, it } from 'vitest';
import {
  getEnabledPaymentMethod,
  resolvePaymentMethods,
} from '../../utils/paymentMethods.js';

describe('payment method settings', () => {
  it('retains legacy setting behavior before methods are configured', () => {
    const methods = resolvePaymentMethods({
      easypaisaAccountName: 'Legacy Store',
      easypaisaAccountNumber: '03001234567',
      enableEasypaisa: false,
      enableCod: true,
    });

    expect(methods.find(({ id }) => id === 'easypaisa')).toMatchObject({
      enabled: false,
      accountName: 'Legacy Store',
      accountNumber: '03001234567',
    });
    expect(methods.find(({ id }) => id === 'cod').enabled).toBe(true);
  });

  it('preserves intentionally blank configured account details', () => {
    const methods = resolvePaymentMethods({
      easypaisaAccountName: 'Old Account',
      easypaisaAccountNumber: '03001234567',
      paymentMethods: [
        {
          id: 'easypaisa',
          name: 'Easypaisa',
          enabled: true,
          accountName: '',
          accountNumber: '',
          instructions: 'Contact us for account details.',
        },
      ],
    });

    expect(methods.find(({ id }) => id === 'easypaisa')).toMatchObject({
      accountName: '',
      accountNumber: '',
      instructions: 'Contact us for account details.',
    });
  });

  it('normalizes cash-on-delivery IDs when checking availability', () => {
    expect(getEnabledPaymentMethod({ enableCod: true }, 'COD')?.id).toBe('cod');
    expect(getEnabledPaymentMethod({ enableCod: false }, 'COD')).toBeNull();
  });
});
