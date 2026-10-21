"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, Mic, MicOff, Phone, PhoneOff, Volume2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CallInfo = { id: string; peerId: string; peerName: string; direction: "incoming" | "outgoing" | "active" };
type SignalRow = { id: string; call_id: string; sender_id: string; signal_type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null };

export function GlobalCommunications() {
  const { session } = useAuth();
  const [notice, setNotice] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [call, setCall] = useState<CallInfo | null>(null);
  const [callError, setCallError] = useState("");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const signalChannel = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const seenSignals = useRef(new Set<string>());
  const callRef = useRef<CallInfo | null>(null);
  const membersRef = useRef(new Map<string, string>());

  useEffect(() => { callRef.current = call; }, [call]);

  useEffect(() => { soundEnabled.current = soundOn; }, [soundOn]);
  const ping = useCallback(() => {
    if (!soundEnabled.current) return;
    try {
      const ctx = audioContext.current ?? new AudioContext();
      audioContext.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.23);
    } catch { /* Sound is optional and browser-controlled. */ }
  }, []);

  const cleanupCall = useCallback(() => {
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    if (signalChannel.current) void getSupabaseBrowserClient().removeChannel(signalChannel.current);
    signalChannel.current = null;
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
    pendingCandidates.current = [];
    seenSignals.current.clear();
    setCall(null); setMuted(false); setBusy(false);
  }, []);

  const writeSignal = useCallback(async (callId: string, signalType: string, payload: unknown = null) => {
    if (!session) return;
    const { error } = await getSupabaseBrowserClient().from("voice_call_signals").insert({ call_id: callId, sender_id: session.id, signal_type: signalType, payload });
    if (error) throw new Error(error.message);
  }, [session]);

  const processSignal = useCallback(async (row: SignalRow) => {
    if (!session || row.sender_id === session.id || seenSignals.current.has(row.id)) return;
    seenSignals.current.add(row.id);
    const pc = peerConnection.current;
    if (!pc) return;
    if (row.signal_type === "offer" && row.payload && callRef.current?.direction === "incoming") {
      await pc.setRemoteDescription(new RTCSessionDescription(row.payload as RTCSessionDescriptionInit));
      for (const candidate of pendingCandidates.current.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await writeSignal(row.call_id, "answer", answer);
      setCall((current) => current ? { ...current, direction: "active" } : current);
      return;
    }
    if (row.signal_type === "answer" && row.payload && callRef.current?.direction === "outgoing") {
      await pc.setRemoteDescription(new RTCSessionDescription(row.payload as RTCSessionDescriptionInit));
      for (const candidate of pendingCandidates.current.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      setCall((current) => current ? { ...current, direction: "active" } : current);
      return;
    }
    if (row.signal_type === "ice" && row.payload) {
      const candidate = row.payload as RTCIceCandidateInit;
      if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      else pendingCandidates.current.push(candidate);
      return;
    }
    if (row.signal_type === "decline" || row.signal_type === "hangup") cleanupCall();
  }, [cleanupCall, session, writeSignal]);

  const preparePeer = useCallback(async (callId: string) => {
    if (!session) throw new Error("Sign in again before placing a call.");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Voice calls need a supported browser and a secure HTTPS connection.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnection.current = pc;
    stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => { if (remoteAudio.current) { remoteAudio.current.srcObject = event.streams[0]; void remoteAudio.current.play().catch(() => undefined); } };
    pc.onicecandidate = (event) => { if (event.candidate) void writeSignal(callId, "ice", event.candidate.toJSON()).catch((error) => setCallError(error.message)); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setCallError("Could not connect directly. This network may need a TURN relay service.");
      if (pc.connectionState === "connected") setCallError("");
    };
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`voice-signals-${callId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_call_signals", filter: `call_id=eq.${callId}` }, (payload) => { void processSignal(payload.new as SignalRow).catch((error) => setCallError(error instanceof Error ? error.message : "Call signaling failed.")); })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data } = await supabase.from("voice_call_signals").select("id, call_id, sender_id, signal_type, payload").eq("call_id", callId).order("created_at");
          for (const row of (data ?? []) as SignalRow[]) await processSignal(row).catch((error) => setCallError(error instanceof Error ? error.message : "Call signaling failed."));
        }
      });
    signalChannel.current = channel;
  }, [processSignal, session, writeSignal]);

  const startCall = useCallback(async (peerId: string, peerName: string) => {
    if (!session || callRef.current) return;
    setBusy(true); setCallError("");
    try {
      const { data, error } = await getSupabaseBrowserClient().from("voice_calls").insert({ caller_id: session.id, callee_id: peerId }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Unable to start the call.");
      const info = { id: data.id, peerId, peerName, direction: "outgoing" as const };
      callRef.current = info; setCall(info);
      await preparePeer(data.id);
      const offer = await peerConnection.current!.createOffer();
      await peerConnection.current!.setLocalDescription(offer);
      await writeSignal(data.id, "offer", offer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start voice call.";
      setCallError(message); setNotice(message);
      cleanupCall();
    } finally { setBusy(false); }
  }, [cleanupCall, preparePeer, session, writeSignal]);

  const acceptCall = useCallback(async () => {
    const active = callRef.current;
    if (!active || active.direction !== "incoming") return;
    setBusy(true); setCallError("");
    try {
      await preparePeer(active.id);
      const { error } = await getSupabaseBrowserClient().from("voice_calls").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", active.id);
      if (error) throw new Error(error.message);
      const supabase = getSupabaseBrowserClient();
      let offer: SignalRow | null = null;
      for (let attempt = 0; attempt < 20 && !offer; attempt += 1) {
        const { data } = await supabase.from("voice_call_signals").select("id, call_id, sender_id, signal_type, payload").eq("call_id", active.id).eq("signal_type", "offer").order("created_at").limit(1).maybeSingle();
        offer = data as SignalRow | null;
        if (!offer) await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (offer) await processSignal(offer);
      else throw new Error("The caller's offer did not arrive. Ask them to call again.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to answer the call.";
      setCallError(message); setNotice(message);
      await getSupabaseBrowserClient().from("voice_calls").update({ status: "ended", updated_at: new Date().toISOString() }).eq("id", active.id);
      cleanupCall();
    } finally { setBusy(false); }
  }, [cleanupCall, preparePeer, processSignal]);

  const endCall = useCallback(async (decline = false) => {
    const active = callRef.current;
    if (active && session) {
      try {
        await writeSignal(active.id, decline ? "decline" : "hangup");
        await getSupabaseBrowserClient().from("voice_calls").update({ status: decline ? "declined" : "ended", updated_at: new Date().toISOString() }).eq("id", active.id);
      } catch { /* Local cleanup should still finish if signaling has already ended. */ }
    }
    cleanupCall();
  }, [cleanupCall, session, writeSignal]);

  useEffect(() => {
    if (!session) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let messageToastTimer: number | undefined;
    const loadDirectory = async () => {
      const { data } = await supabase.rpc("portal_directory");
      if (active) membersRef.current = new Map((data ?? []).map((member) => [member.id, member.full_name]));
    };
    void loadDirectory();
    const messageChannel = supabase.channel(`incoming-direct-messages-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${session.id}` }, (event) => {
        const row = event.new as { sender_id: string; body: string };
        const sender = membersRef.current.get(row.sender_id) ?? "A portal member";
        setNotice(`${sender}: ${row.body.slice(0, 110)}${row.body.length > 110 ? "…" : ""}`);
        ping();
        if (messageToastTimer) window.clearTimeout(messageToastTimer);
        messageToastTimer = window.setTimeout(() => setNotice(""), 6500);
      }).subscribe();
    const announcementChannel = supabase.channel(`incoming-announcements-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portal_announcements" }, (event) => {
        const row = event.new as { sender_id: string; body: string; scope: string; department: string | null };
        if (row.sender_id === session.id) return;
        const sender = membersRef.current.get(row.sender_id) ?? "Portal administrator";
        const audience = row.scope === "all" ? "everyone" : row.department ?? "your department";
        setNotice(`Announcement for ${audience} from ${sender}: ${row.body.slice(0, 100)}${row.body.length > 100 ? "…" : ""}`);
        ping();
        if (messageToastTimer) window.clearTimeout(messageToastTimer);
        messageToastTimer = window.setTimeout(() => setNotice(""), 8000);
      }).subscribe();
    const callChannel = supabase.channel(`incoming-calls-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_calls", filter: `callee_id=eq.${session.id}` }, (event) => {
        const row = event.new as { id: string; caller_id: string; status: string };
        if (row.status !== "ringing") return;
        const info: CallInfo = { id: row.id, peerId: row.caller_id, peerName: membersRef.current.get(row.caller_id) ?? "Portal member", direction: "incoming" };
        callRef.current = info; setCall(info); ping();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "voice_calls", filter: `caller_id=eq.${session.id}` }, (event) => {
        const row = event.new as { id: string; status: string };
        if (callRef.current?.id === row.id && (row.status === "declined" || row.status === "ended")) cleanupCall();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "voice_calls", filter: `callee_id=eq.${session.id}` }, (event) => {
        const row = event.new as { id: string; status: string };
        if (callRef.current?.id === row.id && (row.status === "declined" || row.status === "ended")) cleanupCall();
      }).subscribe();
    void supabase.from("voice_calls").select("id, caller_id, created_at").eq("callee_id", session.id).eq("status", "ringing").gte("created_at", new Date(Date.now() - 60_000).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data && active && !callRef.current) { const info: CallInfo = { id: data.id, peerId: data.caller_id, peerName: membersRef.current.get(data.caller_id) ?? "Portal member", direction: "incoming" }; callRef.current = info; setCall(info); ping(); } });
    const beginCall = (event: Event) => { const detail = (event as CustomEvent<{ id: string; name: string }>).detail; if (detail) void startCall(detail.id, detail.name); };
    window.addEventListener("portal-start-call", beginCall);
    return () => { active = false; window.removeEventListener("portal-start-call", beginCall); if (messageToastTimer) window.clearTimeout(messageToastTimer); void supabase.removeChannel(messageChannel); void supabase.removeChannel(announcementChannel); void supabase.removeChannel(callChannel); cleanupCall(); };
  }, [cleanupCall, ping, session, startCall]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem("portal-message-sound", next ? "on" : "off"); } catch { /* optional preference */ }
    if (next) { const ctx = audioContext.current ?? new AudioContext(); audioContext.current = ctx; void ctx.resume(); }
  }
  useEffect(() => { try { setSoundOn(localStorage.getItem("portal-message-sound") === "on"); } catch { /* optional preference */ } }, []);

  return <>
    <Link href="/messages" className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#1d1d1f] px-4 text-sm font-medium text-white shadow-lg hover:bg-black"><MessageIcon /> Messages</Link>
    <button onClick={toggleSound} title={soundOn ? "Turn message sound off" : "Turn message sound on"} className="fixed bottom-[5.25rem] right-7 z-40 rounded-full border border-black/10 bg-white p-2.5 text-[#55555a] shadow-md hover:bg-[#f5f5f7]">{soundOn ? <Bell className="h-4 w-4"/> : <BellOff className="h-4 w-4"/>}</button>
    {notice && <div role="status" className="fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xl"><Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]"/><div><p className="text-xs font-semibold">New message</p><p className="mt-1 text-sm text-[#55555a]">{notice}</p><Link href="/messages" onClick={() => setNotice("")} className="mt-2 inline-block text-xs font-semibold text-[#0071e3]">Open messages</Link></div><button onClick={() => setNotice("")} aria-label="Dismiss" className="ml-auto text-[#86868b]"><X className="h-4 w-4"/></button></div>}
    {call && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center"><section className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#0071e3]"><Phone className="h-6 w-6"/></div><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#86868b]">{call.direction === "incoming" ? "Incoming voice call" : call.direction === "outgoing" ? "Calling" : "Voice call"}</p><h2 className="mt-1 text-xl font-semibold">{call.peerName}</h2><p className="mt-2 text-sm text-[#6e6e73]">{callError || (call.direction === "incoming" ? "Accept to connect your microphone." : call.direction === "outgoing" ? "Waiting for them to answer…" : "Connected. Speak normally.")}</p><audio ref={remoteAudio} autoPlay playsInline className="hidden"/>
      {call.direction === "incoming" ? <div className="mt-6 flex justify-center gap-3"><button disabled={busy} onClick={() => void endCall(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-medium text-white"><PhoneOff className="h-4 w-4"/> Decline</button><button disabled={busy} onClick={() => void acceptCall()} className="inline-flex h-11 items-center gap-2 rounded-full bg-green-600 px-5 text-sm font-medium text-white">{busy ? "Connecting…" : "Accept"}</button></div> : <div className="mt-6 flex justify-center gap-3"><button disabled={!peerConnection.current} onClick={() => { const next = !muted; setMuted(next); localStream.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); }} className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-medium">{muted ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}{muted ? "Unmute" : "Mute"}</button><button onClick={() => void endCall()} className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-medium text-white"><PhoneOff className="h-4 w-4"/> End call</button></div>}
    </section></div>}
  </>;
}

function MessageIcon() { return <span aria-hidden="true" className="text-base">✉</span>; }
