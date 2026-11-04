import AdminAuditLog from '../models/AdminAuditLog.js';

const ACTION_BY_METHOD = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

const getResource = (path = '') => {
  const segment = path.split('/').filter(Boolean)[0] || 'admin';
  const labels = {
    products: 'product',
    categories: 'category',
    artisans: 'artisan',
    cities: 'region',
    coupons: 'coupon',
    orders: 'order',
    users: 'user',
    settings: 'store settings',
    accounts: 'accounts',
    upload: 'store image',
  };
  return labels[segment] || segment;
};

const getChangedFields = (value, prefix = '', result = []) => {
  if (!value || typeof value !== 'object' || result.length >= 40) return result;
  for (const [key, child] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      result.push(field);
    } else if (child && typeof child === 'object') {
      getChangedFields(child, field, result);
    } else {
      result.push(field);
    }
    if (result.length >= 40) break;
  }
  return result;
};

export const adminAudit = (req, res, next) => {
  if (!ACTION_BY_METHOD[req.method]) return next();

  const sendJson = res.json.bind(res);
  let auditAttempted = false;
  res.json = (payload) => {
    if (auditAttempted || res.statusCode >= 400 || !req.user?._id) return sendJson(payload);
    auditAttempted = true;
    const resource = getResource(req.path);
    const action = `${resource}.${ACTION_BY_METHOD[req.method]}`;

    return AdminAuditLog.create({
      actor: req.user._id,
      actorName: req.user.name || '',
      actorEmail: req.user.email || '',
      actorUsername: req.user.username || '',
      actorRole: req.user.role,
      action,
      resource,
      resourceId: req.params?.id ? String(req.params.id) : '',
      method: req.method,
      path: req.path.slice(0, 300),
      statusCode: res.statusCode,
      changedFields: getChangedFields(req.body),
    }).then(() => sendJson(payload)).catch((error) => {
      // The business action has already succeeded; keep its response usable if
      // audit storage is temporarily unavailable, while leaving a server log.
      console.error('Could not save admin activity entry:', error.message);
      return sendJson(payload);
    });
  };

  next();
};
