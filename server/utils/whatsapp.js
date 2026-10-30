/**
 * WhatsApp Business Integration
 * Supports official Meta WhatsApp Cloud API with graceful fallback and logging.
 */

/**
 * Normalizes a Pakistani or international phone number to international format without '+'.
 * e.g., '0349 5144486' -> '923495144486'
 * '+92-349-5144486'    -> '923495144486'
 */
export function formatPhoneNumberForWhatsApp(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');

  // Handle Pakistani local numbers starting with 03
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '92' + cleaned.slice(1);
  } else if (cleaned.startsWith('9203')) {
    cleaned = '92' + cleaned.slice(3);
  }

  return cleaned;
}

/**
 * Formats PKR currency for text messages
 */
function fmtPKR(num) {
  return `Rs. ${Number(num || 0).toLocaleString('en-PK')}`;
}

/**
 * Builds the WhatsApp message text for various order lifecycle events
 */
export function buildWhatsAppMessage(order, event, trackingBaseUrl) {
  const displayId = order.orderId || (order._id ? `#${String(order._id).slice(-8).toUpperCase()}` : '');
  const customerName = order.shippingAddress?.name || order.guestName || 'Valued Customer';
  const trackUrl = `${trackingBaseUrl}/track-order?orderId=${encodeURIComponent(order.orderId || order._id)}&phone=${encodeURIComponent(order.shippingAddress?.phone || order.guestPhone || '')}`;

  const courierName = order.shipment?.courierName || 'Courier';
  const trackingId = order.shipment?.trackingId || '';
  const trackingUrl = order.shipment?.trackingUrl || '';
  const estDelivery = order.shipment?.estimatedDelivery
    ? new Date(order.shipment.estimatedDelivery).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  switch (event) {
    case 'order_placed':
    case 'pending': {
      const isPaid = order.paymentStatus === 'paid';
      const custPhone = order.shippingAddress?.phone || order.guestPhone || 'your phone number';
      let paymentNotice = '';

      if (!isPaid) {
        paymentNotice =
          '\n💳 *Payment Pending — Action Required:*\n' +
          'Please send *' + fmtPKR(order.total) + '* via Easypaisa to:\n' +
          '• Account Title: *Shayan Danish*\n' +
          '• Mobile / Easypaisa Number: *03495144486*\n\n' +
          'Once sent, please share your 11-digit TRX ID or payment screenshot on WhatsApp (*03495144486*) so we can confirm it.\n\n' +
          '📞 *Verification:* Our team will also contact you at *' + custPhone + '* via call or WhatsApp for confirmation before shipment.\n';
      }

      return (
        '🏔️ *Karakoram Store — Order Received!*\n\n' +
        'Assalam o Alaikum ' + customerName + ',\n' +
        'Thank you for your order! Your Order ID is *' + displayId + '*.\n\n' +
        '*Order Total:* ' + fmtPKR(order.total) + '\n' +
        '*Payment Method:* ' + (order.paymentMethod ? order.paymentMethod.toUpperCase() : 'EASYPAISA') + '\n' +
        '*Payment Status:* ' + (order.paymentStatus ? order.paymentStatus.toUpperCase() : 'PENDING') + '\n' +
        paymentNotice + '\n' +
        'Track your order progress anytime here:\n' + trackUrl + '\n\n' +
        'Our team is preparing your authentic handcrafted goods directly from Hunza & Gilgit.'
      );
    }

    case 'confirmed':
      return (
        `✅ *Order Confirmed — ${displayId}*\n\n` +
        `Hi ${customerName},\n` +
        `Good news! Your order has been verified and confirmed. It is now queued for careful packing.\n\n` +
        `*Items:* ${order.items?.length || 0} product(s)\n` +
        `*Total:* ${fmtPKR(order.total)}\n\n` +
        `Track status: ${trackUrl}`
      );

    case 'processing':
      return (
        `🔄 *Order in Processing — ${displayId}*\n\n` +
        `Hi ${customerName},\n` +
        `Our artisans and fulfillment team in Gilgit-Baltistan are currently preparing your items.\n\n` +
        `Track status: ${trackUrl}`
      );

    case 'packed':
      return (
        `📦 *Order Packed & Ready — ${displayId}*\n\n` +
        `Hi ${customerName},\n` +
        `Your parcel has been quality-checked and securely packed. It will be handed over to the courier shortly.\n\n` +
        `Track status: ${trackUrl}`
      );

    case 'shipped':
      return (
        `🚚 *Order Dispatched! — ${displayId}*\n\n` +
        `Assalam o Alaikum ${customerName},\n` +
        `Your package is on its way!\n\n` +
        `*Courier:* ${courierName}\n` +
        (trackingId ? `*Tracking / CN:* ${trackingId}\n` : '') +
        (estDelivery ? `*Estimated Delivery:* ${estDelivery}\n` : '') +
        (trackingUrl ? `*Courier Link:* ${trackingUrl}\n` : '') +
        `\nTrack live updates on Karakoram Store:\n${trackUrl}`
      );

    case 'shipment_updated':
      return (
        `ℹ️ *Shipment Info Updated — ${displayId}*\n\n` +
        `Hi ${customerName},\n` +
        `The tracking information for your order has been updated:\n\n` +
        `*Courier:* ${courierName}\n` +
        (trackingId ? `*Tracking ID / CN:* ${trackingId}\n` : '') +
        (estDelivery ? `*Estimated Delivery:* ${estDelivery}\n` : '') +
        (trackingUrl ? `*Courier Link:* ${trackingUrl}\n` : '') +
        `\nTrack live updates: ${trackUrl}`
      );

    case 'out_for_delivery':
      return (
        `🛵 *Out for Delivery Today! — ${displayId}*\n\n` +
        `Assalam o Alaikum ${customerName},\n` +
        `The rider from *${courierName}* is out to deliver your parcel today!\n` +
        (trackingId ? `*CN Number:* ${trackingId}\n` : '') +
        `Please ensure someone is available at: ${order.shippingAddress?.address || order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}.\n\n` +
        `Need help? Track status: ${trackUrl}`
      );

    case 'delivered':
      return (
        `🎉 *Order Delivered Successfully — ${displayId}*\n\n` +
        `Assalam o Alaikum ${customerName},\n` +
        `Your package has been delivered! We hope you love your authentic products from the Karakoram mountains.\n\n` +
        `Thank you for supporting our local artisans and communities in Gilgit-Baltistan! ❤️`
      );

    case 'cancelled':
      return (
        `❌ *Order Cancelled — ${displayId}*\n\n` +
        `Hi ${customerName},\n` +
        `Your order ${displayId} has been cancelled.` +
        (order.notes ? `\nReason: ${order.notes}` : '') +
        `\n\nIf you have any questions or require a refund, please reply directly or reach us on WhatsApp.`
      );

    case 'returned':
      return (
        `↩️ *Order Return Processed — ${displayId}*\n\n` +
        `Hi ${customerName},\n` +
        `Your return request for order ${displayId} has been processed. Our support team will follow up shortly.`
      );

    default:
      return (
        `📢 *Order Update — ${displayId}*\n\n` +
        `Status: ${order.orderStatus?.toUpperCase()}\n` +
        `Track live: ${trackUrl}`
      );
  }
}

/**
 * Sends a WhatsApp message via Meta Cloud API or logs to console if credentials are unset.
 */
export async function sendWhatsAppNotification(order, event) {
  const phone = order.whatsappPhone || order.shippingAddress?.phone || order.guestPhone;
  const normalizedPhone = formatPhoneNumberForWhatsApp(phone);

  if (!normalizedPhone) {
    return { success: false, error: 'No valid phone number for WhatsApp' };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const messageText = buildWhatsAppMessage(order, event, clientUrl);

  // If Meta API credentials are not provided, operate in dev/mock mode
  if (!token || !phoneId) {
    console.log(
      `[WhatsApp] (Dev/Simulation) Message to +${normalizedPhone} for event "${event}":\n${messageText}`
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  // Real Meta Cloud API Call
  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: messageText,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || response.statusText;
      console.warn(`[WhatsApp API Error] to +${normalizedPhone}:`, data);
      return { success: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id || 'wa_sent';
    console.log(`[WhatsApp API Success] Message sent to +${normalizedPhone}, ID: ${messageId}`);
    return { success: true, messageId };
  } catch (err) {
    console.error('[WhatsApp Network Error]', err);
    return { success: false, error: err.message };
  }
}

