import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/ui/SEO';

const STAFF_ROLES = [
  { value: 'orders_manager', label: 'Orders manager', detail: 'Dashboard and order handling' },
  { value: 'catalog_manager', label: 'Catalog manager', detail: 'Dashboard, products, categories, regions, and coupons' },
  { value: 'accounts_manager', label: 'Accounts manager', detail: 'Dashboard and Accounts' },
  { value: 'content_manager', label: 'Content manager', detail: 'Dashboard and page content' },
];

const EMPTY_FORM = { username: '', name: '', password: '', role: 'orders_manager' };

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => (await api.get('/admin/staff')).data,
  });
  const staff = data?.staff || [];

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/staff', payload),
    onSuccess: ({ data: result }) => {
      setForm(EMPTY_FORM);
      toast.success(`Staff account @${result.staff.username} created.`);
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not create the staff account.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/staff/${id}/status`, { isActive }),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'Staff account activated.' : 'Staff account deactivated; active sessions were ended.');
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not update staff access.'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/admin/staff/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('Staff dashboard access updated; their current session was ended.');
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not update dashboard access.'),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => api.put(`/admin/staff/${id}/password`, { password }),
    onSuccess: () => {
      setPasswordTarget(null);
      setNewPassword('');
      toast.success('Password updated. The staff member must sign in again.');
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not update the password.'),
  });

  const handleCreate = (event) => {
    event.preventDefault();
    createMutation.mutate({
      username: form.username.trim().toLowerCase(),
      name: form.name.trim(),
      password: form.password,
      role: form.role,
    });
  };

  const handlePasswordUpdate = (event) => {
    event.preventDefault();
    if (newPassword.length < 10) {
      toast.error('Use at least 10 characters for the new password.');
      return;
    }
    passwordMutation.mutate({ id: passwordTarget._id, password: newPassword });
  };

  return <div className="space-y-6">
    <SEO title="Staff Management - Admin Panel" />
    <div>
      <h1 className="text-2xl font-bold font-display tracking-tight text-mountain-900 sm:text-3xl">Staff management</h1>
      <p className="mt-1 text-sm text-stone-600">Create staff sign-ins, choose each person’s dashboard access, and control account status.</p>
    </div>

    <form onSubmit={handleCreate} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-bold text-mountain-900">Add staff member</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-stone-600">Display name
          <input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900" placeholder="Staff name" />
        </label>
        <label className="text-xs font-semibold text-stone-600">Username
          <input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" autoComplete="off" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900" placeholder="e.g. ahmed.orders" />
        </label>
        <label className="text-xs font-semibold text-stone-600">Temporary password
          <input required minLength={10} maxLength={128} autoComplete="new-password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900" placeholder="At least 10 characters" />
        </label>
        <label className="text-xs font-semibold text-stone-600">Dashboard access
          <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-900">
            {STAFF_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-500">Passwords are stored as secure hashes. Staff sign in from the Staff sign in option on the login page.</p>
        <button type="submit" disabled={createMutation.isPending} className="rounded-xl bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create staff account'}</button>
      </div>
    </form>

    {passwordTarget && <form onSubmit={handlePasswordUpdate} className="rounded-2xl border border-apricot-200 bg-apricot-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-mountain-900">Update password for @{passwordTarget.username}</h2><p className="mt-1 text-xs text-stone-600">Their current sign-in session will be ended.</p></div><button type="button" onClick={() => { setPasswordTarget(null); setNewPassword(''); }} className="text-xs font-semibold text-stone-600 underline">Cancel</button></div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input required minLength={10} maxLength={128} autoComplete="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (at least 10 characters)" className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm" /><button type="submit" disabled={passwordMutation.isPending} className="rounded-xl bg-mountain-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{passwordMutation.isPending ? 'Updating…' : 'Save password'}</button></div>
    </form>}

    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><div><h2 className="font-bold text-mountain-900">Staff accounts</h2><p className="mt-0.5 text-xs text-stone-500">{staff.filter((member) => member.isActive).length} active · {staff.length} total</p></div><button type="button" onClick={() => refetch()} className="text-xs font-semibold text-apricot-700">Refresh</button></div>
      {isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-stone-100" />)}</div>
        : isError ? <div className="p-5 text-sm text-rose-700">{error?.response?.data?.message || 'Could not load staff accounts.'}</div>
          : staff.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">No staff accounts yet. Add the first member above.</p>
            : <div className="divide-y divide-stone-100">
              {staff.map((member) => <article key={member._id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-mountain-900">{member.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{member.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-1 text-xs text-stone-500">@{member.username} · {STAFF_ROLES.find((role) => role.value === member.role)?.label || member.role}</p><p className="mt-0.5 text-[11px] text-stone-400">{STAFF_ROLES.find((role) => role.value === member.role)?.detail}</p></div>
                <div className="flex flex-wrap gap-2"><select aria-label={`Change dashboard access for ${member.name}`} value={member.role} disabled={roleMutation.isPending && roleMutation.variables?.id === member._id} onChange={(event) => roleMutation.mutate({ id: member._id, role: event.target.value })} className="max-w-40 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs text-stone-700 disabled:opacity-50">{STAFF_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><button type="button" onClick={() => { setPasswordTarget(member); setNewPassword(''); }} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Update password</button><button type="button" disabled={statusMutation.isPending && statusMutation.variables?.id === member._id} onClick={() => statusMutation.mutate({ id: member._id, isActive: !member.isActive })} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${member.isActive ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{member.isActive ? 'Deactivate' : 'Activate'}</button></div>
              </article>)}
            </div>}
    </section>
  </div>;
}
