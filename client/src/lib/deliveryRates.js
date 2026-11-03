const normalizeLocation = (value) =>
  String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,-]/g, ' ')
    .replace(/\s+/g, ' ');

export function getDeliveryRate(settings, city, province) {
  const normalizedCity = normalizeLocation(city);
  const normalizedProvince = normalizeLocation(province);
  const zone = (settings.deliveryZones || []).find((candidate) => {
    if (!candidate.enabled) return false;
    const cities = (candidate.cities || []).map(normalizeLocation).filter(Boolean);
    const provinces = (candidate.provinces || []).map(normalizeLocation).filter(Boolean);
    const cityMatches = cities.length > 0 && cities.includes(normalizedCity);
    const provinceMatches = provinces.length > 0 && provinces.includes(normalizedProvince);
    return cities.length > 0 && provinces.length > 0
      ? cityMatches && provinceMatches
      : cityMatches || provinceMatches;
  });

  if (zone) {
    return {
      shippingFee: zone.shippingFee,
      zoneName: zone.name,
      minDays: zone.minDays,
      maxDays: zone.maxDays,
    };
  }

  return {
    shippingFee: settings.shippingFee ?? 200,
    zoneName: '',
    minDays: settings.deliveryMinDays ?? 2,
    maxDays: settings.deliveryMaxDays ?? 5,
  };
}
