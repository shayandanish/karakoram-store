import { Router } from 'express';
import { sendPendingPaymentReminders } from '../services/paymentReminderService.js';

const router = Router();

/**
 * Handler for payment reminder cron trigger.
 * Triggered periodically by Vercel Cron (or manual trigger).
 * Authenticated via Bearer CRON_SECRET if configured in environment.
 */
export const handlePaymentRemindersCron = async (req, res, next) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers?.authorization;
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET' });
      }
    }

    const result = await sendPendingPaymentReminders();
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

router.all('/payment-reminders', handlePaymentRemindersCron);

export default router;
