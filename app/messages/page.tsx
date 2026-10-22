"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BellRing, LoaderCircle, MessageCircle, Phone, Send } from "lucide-react";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";
import { useAuth } from "@/components/auth-provider";
import { DirectoryMember, DirectMessage, markDirectMessagesRead, readDirectory, readDirectMessages, sendDirectMessage, subscribeToDirectMessages } from "@/lib/direct-messaging";
import { PortalAnnouncement, readAnnouncements, sendAnnouncement, subscribeToAnnouncements } from "@/lib/announcement-store";
import { DEPARTMENTS } from "@/lib/departments";
import { readVoiceMessages, subscribeToVoiceMessages, VoiceMessage } from "@/lib/voice-message-store";

function roleName(role: string) { return role === "hod" ? "HOD" : role === "admin" ? "Admin" : "Faculty"; }

function MessagesPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [broadcastDraft, setBroadcastDraft] = useState("");
  const [broadcastScope, setBroadcastScope] = useState<"all" | "department">("all");
  const [broadcastDepartment, setBroadcastDepartment] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const selected = useMemo(() => members.find((member) => member.id === selectedId), [members, selectedId]);

  const loadMessages = useCallback(async () => {
    if (!session || !selectedId) { setMessages([]); setVoiceMessages([]); return; }
    try {
      const [items, recordings] = await Promise.all([readDirectMessages(session.id, selectedId), readVoiceMessages(session.id, selectedId)]);
      setMessages(items);
      setVoiceMessages(recordings);
      await markDirectMessagesRead(session.id, selectedId);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load messages."); }
  }, [session, selectedId]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void readDirectory().then((items) => { if (active) { setMembers(items); const requestedMember = new URLSearchParams(window.location.search).get("member"); setSelectedId(items.some((item) => item.id === requestedMember) ? requestedMember! : items[0]?.id || ""); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load members."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const refreshPresence = (event: Event) => {
      const detail = (event as CustomEvent<{ userIds: string[] }>).detail;
      setOnlineMembers(new Set(detail?.userIds ?? []));
    };
    window.addEventListener("portal-presence-update", refreshPresence);
    return () => window.removeEventListener("portal-presence-update", refreshPresence);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => { void loadMessages(); }, 0);
    const unsubscribe = subscribeToDirectMessages(session.id, () => { void loadMessages(); });
    const unsubscribeVoice = subscribeToVoiceMessages(session.id, () => { void loadMessages(); });
    return () => { window.clearTimeout(timer); unsubscribe(); unsubscribeVoice(); };
  }, [session, loadMessages]);

  const loadBroadcasts = useCallback(async () => {
    try { setAnnouncements(await readAnnouncements()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load announcements."); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadBroadcasts(); }, 0);
    const unsubscribe = subscribeToAnnouncements(() => { void loadBroadcasts(); });
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [loadBroadcasts]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selected || !draft.trim()) return;
    setSending(true); setError("");
    try { await sendDirectMessage(session.id, selected.id, draft); setDraft(""); await loadMessages(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send this message."); }
    finally { setSending(false); }
  }

  async function submitBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || (session.role !== "admin" && session.role !== "hod") || !broadcastDraft.trim()) return;
    const scope = session.role === "admin" ? broadcastScope : "department";
    const department = scope === "department" ? (session.role === "hod" ? session.department : broadcastDepartment) : null;
    if (scope === "department" && !department) { setError("A department is required for a department announcement."); return; }
    setBroadcasting(true); setError("");
    try {
      await sendAnnouncement({ senderId: session.id, scope, department, body: broadcastDraft });
      setBroadcastDraft(""); await loadBroadcasts();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send this announcement."); }
    finally { setBroadcasting(false); }
  }

  function callMember() {
    if (selected) window.dispatchEvent(new CustomEvent("portal-start-call", { detail: { id: selected.id, name: selected.name } }));
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-[#1d1d1f] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex items-center justify-between"><Link href={session?.role === "faculty" ? "/" : session?.role === "hod" ? "/hod" : "/admin"} className="inline-flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Dashboard</Link><SignOutButton /></header>
      <section className="rounded-3xl bg-[#1d1d1f] p-6 text-white"><div className="flex items-center gap-3"><Image src="/icon.png" alt="EduLeave Portal" width={44} height={44} className="h-11 w-11 rounded-xl bg-white" /><div><p className="text-xs font-medium uppercase tracking-wider text-white/55">EduLeave Portal</p><h1 className="mt-1 text-2xl font-semibold">Messages & calls</h1></div></div><p className="mt-3 text-sm text-white/70">Private one-to-one conversations with any portal member.</p></section>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {session && (session.role === "admin" || session.role === "hod") && <section className="rounded-3xl border border-blue-100 bg-white p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><BellRing className="h-4 w-4 text-[#0071e3]"/><div><h2 className="font-semibold">Send an announcement</h2><p className="text-xs text-[#86868b]">{session.role === "admin" ? "Reach everyone or choose a department." : `Reach everyone in ${session.department ?? "your department"}.`}</p></div></div><form onSubmit={submitBroadcast} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"><div className="space-y-2">{session.role === "admin" ? <select value={broadcastScope} onChange={(event) => setBroadcastScope(event.target.value as "all" | "department")} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="all">All members</option><option value="department">One department</option></select> : <div className="flex h-10 items-center rounded-xl bg-[#f5f5f7] px-3 text-xs font-medium">Department only</div>}{(session.role === "hod" || broadcastScope === "department") && <select disabled={session.role === "hod"} value={session.role === "hod" ? session.department ?? "" : broadcastDepartment} onChange={(event) => setBroadcastDepartment(event.target.value)} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs disabled:bg-[#f5f5f7]">{session.role === "admin" && <option value="">Choose department</option>}{DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}</select>}</div><textarea value={broadcastDraft} onChange={(event) => setBroadcastDraft(event.target.value)} maxLength={4000} rows={2} placeholder="Write an announcement…" className="min-h-10 rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-[#0071e3]"/><button disabled={broadcasting || !broadcastDraft.trim()} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#0071e3] px-4 text-sm font-medium text-white disabled:opacity-50"><Send className="h-4 w-4"/>{broadcasting ? "Sending…" : "Send"}</button></form><div className="mt-5 border-t border-black/[0.06] pt-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">Recent announcements</h3><div className="mt-2 max-h-52 space-y-2 overflow-y-auto">{announcements.map((item) => <article key={item.id} className="rounded-xl bg-[#f7f7f8] px-3 py-2.5"><p className="whitespace-pre-wrap text-sm">{item.body}</p><p className="mt-1 text-[10px] text-[#86868b]">{item.scope === "all" ? "All portal members" : item.department} · {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></article>)}{announcements.length === 0 && <p className="py-3 text-xs text-[#86868b]">No announcements yet.</p>}</div></div></section>}
      <section className="grid min-h-[65vh] overflow-hidden rounded-3xl border border-black/[0.06] bg-white md:grid-cols-[280px_1fr]">
        <aside className="border-b border-black/[0.06] p-4 md:border-b-0 md:border-r"><h2 className="px-2 pb-3 text-sm font-semibold">Portal members</h2><div className="max-h-56 space-y-1 overflow-y-auto md:max-h-[60vh]">{loading && <p className="p-3 text-sm text-[#86868b]">Loading members…</p>}{members.map((member) => { const online = onlineMembers.has(member.id); return <button key={member.id} onClick={() => setSelectedId(member.id)} className={`w-full rounded-xl px-3 py-2.5 text-left ${selectedId === member.id ? "bg-blue-50 text-blue-900" : "hover:bg-[#f5f5f7]"}`}><span className="flex items-center gap-2 text-sm font-medium"><span aria-label={online ? "Online" : "Offline"} title={online ? "Online now" : "Offline"} className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`}/>{member.name}</span><span className="ml-[18px] mt-0.5 block text-xs text-[#86868b]">{roleName(member.role)}{member.department ? ` · ${member.department}` : ""} · {online ? "Online" : "Offline"}</span></button>; })}</div><p className="mt-3 flex items-center gap-3 px-2 text-[10px] text-[#86868b]"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"/>Online</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"/>Offline</span></p></aside>
        <div className="flex min-h-[55vh] flex-col">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#0071e3]"/><div><h2 className="text-sm font-semibold">{selected?.name ?? "Choose a member"}</h2><p className="text-xs text-[#86868b]">{selected ? `${roleName(selected.role)}${selected.department ? ` · ${selected.department}` : ""}` : "No members found"}</p></div></div><button disabled={!selected} onClick={callMember} className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 px-3 text-xs font-medium hover:bg-[#f5f5f7] disabled:opacity-40"><Phone className="h-4 w-4"/> Voice call</button></div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] p-4">{voiceMessages.map((message) => { const mine = message.senderId === session?.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-blue-50" : "rounded-bl-md border border-black/[0.05] bg-white"}`}><p className="mb-2 text-xs font-medium text-[#55555a]">{mine ? "Voice message sent" : "Voice message"} · {new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</p><audio controls preload="none" src={message.audioUrl} aria-label={`Voice message from ${mine ? "you" : selected?.name ?? "member"}`} className="max-w-full"/><p className="mt-1 text-[10px] text-[#86868b]">{Math.floor(message.durationSeconds / 60)}:{String(message.durationSeconds % 60).padStart(2, "0")}</p></article></div>; })}{messages.map((message) => { const mine = message.senderId === session?.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-[#0071e3] text-white" : "rounded-bl-md border border-black/[0.05] bg-white"}`}><p className="whitespace-pre-wrap text-sm">{message.body}</p><time className={`mt-1 block text-right text-[10px] ${mine ? "text-white/70" : "text-[#86868b]"}`}>{new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</time></article></div>; })}{!loading && selected && messages.length === 0 && voiceMessages.length === 0 && <p className="py-12 text-center text-sm text-[#86868b]">Start a private conversation with {selected.name}.</p>}</div>
          <form onSubmit={submit} className="flex items-end gap-2 border-t border-black/[0.06] p-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={4000} placeholder="Write a message…" className="min-h-11 flex-1 resize-y rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-[#0071e3]"/><button disabled={sending || !draft.trim() || !selected} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0071e3] px-4 text-sm font-medium text-white disabled:opacity-50">{sending ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}<span className="hidden sm:inline">Send</span></button></form>
        </div>
      </section>
    </div>
  </main>;
}

export default function MessagesRoute() { return <ProtectedContent roles={["faculty", "hod", "admin"]}><MessagesPage /></ProtectedContent>; }
