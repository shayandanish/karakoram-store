import Order from '../models/Order.js';
import User from '../models/User.js';
import { dispatchOrderNotifications } from '../utils/notificationService.js';

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REMINDER_COUNT = 5; // Up to 5 consecutive daily reminders
const SCHEDULER_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every 1 hour

/**
 * Checks database for orders with pending payment that haven't received
 * a reminder in the last 24 hours. Once paymentStatus becomes 'paid' or
 * orderStatus becomes 'cancelled', no further emails are ever sent.
 *
 * @returns {Promise<{ checkedCount: number, sentCount: number }>}
 */
export async function sendPendingPaymentReminders() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - REMINDER_INTERVAL_MS);

    // Find orders where:
    // 1. Payment is strictly pending (if paid, excluded automatically)
    // 2. Order is not cancelled, delivered, or returned
    // 3. Order was placed at least 24 hours ago
    // 4. Last reminder was either never sent or was sent > 24 hours ago
    // 5. Has not exceeded maximum reminder threshold
    const pendingOrders = await Order.find({
      paymentStatus: 'pending',
      orderStatus: { $nin: ['cancelled', 'delivered', 'returned'] },
      createdAt: { $lte: twentyFourHoursAgo },
      $or: [
        { lastPaymentReminderAt: null },
        { lastPaymentReminderAt: { $exists: false } },
        { lastPaymentReminderAt: { $lte: twentyFourHoursAgo } },
      ],
      $and: [
        {
          $or: [
            { paymentReminderCount: { $exists: false } },
            { paymentReminderCount: { $lt: MAX_REMINDER_COUNT } },
          ],
        },
      ],
    });

    if (!pendingOrders.length) {
      return { checkedCount: 0, sentCount: 0 };
    }

    console.log(`[PaymentReminderService] Found ${pendingOrders.length} pending order(s) due for 24-hour reminder.`);
    let sentCount = 0;

    for (const order of pendingOrders) {
      // Double check in case status changed concurrently
      if (order.paymentStatus === 'paid' || order.orderStatus === 'cancelled') {
        continue;
      }

      // Resolve recipient email
      let email = order.guestEmail;
      if (!email && order.user) {
        const u = await User.findById(order.user).select('email');
        if (u?.email) email = u.email;
      }

      if (!email) {
        console.warn(`[PaymentReminderService] Skipping order ${order.orderId}: No email found.`);
        continue;
      }

      try {
        await dispatchOrderNotifications(order, 'payment_reminder', {
          force: true,
          channel: 'email',
        });

        order.lastPaymentReminderAt = new Date();
        order.paymentReminderCount = (order.paymentReminderCount || 0) + 1;
        await order.save();

        sentCount++;
        console.log(
          `[PaymentReminderService] ✅ Sent payment reminder #${order.paymentReminderCount} to ${email} for Order ${order.orderId}`
        );
      } catch (sendErr) {
        console.error(`[PaymentReminderService] ❌ Failed to send reminder for ${order.orderId}:`, sendErr.message);
      }
    }

    return { checkedCount: pendingOrders.length, sentCount };
  } catch (err) {
    console.error('[PaymentReminderService] Error scanning pending orders:', err);
    return { checkedCount: 0, sentCount: 0, error: err.message };
  }
}

/**
 * Initializes the recurring payment reminder scheduler.
 */
export function startPaymentReminderScheduler() {
  console.log('[PaymentReminderService] Background 24-hour pending payment reminder scheduler initialized.');

  // Run initial check 15 seconds after server start
  setTimeout(() => {
    sendPendingPaymentReminders().catch((err) => {
      console.error('[PaymentReminderService] Initial scan error:', err);
    });
  }, 15000);

  // Recurring check every hour
  setInterval(() => {
    sendPendingPaymentReminders().catch((err) => {
      console.error('[PaymentReminderService] Recurring scan error:', err);
    });
  }, SCHEDULER_CHECK_INTERVAL_MS);
}
