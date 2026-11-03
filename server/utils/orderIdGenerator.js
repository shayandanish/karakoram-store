import crypto from 'crypto';
import Counter from '../models/Counter.js';

function getRandomToken(len = 4) {
  return crypto.randomBytes(len).toString('hex').slice(0, len).toUpperCase();
}

/**
 * Generates an atomic, unique, human-friendly order ID.
 * Includes a random security token to prevent order enumeration.
 * Format: KS-YYYY-XXXXXX-XXXX (e.g. KS-2026-000001-A9K4)
 *
 * @param {import('mongoose').ClientSession} [session] Optional session
 * @returns {Promise<string>}
 */
export async function generateOrderId(session = null) {
  const year = new Date().getFullYear();
  const counterName = `order_${year}`;
  const suffix = getRandomToken(4);

  try {
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    if (session) {
      options.session = session;
    }

    const counter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $inc: { seq: 1 } },
      options
    );

    const seqStr = String(counter.seq).padStart(6, '0');
    return `KS-${year}-${seqStr}-${suffix}`;
  } catch (err) {
    // Cryptographically secure fallback if counter write conflict occurs
    const timeFragment = Date.now().toString(36).toUpperCase().slice(-4);
    const randomFallback = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `KS-${year}-${timeFragment}-${randomFallback}`;
  }
}
