import nodemailer from 'nodemailer';
import crypto from 'crypto';

let cachedTransporter = null;

/**
 * Creates and returns a Nodemailer transporter.
 * Uses environment SMTP credentials if provided.
 * Falls back to an Ethereal test account or JSON stream transport in development.
 */
export const getTransporter = async () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 465;
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  const service = process.env.EMAIL_SERVICE;

  // Real SMTP / Service configuration
  if ((user && pass) || service || (host && user && pass)) {
    const isGmail = service?.toLowerCase() === 'gmail' || host?.includes('gmail') || user.includes('@gmail.com');
    return nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          }
        : {
            host: host || 'smtp.gmail.com',
            port,
            secure: port === 465 || process.env.SMTP_SECURE === 'true',
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          }
    );
  }

  if (process.env.VERCEL) {
    console.error(
      '[Nodemailer] CRITICAL: SMTP credentials (SMTP_USER & SMTP_PASS) are missing in Vercel environment variables! Emails cannot be sent without them.'
    );
  }

  // Development / Test fallback: create Ethereal test account so local testing works out of the box
  if (cachedTransporter) return cachedTransporter;
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log(`[Nodemailer] Using Ethereal test account: ${testAccount.user}`);
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (err) {
    console.warn(`[Nodemailer] Failed to create Ethereal account: ${err.message}. Falling back to JSON transport.`);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP string.
 */
export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Sends a 6-digit OTP verification email to the user.
 */
export const sendOtpEmail = async ({ to, otp, userName = 'Customer' }) => {
  const transporter = await getTransporter();
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    '"Karakoram Store" <noreply@karakoramstore.com>';

  const subject = `Your Verification Code: ${otp} - Karakoram Store`;
  const text = `Hello ${userName},\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification code, please ignore this email.\n\nBest regards,\nKarakoram Store Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <div style="max-width: 500px; margin: 30px auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <h2 style="color: #1a2a3a; margin-top: 0;">🏔️ Karakoram Store</h2>
    <p>Hello ${userName},</p>
    <p>Your verification code is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #f89535; text-align: center; margin: 20px 0; background: #fff8f0; padding: 12px; border-radius: 8px;">
      ${otp}
    </div>
    <p style="font-size: 13px; color: #64748b;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
  </div>
</body>
</html>`;

  return transporter.sendMail({ from, to, subject, text, html });
};

/**
 * Formats PKR currency helper
 */
function fmtPKR(num) {
  return `Rs. ${Number(num || 0).toLocaleString('en-PK')}`;
}

/**
 * Formats Date helper
 */
function fmtDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns subject & banner info based on order event
 */
function getEventMeta(event, orderId) {
  switch (event) {
    case 'payment_reminder':
      return {
        badge: 'Payment Reminder',
        badgeBg: '#fef3c7',
        badgeColor: '#b45309',
        heading: 'Action Required: Pending Payment for Order',
        subtitle: `Your items are safely reserved for Order #${orderId}. Please complete your transfer so our team can pack and dispatch your parcel.`,
        subject: `Payment Reminder: Pending Payment for #${orderId} - Karakoram Store`,
      };
    case 'order_placed':
    case 'pending':
      return {
        badge: 'Order Placed',
        badgeBg: '#fef3c7',
        badgeColor: '#92400e',
        heading: 'Thank You! Your Order has been Placed',
        subtitle: `We received your order #${orderId} and our team in Gilgit-Baltistan is preparing it.`,
        subject: `Order Confirmation: #${orderId} - Karakoram Store`,
      };
    case 'confirmed':
      return {
        badge: 'Order Confirmed',
        badgeBg: '#dbeafe',
        badgeColor: '#1e40af',
        heading: 'Your Order is Confirmed',
        subtitle: `We have verified order #${orderId}. It is now moving to our packing queue.`,
        subject: `Order Confirmed: #${orderId} - Karakoram Store`,
      };
    case 'processing':
      return {
        badge: 'Processing',
        badgeBg: '#e0e7ff',
        badgeColor: '#3730a3',
        heading: 'Your Order is in Processing',
        subtitle: `Our artisans and fulfillment team are putting together your authentic Hunza products.`,
        subject: `Order in Processing: #${orderId} - Karakoram Store`,
      };
    case 'packed':
      return {
        badge: 'Order Packed',
        badgeBg: '#f3e8ff',
        badgeColor: '#6b21a8',
        heading: 'Your Parcel is Securely Packed',
        subtitle: `Order #${orderId} has passed quality inspection and is waiting for courier pickup.`,
        subject: `Order Packed: #${orderId} - Karakoram Store`,
      };
    case 'shipped':
    case 'shipment_updated':
      return {
        badge: 'Dispatched & Shipped',
        badgeBg: '#fae8ff',
        badgeColor: '#86198f',
        heading: 'Your Package is on the Way',
        subtitle: `Your parcel has been handed over to the courier. Tracking details are below.`,
        subject: `Order Dispatched: #${orderId} - Tracking Information - Karakoram Store`,
      };
    case 'out_for_delivery':
      return {
        badge: 'Out for Delivery',
        badgeBg: '#ffedd5',
        badgeColor: '#9a3412',
        heading: 'Your Package is Out for Delivery Today',
        subtitle: `The courier rider is out to deliver your package to your doorstep today.`,
        subject: `Out for Delivery: #${orderId} - Karakoram Store`,
      };
    case 'delivered':
      return {
        badge: 'Delivered',
        badgeBg: '#dcfce7',
        badgeColor: '#166534',
        heading: 'Package Delivered Successfully',
        subtitle: `Order #${orderId} has been delivered. We hope you enjoy your Karakoram treasures!`,
        subject: `Order Delivered: #${orderId} - Karakoram Store`,
      };
    case 'cancelled':
      return {
        badge: 'Cancelled',
        badgeBg: '#ffe4e6',
        badgeColor: '#9f1239',
        heading: 'Order Cancelled',
        subtitle: `Order #${orderId} has been cancelled.`,
        subject: `Order Cancelled: #${orderId} - Karakoram Store`,
      };
    case 'returned':
      return {
        badge: 'Return Processed',
        badgeBg: '#f1f5f9',
        badgeColor: '#334155',
        heading: 'Order Return Processed',
        subtitle: `Your return request for order #${orderId} has been recorded.`,
        subject: `Return Processed: #${orderId} - Karakoram Store`,
      };
    default:
      return {
        badge: 'Order Update',
        badgeBg: '#e2e8f0',
        badgeColor: '#1e293b',
        heading: `Order Status Update: ${event}`,
        subtitle: `Your order #${orderId} status has been updated.`,
        subject: `Order Update: #${orderId} - Karakoram Store`,
      };
  }
}

/**
 * Builds HTML table for order items dynamically
 */
function buildItemsHtml(items = []) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
          <table cellspacing="0" cellpadding="0">
            <tr>
              ${item.image ? `
              <td style="padding-right: 12px; vertical-align: middle;">
                <img src="${item.image}" alt="${item.name}" width="50" height="50" style="border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; display: block;" />
              </td>` : ''}
              <td style="vertical-align: middle;">
                <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${item.name}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  ${item.variantLabel ? `Variant: ${item.variantLabel} &bull; ` : ''}Qty: ${item.quantity} &times; ${fmtPKR(item.price)}
                </div>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; font-weight: 700; color: #0f172a; font-size: 14px; white-space: nowrap;">
          ${fmtPKR(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join('');
}

/**
 * Sends a transactional order lifecycle email.
 *
 * @param {Object} order - Full order document
 * @param {string} event - Event name (order_placed, confirmed, shipped, delivered, etc.)
 * @param {Object} [recipient] - Optional override { name, email }
 */
export async function sendOrderNotificationEmail(order, event, recipient = null) {
  try {
    const transporter = await getTransporter();
    const fromAddress = (process.env.SMTP_USER || process.env.EMAIL_USER || 'inamkarim348@gmail.com').trim();
    const from = {
      name: 'Karakoram Store',
      address: fromAddress,
    };

    const targetEmail = recipient?.email || order.guestEmail || order.user?.email;
    const targetName = recipient?.name || order.shippingAddress?.name || order.guestName || 'Valued Customer';

    if (!targetEmail) {
      console.warn(`[mailer] No email address for order ${order._id} — skipping email`);
      return { success: false, error: 'No recipient email found' };
    }

    const displayOrderId = order.orderId || `#${String(order._id).slice(-8).toUpperCase()}`;
    const meta = getEventMeta(event, displayOrderId);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const trackUrl = `${clientUrl}/track-order?orderId=${encodeURIComponent(order.orderId || order._id)}&phone=${encodeURIComponent(order.shippingAddress?.phone || order.guestPhone || '')}`;

    const hasCourier = order.shipment && (order.shipment.courierName || order.shipment.trackingId);
    const estDeliveryStr = order.shipment?.estimatedDelivery
      ? new Date(order.shipment.estimatedDelivery).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2a3a 0%, #2c3e50 100%); padding: 36px 32px; text-align: center; color: #ffffff;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">
                🏔️ Karakoram Store
              </div>
              <div style="color: #f89535; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 2.5px;">
                Handcrafted Goods from Hunza & Gilgit
              </div>
            </td>
          </tr>

          <!-- Status Alert Banner -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              <span style="display: inline-block; background-color: ${meta.badgeBg}; color: ${meta.badgeColor}; font-weight: 700; font-size: 12px; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                ${meta.badge}
              </span>
              <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                ${meta.heading}
              </h1>
              <p style="margin: 0; color: #64748b; font-size: 15px;">
                ${meta.subtitle}
              </p>
            </td>
          </tr>

          <!-- Tracking Button -->
          <tr>
            <td style="padding: 12px 32px 28px 32px; text-align: center;">
              <a href="${trackUrl}" target="_blank" style="display: inline-block; background-color: #f89535; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(248, 149, 53, 0.4);">
                Track Order Online &rarr;
              </a>
            </td>
          </tr>

          ${hasCourier ? `
          <!-- Courier & Tracking Information Box -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 1.5px solid #bbf7d0; border-radius: 16px; padding: 22px;">
                <div style="font-weight: 800; color: #065f46; font-size: 15px; margin-bottom: 12px; display: flex; align-items: center;">
                  🚚 Courier Shipment Details
                </div>
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                  <tr>
                    <td style="padding: 4px 0; color: #475569; width: 40%;">Courier Company:</td>
                    <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${order.shipment.courierName || 'Pakistan Courier'}</td>
                  </tr>
                  ${order.shipment.trackingId ? `
                  <tr>
                    <td style="padding: 4px 0; color: #475569;">Consignment # (CN):</td>
                    <td style="padding: 4px 0; font-family: monospace; font-weight: 800; font-size: 14px; color: #0f172a;">${order.shipment.trackingId}</td>
                  </tr>` : ''}
                  ${estDeliveryStr ? `
                  <tr>
                    <td style="padding: 4px 0; color: #475569;">Estimated Delivery:</td>
                    <td style="padding: 4px 0; font-weight: 700; color: #047857;">${estDeliveryStr}</td>
                  </tr>` : ''}
                </table>
                ${order.shipment.trackingUrl ? `
                <div style="margin-top: 14px; text-align: left;">
                  <a href="${order.shipment.trackingUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 8px 18px; border-radius: 8px;">
                    Track on Courier Portal &rarr;
                  </a>
                </div>` : ''}
              </div>
            </td>
          </tr>` : ''}

          <!-- Order Summary Header -->
          <tr>
            <td style="padding: 0 32px 12px 32px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px;">
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                  <tr>
                    <td>
                      <span style="color: #64748b;">Order ID:</span>
                      <strong style="color: #0f172a; font-family: monospace; margin-left: 6px;">${displayOrderId}</strong>
                    </td>
                    <td style="text-align: right;">
                      <span style="color: #64748b;">Date:</span>
                      <strong style="color: #0f172a; margin-left: 6px;">${fmtDate(order.createdAt)}</strong>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 10px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0;">
                    <th style="text-align: left; padding: 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700;">Item</th>
                    <th style="text-align: right; padding: 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildItemsHtml(order.items)}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals Breakdown -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #475569;">
                <tr>
                  <td style="padding: 6px 0;">Subtotal</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${fmtPKR(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">Shipping (Nationwide Pakistan)</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${fmtPKR(order.shippingCost)}</td>
                </tr>
                ${order.discount > 0 ? `
                <tr>
                  <td style="padding: 6px 0; color: #16a34a;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #16a34a;">-${fmtPKR(order.discount)}</td>
                </tr>` : ''}
                <tr style="border-top: 2px solid #e2e8f0;">
                  <td style="padding: 14px 0; font-size: 16px; font-weight: 800; color: #0f172a;">Total Amount</td>
                  <td style="padding: 14px 0; text-align: right; font-size: 20px; font-weight: 800; color: #f89535;">${fmtPKR(order.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${order.paymentStatus !== 'paid' ? `
          <!-- Pending Payment Notice -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <div style="background-color: #fffbeb; border: 1.5px solid #fde68a; border-radius: 14px; padding: 18px 20px;">
                <div style="font-size: 14px; font-weight: 800; color: #92400e; margin-bottom: 8px;">
                  ⚠️ Payment Pending — Action Required
                </div>
                <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.6; color: #78350f;">
                  Please transfer <strong>${fmtPKR(order.total)}</strong> to our official Easypaisa account to complete your order:
                </p>
                <div style="background-color: #ffffff; border-radius: 10px; padding: 12px 16px; border: 1px solid #fef3c7; font-size: 13px; color: #1e293b; margin-bottom: 12px;">
                  <div><strong>Account Title:</strong> Shayan Danish</div>
                  <div style="margin-top: 4px;"><strong>Easypaisa Mobile:</strong> <span style="font-family: monospace; font-size: 14px; color: #0284c7; font-weight: 700;">0349 5144486</span></div>
                </div>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #92400e;">
                  💬 Reply to this email or send your 11-digit TRX ID / screenshot on WhatsApp at <strong>0349 5144486</strong>.<br>
                  📞 <em>Our verification team will also contact you on <strong>${order.shippingAddress?.phone || order.guestPhone}</strong> to confirm your details before dispatching your package.</em>
                </p>
              </div>
            </td>
          </tr>` : ''}

          <!-- Delivery Address & Payment Method -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px; vertical-align: top; width: 50%;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">
                      📍 Delivery Address
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${order.shippingAddress?.name || targetName}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 2px;">
                      ${order.shippingAddress?.street || order.shippingAddress?.address || ''}<br>
                      ${order.shippingAddress?.city || ''}${order.shippingAddress?.province ? `, ${order.shippingAddress.province}` : ''}<br>
                      📞 ${order.shippingAddress?.phone || order.guestPhone || ''}
                    </div>
                  </td>
                  <td style="padding: 20px; vertical-align: top; width: 50%; border-left: 1px solid #e2e8f0;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">
                      💳 Payment Information
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                      ${order.paymentMethod === 'easypaisa' ? 'Easypaisa Mobile Account' : order.paymentMethod?.toUpperCase() || 'Easypaisa'}
                    </div>
                    <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                      Status: <strong style="text-transform: capitalize; color: ${order.paymentStatus === 'paid' ? '#16a34a' : '#d97706'};">${order.paymentStatus || 'Pending'}</strong>
                    </div>
                    ${order.transactionId ? `
                    <div style="font-size: 12px; color: #475569; margin-top: 4px; font-family: monospace;">
                      TRX ID: ${order.transactionId}
                    </div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0 0 6px 0;">
                Have questions or need assistance? Reply directly or message us on WhatsApp: <strong>0349 5144486</strong>
              </p>
              <p style="margin: 0; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Karakoram Store. Direct from Artisans of Gilgit-Baltistan, Pakistan.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const plainText = [
      `🏔️ Karakoram Store — ${meta.heading}`,
      `Order ID: ${displayOrderId}`,
      `Customer: ${targetName}`,
      `Date: ${fmtDate(order.createdAt)}`,
      '',
      'ITEMS ORDERED:',
      ...(order.items || []).map((i) => `• ${i.name} (${i.variantLabel || 'Standard'}) x ${i.quantity} — ${fmtPKR(i.price * i.quantity)}`),
      '',
      `Subtotal: ${fmtPKR(order.subtotal)}`,
      `Shipping: ${fmtPKR(order.shippingCost)}`,
      order.discount ? `Discount: -${fmtPKR(order.discount)}` : '',
      `Total: ${fmtPKR(order.total)}`,
      '',
      `Payment Method: ${order.paymentMethod?.toUpperCase() || 'EASYPAISA'}`,
      `Payment Status: ${order.paymentStatus?.toUpperCase() || 'PENDING'}`,
      order.transactionId ? `TRX ID: ${order.transactionId}` : '',
      '',
      order.paymentStatus !== 'paid' ? [
        'PAYMENT INSTRUCTIONS (PENDING):',
        'Please send payment via Easypaisa to:',
        '• Account Title: Shayan Danish',
        '• Mobile / Easypaisa: 0349 5144486',
        '• Share TRX ID on WhatsApp: 0349 5144486',
        `Our team will also contact you at ${order.shippingAddress?.phone || order.guestPhone || ''} for confirmation.`,
        '',
      ].join('\n') : '',
      `Track your order online: ${trackUrl}`,
      '',
      'Karakoram Store — Direct from Artisans of Gilgit-Baltistan'
    ].filter(Boolean).join('\n');

    const info = await transporter.sendMail({
      from,
      to: targetEmail,
      replyTo: fromAddress,
      subject: meta.subject,
      text: plainText,
      html,
      headers: {
        'X-Entity-Ref-ID': displayOrderId,
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });

    console.log(`[mailer] Sent "${event}" email to ${targetEmail} for order ${displayOrderId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] Error sending "${event}" email:`, err);
    return { success: false, error: err.message };
  }
}
