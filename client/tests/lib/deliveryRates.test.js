import { describe, expect, it } from 'vitest';
import { getDeliveryRate } from '../../src/lib/deliveryRates';

describe('getDeliveryRate', () => {
  const settings = {
    shippingFee: 200,
    deliveryMinDays: 2,
    deliveryMaxDays: 5,
    deliveryZones: [
      {
        id: 'gb',
        name: 'Gilgit-Baltistan',
        cities: ['Karimabad'],
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
        cities: ['Quetta'],
        provinces: ['Balochistan'],
        shippingFee: 0,
        minDays: 1,
        maxDays: 1,
        enabled: false,
      },
    ],
  };

  it('uses the matching city and province zone', () => {
    expect(getDeliveryRate(settings, ' karimabad ', 'gilgit baltistan'))
      .toEqual({ shippingFee: 350, zoneName: 'Gilgit-Baltistan', minDays: 1, maxDays: 3 });
  });

  it('uses province-only zones and skips disabled zones', () => {
    expect(getDeliveryRate(settings, 'Lahore', 'Punjab'))
      .toMatchObject({ shippingFee: 250, zoneName: 'Punjab' });
    expect(getDeliveryRate(settings, 'Quetta', 'Balochistan'))
      .toMatchObject({ shippingFee: 200, zoneName: '' });
  });

  it('uses flat fee and default ETA for an unmatched address', () => {
    expect(getDeliveryRate(settings, 'Skardu', 'Gilgit-Baltistan'))
      .toMatchObject({ shippingFee: 200, minDays: 2, maxDays: 5, zoneName: '' });
  });
});
