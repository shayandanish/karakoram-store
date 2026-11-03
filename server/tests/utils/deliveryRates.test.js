import { describe, expect, it } from 'vitest';
import { resolveDeliveryRate } from '../../utils/deliveryRates.js';

describe('resolveDeliveryRate', () => {
  const settings = {
    shippingFee: 200,
    deliveryMinDays: 2,
    deliveryMaxDays: 5,
    deliveryZones: [
      {
        id: 'gb',
        name: 'Gilgit-Baltistan',
        cities: ['Gilgit', 'Karimabad'],
        provinces: ['Gilgit-Baltistan'],
        shippingFee: 350,
        minDays: 1,
        maxDays: 3,
        enabled: true,
      },
      {
        id: 'punjab',
        name: 'Punjab',
        cities: [],
        provinces: ['Punjab'],
        shippingFee: 250,
        minDays: 3,
        maxDays: 5,
        enabled: true,
      },
      {
        id: 'disabled',
        name: 'Disabled',
        cities: ['Lahore'],
        provinces: [],
        shippingFee: 0,
        minDays: 1,
        maxDays: 1,
        enabled: false,
      },
    ],
  };

  it('matches city and province without case or punctuation sensitivity', () => {
    expect(resolveDeliveryRate(settings, {
      city: ' karimabad ',
      province: 'gilgit baltistan',
    })).toMatchObject({
      shippingCost: 350,
      zoneName: 'Gilgit-Baltistan',
      minDays: 1,
      maxDays: 3,
    });
  });

  it('matches province-only zones', () => {
    expect(resolveDeliveryRate(settings, { city: 'Lahore', province: 'Punjab' }))
      .toMatchObject({ shippingCost: 250, zoneName: 'Punjab' });
  });

  it('uses the flat fee and default estimate if no active zone matches', () => {
    expect(resolveDeliveryRate(settings, { city: 'Quetta', province: 'Balochistan' }))
      .toMatchObject({ shippingCost: 200, zoneName: '', minDays: 2, maxDays: 5 });
  });
});
