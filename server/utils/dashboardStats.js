const REVENUE_PERIOD_DAYS = {
  '7d': 7,
  '30d': 30,
};

export function getRevenueStartDate(period, now = new Date()) {
  if (period === 'all') return null;
  const days = REVENUE_PERIOD_DAYS[period];
  if (!days) throw new RangeError('Revenue period must be all, 7d, or 30d');

  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return start;
}
