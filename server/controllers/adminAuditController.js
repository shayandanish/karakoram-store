import AdminAuditLog from '../models/AdminAuditLog.js';
import AccountAuditLog from '../models/AccountAuditLog.js';
import Staff from '../models/Staff.js';

export const adminGetActivity = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const [adminLogs, accountLogs] = await Promise.all([
      AdminAuditLog.find().sort({ occurredAt: -1, _id: -1 }).limit(limit).lean(),
      AccountAuditLog.find().populate('actor', 'name email role').sort({ occurredAt: -1, _id: -1 }).limit(limit).lean(),
    ]);
    const unpopulatedStaffIds = accountLogs.map((entry) => entry.actor?._id || entry.actor).filter(Boolean);
    const staffActors = await Staff.find({ _id: { $in: unpopulatedStaffIds } }).select('username name role').lean();
    const staffById = new Map(staffActors.map((staff) => [String(staff._id), staff]));
    const logs = [
      ...adminLogs,
      ...accountLogs.map((entry) => {
        const actorId = entry.actor?._id || entry.actor;
        const staffActor = staffById.get(String(actorId));
        return ({
        _id: `account-${entry._id}`,
        actor: actorId,
        actorName: entry.actor?.name || staffActor?.name || '',
        actorEmail: entry.actor?.email || '',
        actorUsername: staffActor?.username || '',
        actorRole: entry.actor?.role || staffActor?.role || '',
        action: entry.action,
        resource: entry.entity,
        resourceId: entry.entityId || '',
        method: 'ACCOUNT',
        path: '',
        statusCode: 200,
        changedFields: Object.keys(entry.details || {}),
        occurredAt: entry.occurredAt,
      });
      }),
    ].sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt)).slice(0, limit);
    res.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate');
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};
