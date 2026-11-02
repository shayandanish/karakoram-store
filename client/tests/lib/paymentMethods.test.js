import { describe, expect, it } from 'vitest';
import { getOrderPaymentDetails } from '../../src/lib/paymentMethods';

describe('getOrderPaymentDetails', () => {
  it('uses the saved payment details for an order', () => {
    expect(
      getOrderPaymentDetails(
        {
          paymentMethod: 'jazzcash',
          paymentDetails: {
            name: 'JazzCash wallet',
            accountName: 'Store Account',
            accountNumber: '03001234567',
            instructions: 'Send the exact total.',
          },
        },
        { paymentMethods: [] }
      )
    ).toEqual({
      id: 'jazzcash',
      name: 'JazzCash wallet',
      accountName: 'Store Account',
      accountNumber: '03001234567',
      instructions: 'Send the exact total.',
      requiresPrepayment: true,
    });
  });

  it('marks cash on delivery as not requiring prepayment', () => {
    expect(getOrderPaymentDetails({ paymentMethod: 'COD' }).requiresPrepayment).toBe(false);
  });

  it('uses current settings for historical orders without a snapshot', () => {
    expect(
      getOrderPaymentDetails(
        { paymentMethod: 'bank_transfer' },
        {
          paymentMethods: [
            {
              id: 'bank_transfer',
              name: 'Bank transfer',
              accountName: 'Karakoram Store',
              accountNumber: 'PK00TEST',
              instructions: 'Include your order ID.',
            },
          ],
        }
      )
    ).toMatchObject({
      name: 'Bank transfer',
      accountNumber: 'PK00TEST',
      instructions: 'Include your order ID.',
    });
  });
});
