"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, MessageCircle, Phone, Send } from "lucide-react";
import { PortalSession } from "@/lib/auth-store";
import { LeaveRequest } from "@/lib/leave-store";
import { CallbackRequest, LeaveMessage, createCallbackRequest, readCallbackRequests, readLeaveMessages, sendLeaveMessage, subscribeToConversation, updateCallbackRequest } from "@/lib/conversation-store";
import { SignOutButton } from "@/components/protected-content";

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function LeaveConversation({ request, session }: { request: LeaveRequest; session: PortalSession }) {
  const [messages, setMessages] = useState<LeaveMessage[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [draft, setDraft] = useState("");
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [callbackSaving, setCallbackSaving] = useState(false);
  const [busyCallbackId, setBusyCallbackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canHandleCallback = session.role === "hod" || session.role === "admin";

  const load = useCallback(async () => {
    try {
      const [newMessages, newCallbacks] = await Promise.all([readLeaveMessages(request.id), readCallbackRequests(request.id)]);
      setMessages(newMessages);
      setCallbacks(newCallbacks);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this conversation.");
    } finally {
      setLoading(false);
    }
  }, [request.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const unsubscribe = subscribeToConversation(request.id, () => { void load(); });
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [load, request.id]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendLeaveMessage(request.id, session.id, draft);
      setDraft("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  async function submitCallback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCallbackSaving(true);
    setError("");
    try {
      await createCallbackRequest({
        leaveRequestId: request.id,
        requesterId: session.id,
        phone: String(data.get("phone") ?? ""),
        preferredTime: String(data.get("preferredTime") ?? ""),
        note: String(data.get("note") ?? ""),
      });
      form.reset();
      setShowCallbackForm(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to request a call.");
    } finally {
      setCallbackSaving(false);
    }
  }

  async function setCallbackStatus(callback: CallbackRequest, status: CallbackRequest["status"]) {
    setBusyCallbackId(callback.id);
    setError("");
    try {
      await updateCallbackRequest(callback.id, status, session.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the call request.");
    } finally {
      setBusyCallbackId(null);
    }
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-[#1d1d1f] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex items-center justify-between"><Link href={session.role === "faculty" ? "/" : session.role === "hod" ? "/hod" : "/approvals"} className="inline-flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link><SignOutButton /></header>
      <section className="rounded-3xl bg-[#1d1d1f] p-6 text-white sm:p-7"><p className="text-xs font-medium uppercase tracking-wider text-white/55">Leave request conversation</p><h1 className="mt-2 text-xl font-semibold sm:text-2xl">{request.faculty === "You" ? "Your request" : request.faculty} · {request.category}</h1><p className="mt-2 text-sm text-white/70">{request.startDate}{request.endDate !== request.startDate ? ` – ${request.endDate}` : ""} · {request.status}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">{request.reason}</p></section>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6"><div><h2 className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-[#0071e3]" /> Messages</h2><p className="mt-1 text-xs text-[#86868b]">Visible to the faculty member, their department HOD, and administrators.</p></div></div>
        <div className="max-h-[55vh] min-h-52 space-y-3 overflow-y-auto bg-[#fafafa] p-4 sm:p-6">
          {messages.map((message) => {
            const mine = message.senderId === session.id;
            const sender = mine ? "You" : session.role === "faculty" ? "Department review team" : request.faculty;
            return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${mine ? "rounded-br-md bg-[#0071e3] text-white" : "rounded-bl-md border border-black/[0.05] bg-white"}`}><div className="flex items-center justify-between gap-5"><p className={`text-xs font-semibold ${mine ? "text-white" : "text-[#1d1d1f]"}`}>{sender}</p><time className={`text-[10px] ${mine ? "text-white/70" : "text-[#86868b]"}`}>{formatTime(message.createdAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p></article></div>;
          })}
          {!loading && messages.length === 0 && <div className="py-10 text-center"><MessageCircle className="mx-auto h-6 w-6 text-[#a1a1a6]" /><p className="mt-2 text-sm font-medium">Start the conversation</p><p className="mt-1 text-xs text-[#86868b]">Discuss details about this leave request here.</p></div>}
          {loading && <p className="py-10 text-center text-sm text-[#86868b]">Loading messages…</p>}
        </div>
        <form onSubmit={submitMessage} className="flex items-end gap-2 border-t border-black/[0.06] p-3 sm:p-4"><label className="sr-only" htmlFor="leave-message">Write a message</label><textarea id="leave-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={2} placeholder="Write a message about this request…" className="max-h-36 min-h-11 flex-1 resize-y rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-[#0071e3]" /><button disabled={sending || !draft.trim()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#0071e3] px-4 text-sm font-medium text-white hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /><span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></button></form>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Phone className="h-4 w-4 text-[#0071e3]" /> Phone call</h2><p className="mt-1 text-xs text-[#86868b]">Request a callback about this leave application.</p></div>{session.role === "faculty" && <button onClick={() => setShowCallbackForm((visible) => !visible)} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-medium hover:bg-black/[0.03]">{showCallbackForm ? "Cancel" : "Request a call"}</button>}</div>
        {showCallbackForm && session.role === "faculty" && <form onSubmit={submitCallback} className="mt-4 grid gap-3 rounded-2xl bg-[#f7f7f8] p-4 sm:grid-cols-2"><label className="space-y-1 text-xs font-medium">Your phone number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} placeholder="Phone number for callback" className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#0071e3]" /></label><label className="space-y-1 text-xs font-medium">Preferred time<input name="preferredTime" required minLength={2} maxLength={120} placeholder="e.g. Weekdays after 3 pm" className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#0071e3]" /></label><label className="space-y-1 text-xs font-medium sm:col-span-2">Anything to add? <span className="font-normal text-[#86868b]">Optional</span><textarea name="note" maxLength={1000} rows={2} placeholder="Best time window or context for the call" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]" /></label><button disabled={callbackSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1d1d1f] px-4 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 sm:col-span-2 sm:justify-self-end"><CalendarClock className="h-4 w-4" />{callbackSaving ? "Sending…" : "Send callback request"}</button><p className="text-[11px] leading-5 text-[#86868b] sm:col-span-2">Your number is shared only with the HOD for your department and portal administrators for this request.</p></form>}
        <div className="mt-4 space-y-3">{callbacks.map((callback) => <article key={callback.id} className="rounded-2xl border border-black/[0.06] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-medium">Callback requested</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${callback.status === "open" ? "bg-amber-50 text-amber-700" : callback.status === "contacted" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{callback.status}</span></div><time className="text-[10px] text-[#86868b]">{formatTime(callback.createdAt)}</time></div><p className="mt-2 text-xs text-[#6e6e73]">Phone: <span className="font-medium text-[#1d1d1f]">{callback.phone}</span> · Preferred time: {callback.preferredTime}</p>{callback.note && <p className="mt-2 text-xs leading-5 text-[#6e6e73]">{callback.note}</p>}{canHandleCallback && <div className="mt-3 flex flex-wrap gap-2">{callback.status !== "contacted" && <button disabled={busyCallbackId === callback.id} onClick={() => void setCallbackStatus(callback, "contacted")} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03] disabled:opacity-50">Mark contacted</button>}{callback.status !== "closed" && <button disabled={busyCallbackId === callback.id} onClick={() => void setCallbackStatus(callback, "closed")} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03] disabled:opacity-50">Close request</button>}</div>}</article>)}{callbacks.length === 0 && !showCallbackForm && <p className="text-xs text-[#a1a1a6]">No callback requested.</p>}</div>
      </section>
    </div>
  </main>;
}
