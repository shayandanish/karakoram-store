import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import SEO from '../../components/ui/SEO';

const formatTimestamp = (value) => new Date(value).toLocaleString('en-PK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function AdminActivityPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => (await api.get('/admin/audit')).data,
  });
  const logs = data?.logs || [];
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) => [log.actorName, log.actorEmail, log.actorUsername, log.actorRole, log.action, log.path, ...(log.changedFields || [])]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [logs, search]);

  return <div className="space-y-6">
    <SEO title="Activity Log - Admin Panel" />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-mountain-900 sm:text-3xl">Activity log</h1>
        <p className="mt-1 text-sm text-stone-600">Recent changes made by store administrators and staff. Field names are recorded; submitted values are not.</p>
      </div>
      <button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 disabled:opacity-50">{isFetching ? 'Refreshing…' : 'Refresh'}</button>
    </div>
    <label className="block max-w-md text-xs font-semibold text-stone-600">Search activity
      <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Person, action, section…" className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-normal text-stone-800" />
    </label>
    {isError && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error?.response?.data?.message || 'Could not load the activity log.'}</span><button onClick={() => refetch()} className="shrink-0 text-xs font-semibold underline">Try again</button></div>}
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
      {isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((row) => <div key={row} className="h-14 animate-pulse rounded-xl bg-stone-100" />)}</div>
        : filteredLogs.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">{search ? 'No matching activity.' : 'No admin changes recorded yet.'}</p>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500"><tr><th className="px-5 py-3">Person</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Section</th><th className="px-5 py-3">Fields changed</th><th className="px-5 py-3">When</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLogs.map((log) => <tr key={log._id} className="align-top hover:bg-stone-50/70">
                  <td className="px-5 py-3.5"><span className="block font-semibold text-mountain-900">{log.actorName || 'Staff member'}</span><span className="mt-0.5 block text-[11px] text-stone-500">{log.actorEmail || (log.actorUsername ? `@${log.actorUsername}` : '')} · {log.actorRole.replaceAll('_', ' ')}</span></td>
                  <td className="px-5 py-3.5"><span className="font-medium capitalize text-stone-800">{log.action.replaceAll('.', ' ')}</span>{log.resourceId && <span className="mt-0.5 block font-mono text-[10px] text-stone-400">#{log.resourceId.slice(-8)}</span>}</td>
                  <td className="px-5 py-3.5 capitalize text-stone-600">{log.resource}</td>
                  <td className="max-w-sm px-5 py-3.5 text-xs text-stone-600">{log.changedFields?.length ? log.changedFields.join(', ') : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-xs text-stone-500">{formatTimestamp(log.occurredAt)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      {!isLoading && logs.length > 0 && <p className="border-t border-stone-100 px-5 py-3 text-[11px] text-stone-400">Showing up to {logs.length} recent successful changes. Full submitted values are excluded to protect customer and payment data.</p>}
    </div>
  </div>;
}
