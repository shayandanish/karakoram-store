import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { handlePaymentRemindersCron } from '../../routes/cronRoutes.js';
import * as paymentService from '../../services/paymentReminderService.js';

vi.mock('../../services/paymentReminderService.js', () => ({
  sendPendingPaymentReminders: vi.fn().mockResolvedValue({ checkedCount: 5, sentCount: 2 }),
}));

describe('handlePaymentRemindersCron', () => {
  let req, res, next;
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test_secret_123';
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    vi.clearAllMocks();
  });

  it('rejects requests with missing Authorization header when CRON_SECRET is set', async () => {
    await handlePaymentRemindersCron(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid CRON_SECRET/i) }));
  });

  it('rejects requests with mismatched Bearer token', async () => {
    req.headers.authorization = 'Bearer wrong_token';
    await handlePaymentRemindersCron(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('executes reminder scan and returns counts when Bearer token matches', async () => {
    req.headers.authorization = 'Bearer test_secret_123';
    await handlePaymentRemindersCron(req, res, next);

    expect(paymentService.sendPendingPaymentReminders).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      checkedCount: 5,
      sentCount: 2,
    }));
  });
});
