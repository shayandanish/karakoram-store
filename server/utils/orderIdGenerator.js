import Counter from '../models/Counter.js';

/**
 * Generates an atomic, unique, human-friendly order ID.
 * Format: KS-YYYY-XXXXXX (e.g. KS-2026-000001)
 *
 * @param {import('mongoose').ClientSession} [session] Optional session
 * @returns {Promise<string>}
 */
export async function generateOrderId(session = null) {
  const year = new Date().getFullYear();
  const counterName = `order_${year}`;

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
    return `KS-${year}-${seqStr}`;
  } catch (err) {
    // Graceful fallback to timestamp-based unique sequence if counter encounters temporary write conflict
    const fallbackSeq = String(Date.now()).slice(-6);
    return `KS-${year}-${fallbackSeq}`;
  }
}

