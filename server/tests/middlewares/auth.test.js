import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminOnly } from '../../middlewares/auth.js';

describe('adminOnly', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = { status: vi.fn().mockReturnThis() };
    next = vi.fn();
  });

  it('allows administrators through', () => {
    req.user = { role: 'admin' };

    adminOnly(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([undefined, { role: 'customer' }])('rejects non-admin users', (user) => {
    req.user = user;

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin access required' }));
  });
});
