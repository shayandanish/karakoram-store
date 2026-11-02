/**
 * csrf.test.js
 * Unit tests for CSRF double-submit cookie middleware.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { csrfProtection } from '../../middlewares/csrf.js';

describe('csrfProtection', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/api/test',
      cookies: {},
      headers: {},
    };
    res = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      cookie: vi.fn(),
      setHeader: vi.fn(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets CSRF cookie on safe GET requests', () => {
    const middleware = csrfProtection();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ sameSite: 'lax', path: '/' })
    );
  });

  it('skips CSRF check for safe methods', () => {
    const middleware = csrfProtection();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requires CSRF header on state-changing requests', () => {
    req.method = 'POST';
    req.cookies = { csrf_token: 'abc123' };
    req.headers = {};
    const middleware = csrfProtection();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('passes when CSRF header matches cookie', () => {
    req.method = 'POST';
    req.cookies = { csrf_token: 'abc123' };
    req.headers = { 'x-csrf-token': 'abc123' };
    const middleware = csrfProtection();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('fails when CSRF header mismatches cookie', () => {
    req.method = 'POST';
    req.cookies = { csrf_token: 'abc123' };
    req.headers = { 'x-csrf-token': 'wrong-token' };
    const middleware = csrfProtection();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('skips CSRF when skip callback returns true', () => {
    req.method = 'POST';
    req.cookies = {};
    req.headers = {};
    const skip = () => true;
    const middleware = csrfProtection({ skip });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});
