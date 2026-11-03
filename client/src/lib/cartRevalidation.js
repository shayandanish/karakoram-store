import { getVariantDiscount } from './discountUtils';

export async function revalidateCartItems(items, api) {
  if (!items.length) {
    return { warnings: [], hasChanges: false, canCheckout: true, updatedItems: [] };
  }

  const productRequests = new Map();
  for (const item of items) {
    const identifier = item.productSlug || item.productId;
    if (!productRequests.has(identifier)) {
      productRequests.set(
        identifier,
        api.get(`/products/${encodeURIComponent(identifier)}`).then(({ data }) => data).catch((error) => {
          if (error.response?.status === 404) return null;
          throw error;
        })
      );
    }
  }

  const products = new Map(
    await Promise.all(
      [...productRequests].map(async ([identifier, request]) => [identifier, await request])
    )
  );
  const warnings = [];
  const updatedItems = [];

  for (const item of items) {
    const identifier = item.productSlug || item.productId;
    const product = products.get(identifier);

    if (!product || !product.isActive) {
      warnings.push(`"${item.productName}" is no longer available and was removed.`);
      continue;
    }

    const variant = product.variants?.find((entry) => entry.label === item.variantLabel);
    if (!variant) {
      warnings.push(`Variant "${item.variantLabel}" for "${item.productName}" is no longer available.`);
      continue;
    }

    const stock = Number(variant.stock);
    const basePrice = Number(variant.price);
    if (
      variant.stock === null ||
      variant.stock === undefined ||
      variant.price === null ||
      variant.price === undefined ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isFinite(basePrice) ||
      basePrice < 0
    ) {
      throw new Error(`Could not verify price or stock for "${item.productName}".`);
    }

    const discount = getVariantDiscount(variant);
    const latestPrice = discount.hasDiscount ? discount.salePrice : basePrice;
    const outOfStock = stock <= 0;
    const quantity = outOfStock ? item.quantity : Math.min(item.quantity, stock);

    if (outOfStock) {
      warnings.push(`"${item.productName}" (${item.variantLabel}) is currently out of stock.`);
    }
    if (!outOfStock && quantity !== item.quantity) {
      warnings.push(`Quantity for "${item.productName}" was reduced to available stock (${stock}).`);
    }
    if (latestPrice !== item.price) {
      warnings.push(
        `Price for "${item.productName}" (${item.variantLabel}) changed from Rs ${item.price} to Rs ${latestPrice}.`
      );
    }

    updatedItems.push({
      ...item,
      price: latestPrice,
      originalPrice: discount.hasDiscount ? discount.originalPrice : null,
      discountPercent: discount.hasDiscount ? discount.savingsPct : null,
      discountLabel: discount.badge || '',
      quantity,
      availabilityStatus: outOfStock ? 'out_of_stock' : 'in_stock',
    });
  }

  const hasChanges =
    updatedItems.length !== items.length ||
    updatedItems.some((item, index) => {
      const previous = items[index];
      return (
        item.price !== previous.price ||
        item.quantity !== previous.quantity ||
        item.originalPrice !== previous.originalPrice ||
        item.discountPercent !== previous.discountPercent ||
        item.discountLabel !== previous.discountLabel ||
        item.availabilityStatus !== previous.availabilityStatus
      );
    });

  return {
    warnings,
    hasChanges,
    canCheckout: warnings.length === 0,
    updatedItems,
  };
}
