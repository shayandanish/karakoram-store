import { sendOrderNotificationEmail } from './mailer.js';
import { sendWhatsAppNotification } from './whatsapp.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import SiteSettings from '../models/SiteSettings.js';

/**
 * Checks if a notification of the given type and event was already sent recently (within cooldownMs).
 * Prevents accidental duplicate notifications on rapid status clicks or re-renders.
 */
function isDuplicateNotification(order, type, event, cooldownMs = 15 * 60 * 1000) {
  if (!order.notificationLog || !order.notificationLog.length) return false;

  const now = Date.now();
  return order.notificationLog.some((log) => {
    if (log.type === type && log.event === event && log.success) {
      const logTime = new Date(log.sentAt).getTime();
      if (now - logTime < cooldownMs) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Dispatches notifications (Email & WhatsApp) for an order lifecycle event.
 * Automatically logs all results into `order.notificationLog` and saves to DB.
 *
 * @param {import('../models/Order.js').default | Object} orderInput - Order document or plain object
 * @param {string} event - Event type ('order_placed', 'confirmed', 'processing', 'packed', 'shipped', 'shipment_updated', 'out_for_delivery', 'delivered', 'cancelled', 'returned')
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - Bypass cooldown / duplicate check
 * @param {string} [options.channel='all'] - 'all' | 'email' | 'whatsapp'
 * @returns {Promise<{ emailResult?: any, whatsappResult?: any }>}
 */
export async function dispatchOrderNotifications(orderInput, event, options = {}) {
  const { force = false, channel = 'all' } = options;
  const siteSettings = await SiteSettings.getSingleton();

  // Ensure we have a Mongoose document or find it
  let order = orderInput;
  if (!order.save || typeof order.save !== 'function') {
    const fetched = await Order.findById(order._id);
    if (fetched) {
      order = fetched;
    }
  }

  const results = {};
  const logsToPush = [];

  // Dynamically resolve recipient email (guest checkout or registered user)
  let recipientEmail = order.guestEmail;
  if (!recipientEmail && order.user) {
    if (typeof order.user === 'object' && order.user.email) {
      recipientEmail = order.user.email;
    } else {
      try {
        const u = await User.findById(order.user).select('email name');
        if (u?.email) recipientEmail = u.email;
      } catch (err) {
        console.warn('[NotificationService] Could not resolve user email:', err.message);
      }
    }
  }

  const recipientPhone = order.whatsappPhone || order.shippingAddress?.phone || order.guestPhone;

  // ── 1. Email Notification ──────────────────────────────────────────
  if (channel === 'all' || channel === 'email') {
    if (!siteSettings.enableCustomerEmail) {
      results.emailResult = { skipped: true, reason: 'Customer order emails are disabled in store settings' };
    } else if (!recipientEmail) {
      results.emailResult = { skipped: true, reason: 'No customer email address is available' };
    } else {
      const alreadySent = !force && isDuplicateNotification(order, 'email', event);
      if (alreadySent) {
      console.log(`[NotificationService] Skipping duplicate email for order ${order._id} (${event})`);
      results.emailResult = { skipped: true, reason: 'Duplicate prevention' };
      } else {
        const emailRes = await sendOrderNotificationEmail(order, event, { email: recipientEmail });
        results.emailResult = emailRes;
        logsToPush.push({
          type: 'email',
          event,
          recipient: recipientEmail,
          sentAt: new Date(),
          success: emailRes.success,
          error: emailRes.error || '',
          messageId: emailRes.messageId || '',
        });
      }
    }
  }

  // ── 2. WhatsApp Notification ─────────────────────────────────────────
  if (channel === 'all' || channel === 'whatsapp') {
    if (!siteSettings.enableCustomerWhatsApp) {
      results.whatsappResult = { skipped: true, reason: 'Customer WhatsApp notifications are disabled in store settings' };
    } else if (order.whatsappConsent !== true) {
      results.whatsappResult = { skipped: true, reason: 'Customer did not opt in to WhatsApp notifications' };
    } else {
      const alreadySent = !force && isDuplicateNotification(order, 'whatsapp', event);
      if (alreadySent) {
        results.whatsappResult = { skipped: true, reason: 'Duplicate prevention' };
      } else {
        const whatsappRes = await sendWhatsAppNotification(order, event);
        results.whatsappResult = whatsappRes;
        logsToPush.push({
          type: 'whatsapp',
          event,
          recipient: recipientPhone || '',
          sentAt: new Date(),
          success: whatsappRes.success === true,
          error: whatsappRes.error || '',
          messageId: whatsappRes.messageId || '',
        });
      }
    }
  }

  // Persist notification log into the order document
  if (logsToPush.length > 0 && order._id) {
    try {
      await Order.findByIdAndUpdate(order._id, {
        $push: { notificationLog: { $each: logsToPush } },
      });
    } catch (saveErr) {
      console.error('[NotificationService] Failed to record notificationLog in DB:', saveErr);
    }
  }

  return results;
}

