/**
 * discountUtils.js
 * Shared helpers for computing and displaying variant discounts.
 *
 * A variant has an active discount when:
 *   - variant.discountPercent is set (> 0):
 *       originalPrice = variant.price
 *       salePrice = Math.round(variant.price * (1 - discountPercent / 100))
 *   - OR fallback variant.compareAtPrice > variant.price:
 *       originalPrice = variant.compareAtPrice
 *       salePrice = variant.price
 */

/**
 * Calculate the after-discount price given a base price and a discount percentage.
 *
 * @param {number|string} basePrice
 * @param {number|string} discountPercent
 * @returns {{ salePrice: number, savingsAmount: number, savingsPct: number } | null}
 */
export const calculateDiscountedPrice = (basePrice, discountPercent) => {
  const price = Number(basePrice);
  const pct = Number(discountPercent);

  if (!price || isNaN(price) || price <= 0 || isNaN(pct) || pct <= 0) {
    return null;
  }

  const validPct = Math.min(99, Math.max(1, pct));
  const salePrice = Math.max(1, Math.round(price * (1 - validPct / 100)));
  const savingsAmount = price - salePrice;

  return {
    salePrice,
    savingsAmount,
    savingsPct: validPct,
  };
};

/**
 * Calculate discount info for a single variant object.
 *
 * @param {{ price?: number, discountPercent?: number|null, compareAtPrice?: number|null, discountLabel?: string }} variant
 * @returns {{
 *   hasDiscount: boolean,
 *   salePrice: number,
 *   originalPrice: number|null,
 *   savingsAmount: number,
 *   savingsPct: number,
 *   badge: string|null
 * }}
 */
export const getVariantDiscount = (variant) => {
  const regularPrice = Number(variant?.price ?? 0);
  const discountPercent =
    variant?.discountPercent != null && Number(variant.discountPercent) > 0
      ? Number(variant.discountPercent)
      : null;

  // 1. Primary path: discountPercent set by admin
  if (discountPercent != null && regularPrice > 0) {
    const calc = calculateDiscountedPrice(regularPrice, discountPercent);
    if (calc) {
      const badge = variant?.discountLabel?.trim() || `${calc.savingsPct}% OFF`;
      return {
        hasDiscount: true,
        salePrice: calc.salePrice,
        originalPrice: regularPrice,
        savingsAmount: calc.savingsAmount,
        savingsPct: calc.savingsPct,
        badge,
      };
    }
  }

  // 2. Fallback path: compareAtPrice (if previously set)
  const compareAt = variant?.compareAtPrice != null ? Number(variant.compareAtPrice) : null;
  if (compareAt != null && compareAt > regularPrice && regularPrice > 0) {
    const savingsAmount = compareAt - regularPrice;
    const savingsPct = Math.round((savingsAmount / compareAt) * 100);
    const badge = variant?.discountLabel?.trim() || `${savingsPct}% OFF`;
    return {
      hasDiscount: true,
      salePrice: regularPrice,
      originalPrice: compareAt,
      savingsAmount,
      savingsPct,
      badge,
    };
  }

  // 3. No discount active
  return {
    hasDiscount: false,
    salePrice: regularPrice,
    originalPrice: null,
    savingsAmount: 0,
    savingsPct: 0,
    badge: null,
  };
};

/**
 * Return the best discount info across all variants of a product (for product cards).
 *
 * @param {Array} variants
 * @returns {ReturnType<typeof getVariantDiscount>}
 */
export const getBestVariantDiscount = (variants = []) => {
  if (!variants || variants.length === 0) {
    return getVariantDiscount(null);
  }

  // Find variant with the highest discount % or lowest sale price
  const withDiscount = variants.map((v) => getVariantDiscount(v)).filter((d) => d.hasDiscount);

  if (withDiscount.length > 0) {
    // Pick the one with highest savings %
    return withDiscount.sort((a, b) => b.savingsPct - a.savingsPct)[0];
  }

  return getVariantDiscount(variants[0]);
};
