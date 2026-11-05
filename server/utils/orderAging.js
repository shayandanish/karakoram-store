const hoursAgo = (hours, now) => new Date(now.getTime() - hours * 60 * 60 * 1000);

export const getOverdueOrderFilters = (now = new Date()) => ({
  pending: {
    orderStatus: 'pending',
    createdAt: { $lte: hoursAgo(24, now) },
  },
  proof: {
    paymentStatus: 'pending',
    paymentScreenshot: { $exists: true, $nin: ['', null] },
    $or: [
      { paymentScreenshotUploadedAt: { $lte: hoursAgo(24, now) } },
      {
        $or: [
          { paymentScreenshotUploadedAt: { $exists: false } },
          { paymentScreenshotUploadedAt: null },
        ],
        createdAt: { $lte: hoursAgo(24, now) },
      },
    ],
  },
  shipment: {
    orderStatus: { $in: ['shipped', 'out_for_delivery'] },
    $or: [
      { 'shipment.lastAdminUpdateAt': { $lte: hoursAgo(72, now) } },
      {
        'shipment.lastAdminUpdateAt': { $exists: false },
        'shipment.shippedAt': { $lte: hoursAgo(72, now) },
      },
    ],
  },
});

export const ORDER_OVERDUE_HOURS = Object.freeze({ pending: 24, proof: 24, shipment: 72 });
