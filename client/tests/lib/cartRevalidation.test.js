import { describe, expect, it, vi } from 'vitest';
import { revalidateCartItems } from '../../src/lib/cartRevalidation';

const item = (overrides = {}) => ({
  key: 'product-1__500g',
  productId: 'product-1',
  productSlug: 'product-one',
  productName: 'Apricot Oil',
  variantLabel: '500g',
  price: 1000,
  originalPrice: null,
  discountPercent: null,
  discountLabel: '',
  quantity: 2,
  ...overrides,
});

const apiFor = (products) => ({
  get: vi.fn(async (path) => {
    const slug = path.split('/').pop();
    if (products[slug] instanceof Error) throw products[slug];
    if (!products[slug]) {
      const error = new Error('not found');
      error.response = { status: 404 };
      throw error;
    }
    return { data: products[slug] };
  }),
});

describe('revalidateCartItems', () => {
  it('updates prices and caps quantities to current stock, requiring review', async () => {
    const api = apiFor({
      'product-one': {
        isActive: true,
        variants: [{ label: '500g', price: 1200, stock: 1 }],
      },
    });

    const result = await revalidateCartItems([item()], api);

    expect(result.canCheckout).toBe(false);
    expect(result.hasChanges).toBe(true);
    expect(result.updatedItems[0]).toMatchObject({ price: 1200, quantity: 1 });
    expect(result.warnings).toHaveLength(2);
  });

  it('retains out-of-stock items but blocks checkout', async () => {
    const api = apiFor({
      'product-one': {
        isActive: true,
        variants: [{ label: '500g', price: 1000, stock: 0 }],
      },
    });

    const result = await revalidateCartItems([item()], api);

    expect(result.canCheckout).toBe(false);
    expect(result.updatedItems[0].availabilityStatus).toBe('out_of_stock');
    expect(result.warnings[0]).toMatch(/out of stock/i);
  });

  it('removes unavailable products rather than trusting their saved cart data', async () => {
    const result = await revalidateCartItems([item()], apiFor({}));

    expect(result.canCheckout).toBe(false);
    expect(result.updatedItems).toEqual([]);
    expect(result.hasChanges).toBe(true);
  });

  it('rejects on network and server errors instead of treating stale prices as valid', async () => {
    const error = new Error('service unavailable');
    const api = apiFor({ 'product-one': error });

    await expect(revalidateCartItems([item()], api)).rejects.toThrow('service unavailable');
  });

  it('fetches a product only once when multiple variants are in the cart', async () => {
    const api = apiFor({
      'product-one': {
        isActive: true,
        variants: [
          { label: '500g', price: 1000, stock: 5 },
          { label: '1kg', price: 1800, stock: 5 },
        ],
      },
    });

    const result = await revalidateCartItems(
      [item(), item({ key: 'product-1__1kg', variantLabel: '1kg', price: 1800 })],
      api
    );

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.canCheckout).toBe(true);
  });
});
