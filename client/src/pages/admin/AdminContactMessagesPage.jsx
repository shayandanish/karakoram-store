import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import SEO from '../../components/ui/SEO';
import { useToast } from '../../context/ToastContext';

const STATUS_LABELS = { new: 'New', in_progress: 'In progress', resolved: 'Resolved' };

export default function AdminContactMessagesPage() {
  const [status, setStatus] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-contact-messages', status],
    queryFn: () => api.get('/admin/contact-messages', { params: status ? { status } : {} }).then((res) => res.data),
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }) => api.patch(`/admin/contact-messages/${id}`, { status: nextStatus }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] }); toast.success('Message status updated.'); },
    onError: (error) => toast.error(error?.response?.data?.message || 'Could not update message status.'),
  });
  const sendReply = useMutation({
    mutationFn: ({ id, body }) => api.post(`/admin/contact-messages/${id}/replies`, { body }),
    onSuccess: (_response, variables) => {
      setReplyDrafts((current) => ({ ...current, [variables.id]: '' }));
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      toast.success('Reply emailed to the customer.');
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Could not send the reply email.'),
  });

  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <SEO title="Contact messages" />
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-apricot-700">Store inbox {data?.unread ? `· ${data.unread} new` : ''}</p><h1 className="mt-1 font-display text-2xl font-bold text-mountain-900">Contact messages</h1><p className="mt-1 text-sm text-stone-500">Customer messages sent through the public contact form.</p></div>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter messages by status" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"><option value="">All messages</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </header>
    {isLoading ? <p className="rounded-xl border bg-white p-6 text-sm text-stone-500">Loading messages…</p> : isError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Could not load messages. <button type="button" onClick={() => refetch()} className="ml-2 underline">Try again</button></div> : !data?.messages?.length ? <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">No messages found.</div> : <div className="space-y-3">{data.messages.map((message) => <article key={message._id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-mountain-900">{message.name}</h2><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500"><a className="underline" href={`mailto:${message.email}`}>{message.email}</a>{message.phone && <a className="underline" href={`tel:${message.phone}`}>{message.phone}</a>}<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></div></div><select value={message.status} disabled={updateStatus.isPending && updateStatus.variables?.id === message._id} onChange={(event) => updateStatus.mutate({ id: message._id, nextStatus: event.target.value })} aria-label={`Status for message from ${message.name}`} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">{message.message}</p>
      {message.replies?.length > 0 && <div className="mt-4 space-y-2 border-t border-stone-100 pt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Replies sent</h3>{message.replies.map((reply, index) => <div key={`${reply.sentAt}-${index}`} className="rounded-lg bg-emerald-50 p-3"><p className="whitespace-pre-wrap text-sm text-stone-700">{reply.body}</p><p className="mt-2 text-[11px] text-stone-500">Sent by {reply.sentBy} · {new Date(reply.sentAt).toLocaleString()}</p></div>)}</div>}
      <form className="mt-4 border-t border-stone-100 pt-4" onSubmit={(event) => { event.preventDefault(); const body = replyDrafts[message._id]?.trim(); if (body) sendReply.mutate({ id: message._id, body }); }}>
        <label htmlFor={`contact-reply-${message._id}`} className="block text-xs font-semibold text-stone-700">Reply by email to {message.email}</label>
        <textarea id={`contact-reply-${message._id}`} rows={3} maxLength={5000} value={replyDrafts[message._id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [message._id]: event.target.value }))} placeholder="Write your reply…" className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500" />
        <div className="mt-2 flex flex-wrap items-center gap-3"><button type="submit" disabled={!replyDrafts[message._id]?.trim() || sendReply.isPending} className="rounded-lg bg-mountain-900 px-4 py-2 text-xs font-semibold text-white hover:bg-mountain-800 disabled:cursor-not-allowed disabled:opacity-50">{sendReply.isPending && sendReply.variables?.id === message._id ? 'Sending…' : 'Send reply'}</button><a href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent('Re: Your message to Karakoram Store')}&body=${encodeURIComponent(replyDrafts[message._id] || '')}`} className={`text-xs font-semibold text-mountain-700 underline underline-offset-2 ${!replyDrafts[message._id]?.trim() ? 'pointer-events-none opacity-40' : ''}`}>Open email app</a></div>
      </form>
    </article>)}</div>}
  </div>;
}
