"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageCircle, Phone, Send } from "lucide-react";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";
import { useAuth } from "@/components/auth-provider";
import { DirectoryMember, DirectMessage, markDirectMessagesRead, readDirectory, readDirectMessages, sendDirectMessage, subscribeToDirectMessages } from "@/lib/direct-messaging";

function roleName(role: string) { return role === "hod" ? "HOD" : role === "admin" ? "Admin" : "Faculty"; }

function MessagesPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => members.find((member) => member.id === selectedId), [members, selectedId]);

  const loadMessages = useCallback(async () => {
    if (!session || !selectedId) { setMessages([]); return; }
    try {
      const items = await readDirectMessages(session.id, selectedId);
      setMessages(items);
      await markDirectMessagesRead(session.id, selectedId);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load messages."); }
  }, [session, selectedId]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void readDirectory().then((items) => { if (active) { setMembers(items); setSelectedId((current) => current || items[0]?.id || ""); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load members."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => { void loadMessages(); }, 0);
    const unsubscribe = subscribeToDirectMessages(session.id, () => { void loadMessages(); });
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [session, loadMessages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selected || !draft.trim()) return;
    setSending(true); setError("");
    try { await sendDirectMessage(session.id, selected.id, draft); setDraft(""); await loadMessages(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send this message."); }
    finally { setSending(false); }
  }

  function callMember() {
    if (selected) window.dispatchEvent(new CustomEvent("portal-start-call", { detail: { id: selected.id, name: selected.name } }));
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-[#1d1d1f] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex items-center justify-between"><Link href={session?.role === "faculty" ? "/" : session?.role === "hod" ? "/hod" : "/admin"} className="inline-flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Dashboard</Link><SignOutButton /></header>
      <section className="rounded-3xl bg-[#1d1d1f] p-6 text-white"><p className="text-xs font-medium uppercase tracking-wider text-white/55">Faculty Portal</p><h1 className="mt-2 text-2xl font-semibold">Messages & calls</h1><p className="mt-2 text-sm text-white/70">Private one-to-one conversations with any portal member.</p></section>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="grid min-h-[65vh] overflow-hidden rounded-3xl border border-black/[0.06] bg-white md:grid-cols-[280px_1fr]">
        <aside className="border-b border-black/[0.06] p-4 md:border-b-0 md:border-r"><h2 className="px-2 pb-3 text-sm font-semibold">Portal members</h2><div className="max-h-56 space-y-1 overflow-y-auto md:max-h-[60vh]">{loading && <p className="p-3 text-sm text-[#86868b]">Loading members…</p>}{members.map((member) => <button key={member.id} onClick={() => setSelectedId(member.id)} className={`w-full rounded-xl px-3 py-2.5 text-left ${selectedId === member.id ? "bg-blue-50 text-blue-900" : "hover:bg-[#f5f5f7]"}`}><span className="block text-sm font-medium">{member.name}</span><span className="mt-0.5 block text-xs text-[#86868b]">{roleName(member.role)}{member.department ? ` · ${member.department}` : ""}</span></button>)}</div></aside>
        <div className="flex min-h-[55vh] flex-col">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#0071e3]"/><div><h2 className="text-sm font-semibold">{selected?.name ?? "Choose a member"}</h2><p className="text-xs text-[#86868b]">{selected ? `${roleName(selected.role)}${selected.department ? ` · ${selected.department}` : ""}` : "No members found"}</p></div></div><button disabled={!selected} onClick={callMember} className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 px-3 text-xs font-medium hover:bg-[#f5f5f7] disabled:opacity-40"><Phone className="h-4 w-4"/> Voice call</button></div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] p-4">{messages.map((message) => { const mine = message.senderId === session?.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-[#0071e3] text-white" : "rounded-bl-md border border-black/[0.05] bg-white"}`}><p className="whitespace-pre-wrap text-sm">{message.body}</p><time className={`mt-1 block text-right text-[10px] ${mine ? "text-white/70" : "text-[#86868b]"}`}>{new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</time></article></div>; })}{!loading && selected && messages.length === 0 && <p className="py-12 text-center text-sm text-[#86868b]">Start a private conversation with {selected.name}.</p>}</div>
          <form onSubmit={submit} className="flex items-end gap-2 border-t border-black/[0.06] p-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={4000} placeholder="Write a message…" className="min-h-11 flex-1 resize-y rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-[#0071e3]"/><button disabled={sending || !draft.trim() || !selected} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0071e3] px-4 text-sm font-medium text-white disabled:opacity-50">{sending ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}<span className="hidden sm:inline">Send</span></button></form>
        </div>
      </section>
    </div>
  </main>;
}

export default function MessagesRoute() { return <ProtectedContent roles={["faculty", "hod", "admin"]}><MessagesPage /></ProtectedContent>; }
