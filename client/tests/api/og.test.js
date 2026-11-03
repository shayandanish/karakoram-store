import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/og.js';

function responseMock() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

describe('crawler product preview handler', () => {
  const originalApiBase = process.env.API_BASE_URL;
  const originalViteApiBase = process.env.VITE_API_URL;
  const originalSiteUrl = process.env.SITE_URL;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.API_BASE_URL = originalApiBase;
    process.env.VITE_API_URL = originalViteApiBase;
    process.env.SITE_URL = originalSiteUrl;
  });

  it('renders escaped product metadata for crawler previews', async () => {
    process.env.API_BASE_URL = 'https://api.example.test/api';
    process.env.SITE_URL = 'https://shop.example.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        name: '<Apricot & Oil>',
        slug: 'apricot-oil',
        description: '"Pure" from Hunza',
        images: [{ url: 'https://images.example.test/oil.webp' }],
      }),
    }));
    const res = responseMock();

    await handler({ query: { slug: 'apricot-oil' }, headers: {} }, res);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/products/apricot-oil',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('&lt;Apricot &amp; Oil&gt;');
    expect(res.body).toContain('https://images.example.test/oil.webp');
    expect(res.body).toContain('https://shop.example.test/products/apricot-oil');
    expect(res.headers['Cache-Control']).toContain('s-maxage=300');
  });

  it('rejects invalid slugs before calling the product API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = responseMock();

    await handler({ query: { slug: '../admin' }, headers: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a visible configuration error when no API URL is set', async () => {
    delete process.env.API_BASE_URL;
    delete process.env.VITE_API_URL;
    const res = responseMock();

    await handler({ query: { slug: 'apricot-oil' }, headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatch(/not configured/i);
  });
});
