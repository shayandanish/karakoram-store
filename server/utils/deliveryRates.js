const normalizeLocation = (value) =>
  String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,-]/g, ' ')
    .replace(/\s+/g, ' ');

export function resolveDeliveryRate(settings, address) {
  const city = normalizeLocation(address?.city);
  const province = normalizeLocation(address?.province);
  const zone = (settings.deliveryZones || []).find((candidate) => {
    if (!candidate.enabled) return false;
    const cities = (candidate.cities || []).map(normalizeLocation).filter(Boolean);
    const provinces = (candidate.provinces || []).map(normalizeLocation).filter(Boolean);
    const cityMatches = cities.length > 0 && cities.includes(city);
    const provinceMatches = provinces.length > 0 && provinces.includes(province);
    return cities.length > 0 && provinces.length > 0
      ? cityMatches && provinceMatches
      : cityMatches || provinceMatches;
  });

  if (zone) {
    return {
      shippingCost: zone.shippingFee,
      zoneName: zone.name,
      minDays: zone.minDays,
      maxDays: zone.maxDays,
    };
  }

  return {
    shippingCost: Number.isFinite(settings.shippingFee) ? settings.shippingFee : 200,
    zoneName: '',
    minDays: Number.isInteger(settings.deliveryMinDays) ? settings.deliveryMinDays : 2,
    maxDays: Number.isInteger(settings.deliveryMaxDays) ? settings.deliveryMaxDays : 5,
  };
}
