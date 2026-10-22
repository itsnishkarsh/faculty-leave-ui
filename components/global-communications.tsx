"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, LoaderCircle, Mic, MicOff, Phone, PhoneOff, Send, Square, Volume2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendVoiceMessage } from "@/lib/voice-message-store";

type CallInfo = { id: string; peerId: string; peerName: string; direction: "incoming" | "outgoing" | "active" | "missed" };
type SignalRow = { id: string; call_id: string; sender_id: string; signal_type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null };
type AudioMeter = { source: MediaStreamAudioSourceNode; analyser: AnalyserNode };

export function GlobalCommunications() {
  const { session } = useAuth();
  const [notice, setNotice] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [call, setCall] = useState<CallInfo | null>(null);
  const [callError, setCallError] = useState("");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localLevel, setLocalLevel] = useState(0);
  const [remoteLevel, setRemoteLevel] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [voicemailStatus, setVoicemailStatus] = useState<"idle" | "prompting" | "recording" | "uploading" | "sent">("idle");
  const [voicemailError, setVoicemailError] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const signalChannel = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const remoteVolumeRef = useRef(1);
  const audioContext = useRef<AudioContext | null>(null);
  const ringTimer = useRef<number | null>(null);
  const ringTimeout = useRef<number | null>(null);
  const lastSwooshCallId = useRef<string | null>(null);
  const voicemailRecorder = useRef<MediaRecorder | null>(null);
  const voicemailStream = useRef<MediaStream | null>(null);
  const voicemailChunks = useRef<BlobPart[]>([]);
  const voicemailTimer = useRef<number | null>(null);
  const voicemailStartedAt = useRef(0);
  const discardVoicemail = useRef(false);
  const meters = useRef<{ local: AudioMeter | null; remote: AudioMeter | null }>({ local: null, remote: null });
  const meterFrames = useRef<{ local: number | null; remote: number | null }>({ local: null, remote: null });
  const soundEnabled = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const seenSignals = useRef(new Set<string>());
  const callRef = useRef<CallInfo | null>(null);
  const membersRef = useRef(new Map<string, string>());

  useEffect(() => { callRef.current = call; }, [call]);

  useEffect(() => { soundEnabled.current = soundOn; }, [soundOn]);

  const stopRingtone = useCallback(() => {
    if (ringTimer.current !== null) window.clearInterval(ringTimer.current);
    ringTimer.current = null;
  }, []);

  const playRingtoneBurst = useCallback((direction: "incoming" | "outgoing") => {
    const ctx = audioContext.current;
    if (!ctx || ctx.state !== "running") return;
    const notes = direction === "incoming" ? [784, 659, 784] : [440, 480];
    notes.forEach((frequency, index) => {
      const start = ctx.currentTime + index * (direction === "outgoing" ? 0.24 : 0.19);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = direction === "outgoing" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(direction === "outgoing" ? 0.2 : 0.07, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (direction === "outgoing" ? 0.19 : 0.16));
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + (direction === "outgoing" ? 0.2 : 0.17));
    });
  }, []);

  const startRingtone = useCallback((direction: "incoming" | "outgoing") => {
    stopRingtone();
    playRingtoneBurst(direction);
    ringTimer.current = window.setInterval(() => playRingtoneBurst(direction), direction === "outgoing" ? 3000 : 3000);
  }, [playRingtoneBurst, stopRingtone]);

  const playHangupSwoosh = useCallback((callId?: string) => {
    if (!callId || lastSwooshCallId.current === callId || !soundEnabled.current || !audioContext.current) return;
    lastSwooshCallId.current = callId;
    const ctx = audioContext.current;
    const play = () => {
      const start = ctx.currentTime + 0.02;
      const oscillator = ctx.createOscillator();
      const toneGain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(760, start);
      oscillator.frequency.exponentialRampToValueAtTime(190, start + 0.38);
      toneGain.gain.setValueAtTime(0.0001, start);
      toneGain.gain.exponentialRampToValueAtTime(0.045, start + 0.04);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      oscillator.connect(toneGain);
      toneGain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.42);
      const count = Math.floor(ctx.sampleRate * 0.4);
      const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < count; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / count);
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noise.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, start);
      filter.frequency.exponentialRampToValueAtTime(320, start + 0.38);
      noiseGain.gain.setValueAtTime(0.0001, start);
      noiseGain.gain.exponentialRampToValueAtTime(0.018, start + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(start);
      noise.stop(start + 0.42);
    };
    if (ctx.state === "suspended") void ctx.resume().then(play).catch(() => undefined);
    else play();
  }, []);

  const stopMeters = useCallback(() => {
    for (const side of ["local", "remote"] as const) {
      const frame = meterFrames.current[side];
      if (frame !== null) cancelAnimationFrame(frame);
      meterFrames.current[side] = null;
      meters.current[side]?.source.disconnect();
      meters.current[side] = null;
    }
    setLocalLevel(0);
    setRemoteLevel(0);
  }, []);

  const attachMeter = useCallback((stream: MediaStream, side: "local" | "remote") => {
    const ctx = audioContext.current ?? new AudioContext();
    audioContext.current = ctx;
    const previousFrame = meterFrames.current[side];
    if (previousFrame !== null) cancelAnimationFrame(previousFrame);
    meters.current[side]?.source.disconnect();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    meters.current[side] = { source, analyser };
    const samples = new Uint8Array(analyser.fftSize);
    let lastUpdate = 0;
    const update = (now: number) => {
      analyser.getByteTimeDomainData(samples);
      let squareSum = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        squareSum += normalized * normalized;
      }
      if (now - lastUpdate >= 70) {
        const level = Math.min(1, Math.sqrt(squareSum / samples.length) * 5);
        if (side === "local") setLocalLevel(level);
        else setRemoteLevel(level);
        lastUpdate = now;
      }
      meterFrames.current[side] = requestAnimationFrame(update);
    };
    meterFrames.current[side] = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    if (!call || call.direction === "active" || call.direction === "missed" || !soundOn) {
      stopRingtone();
      return;
    }
    startRingtone(call.direction);
    return stopRingtone;
  }, [call, soundOn, startRingtone, stopRingtone]);

  useEffect(() => {
    if (!soundOn) return;
    const unlock = () => {
      try {
        const ctx = audioContext.current ?? new AudioContext();
        audioContext.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
      } catch { /* Audio is optional and browser-controlled. */ }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [soundOn]);

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

  const cleanupCall = useCallback((withSwoosh = false) => {
    if (withSwoosh) playHangupSwoosh(callRef.current?.id);
    callRef.current = null;
    stopRingtone();
    if (ringTimeout.current !== null) window.clearTimeout(ringTimeout.current);
    ringTimeout.current = null;
    if (voicemailTimer.current !== null) window.clearInterval(voicemailTimer.current);
    voicemailTimer.current = null;
    discardVoicemail.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (voicemailRecorder.current?.state === "recording") voicemailRecorder.current.stop();
    voicemailStream.current?.getTracks().forEach((track) => track.stop());
    voicemailStream.current = null;
    voicemailRecorder.current = null;
    voicemailChunks.current = [];
    stopMeters();
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    if (signalChannel.current) void getSupabaseBrowserClient().removeChannel(signalChannel.current);
    signalChannel.current = null;
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
    pendingCandidates.current = [];
    seenSignals.current.clear();
    setAudioBlocked(false);
    setCall(null); setMuted(false); setBusy(false);
  }, [playHangupSwoosh, stopMeters, stopRingtone]);

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
      if (ringTimeout.current !== null) window.clearTimeout(ringTimeout.current);
      ringTimeout.current = null;
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
    if (row.signal_type === "decline" || row.signal_type === "hangup") cleanupCall(true);
  }, [cleanupCall, session, writeSignal]);

  const preparePeer = useCallback(async (callId: string) => {
    if (!session) throw new Error("Sign in again before placing a call.");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Voice calls need a supported browser and a secure HTTPS connection.");
    const audioContextForCall = audioContext.current ?? new AudioContext();
    audioContext.current = audioContextForCall;
    await audioContextForCall.resume().catch(() => undefined);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
      },
      video: false,
    });
    localStream.current = stream;
    attachMeter(stream, "local");
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnection.current = pc;
    stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] ?? new MediaStream([event.track]);
      attachMeter(incomingStream, "remote");
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = incomingStream;
        remoteAudio.current.volume = remoteVolumeRef.current;
        void remoteAudio.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      }
    };
    pc.onicecandidate = (event) => { if (event.candidate) void writeSignal(callId, "ice", event.candidate.toJSON()).catch((error) => setCallError(error.message)); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setCallError("Could not connect directly. This network may need a TURN relay service.");
      if (pc.connectionState === "connected") setCallError("");
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected") setCallError("The network connection is unstable. Trying to reconnect…");
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") setCallError("");
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
  }, [attachMeter, processSignal, session, writeSignal]);

  const startCall = useCallback(async (peerId: string, peerName: string) => {
    if (!session || callRef.current) return;
    setBusy(true); setCallError("");
    try {
      const ctx = audioContext.current ?? new AudioContext();
      audioContext.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
    } catch { /* Call audio will still use the browser's default playback. */ }
    try {
      const { data, error } = await getSupabaseBrowserClient().from("voice_calls").insert({ caller_id: session.id, callee_id: peerId }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Unable to start the call.");
      const info = { id: data.id, peerId, peerName, direction: "outgoing" as const };
      callRef.current = info; setCall(info);
      ringTimeout.current = window.setTimeout(() => {
        const current = callRef.current;
        if (current?.id !== data.id || current.direction !== "outgoing") return;
        const missed: CallInfo = { ...current, direction: "missed" };
        cleanupCall();
        callRef.current = missed;
        setCall(missed);
        void getSupabaseBrowserClient().from("voice_calls").update({ status: "ended", updated_at: new Date().toISOString() }).eq("id", data.id);
      }, 30_000);
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
    playHangupSwoosh(active?.id);
    if (active && session) {
      try {
        await writeSignal(active.id, decline ? "decline" : "hangup");
        await getSupabaseBrowserClient().from("voice_calls").update({ status: decline ? "declined" : "ended", updated_at: new Date().toISOString() }).eq("id", active.id);
      } catch { /* Local cleanup should still finish if signaling has already ended. */ }
    }
    cleanupCall();
  }, [cleanupCall, playHangupSwoosh, session, writeSignal]);

  const startVoicemail = useCallback(async () => {
    const missedCall = callRef.current;
    if (!session || !missedCall || missedCall.direction !== "missed") return;
    setVoicemailError("");
    setVoicemailStatus("prompting");
    setRecordingSeconds(0);
    discardVoicemail.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: { ideal: true }, noiseSuppression: { ideal: true }, autoGainControl: { ideal: true } }, video: false });
      voicemailStream.current = stream;
      attachMeter(stream, "local");
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voicemailRecorder.current = recorder;
      voicemailChunks.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) voicemailChunks.current.push(event.data); };
      recorder.onstop = () => {
        if (voicemailTimer.current !== null) window.clearInterval(voicemailTimer.current);
        voicemailTimer.current = null;
        stream.getTracks().forEach((track) => track.stop());
        voicemailStream.current = null;
        voicemailRecorder.current = null;
        if (discardVoicemail.current) {
          voicemailChunks.current = [];
          setVoicemailStatus("idle");
          setRecordingSeconds(0);
          return;
        }
        const duration = Math.min(120, Math.max(1, Math.round((Date.now() - voicemailStartedAt.current) / 1000)));
        const audio = new Blob(voicemailChunks.current, { type: recorder.mimeType || "audio/webm" });
        voicemailChunks.current = [];
        setVoicemailStatus("uploading");
        void sendVoiceMessage(session.id, missedCall.peerId, audio, duration)
          .then(() => setVoicemailStatus("sent"))
          .catch((cause) => { setVoicemailError(cause instanceof Error ? cause.message : "Unable to send the voice message."); setVoicemailStatus("idle"); });
      };

      const beginRecording = () => {
        if (recorder.state !== "inactive" || discardVoicemail.current || callRef.current?.id !== missedCall.id) return;
        const ctx = audioContext.current ?? new AudioContext();
        audioContext.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
        const tone = ctx.createOscillator();
        const toneGain = ctx.createGain();
        tone.type = "sine";
        tone.frequency.value = 880;
        toneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        toneGain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.02);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
        tone.connect(toneGain); toneGain.connect(ctx.destination);
        tone.start(); tone.stop(ctx.currentTime + 0.23);
        voicemailStartedAt.current = Date.now();
        window.setTimeout(() => {
          if (discardVoicemail.current || callRef.current?.id !== missedCall.id || recorder.state !== "inactive") return;
          recorder.start(250);
          setVoicemailStatus("recording");
        }, 250);
        voicemailTimer.current = window.setInterval(() => {
          const seconds = Math.min(120, Math.floor((Date.now() - voicemailStartedAt.current) / 1000));
          setRecordingSeconds(seconds);
          if (seconds >= 120 && recorder.state === "recording") recorder.stop();
        }, 250);
      };

      if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
        const introduction = new SpeechSynthesisUtterance("The person you are calling is unavailable. Please leave your voice message after the tone.");
        introduction.lang = "en-IN";
        introduction.rate = 0.95;
        introduction.voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("en-in")) ?? null;
        introduction.onend = beginRecording;
        introduction.onerror = beginRecording;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(introduction);
      } else beginRecording();
    } catch (cause) {
      voicemailStream.current?.getTracks().forEach((track) => track.stop());
      voicemailStream.current = null;
      voicemailRecorder.current = null;
      setVoicemailStatus("idle");
      setVoicemailError(cause instanceof Error ? cause.message : "Allow microphone access to record a voice message.");
    }
  }, [attachMeter, session]);

  function finishVoicemail() {
    if (voicemailRecorder.current?.state === "recording") voicemailRecorder.current.stop();
  }

  function discardVoicemailRecording() {
    discardVoicemail.current = true;
    discardVoicemail.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (voicemailRecorder.current?.state === "recording") {
      voicemailRecorder.current.stop();
      return;
    }
    if (voicemailTimer.current !== null) window.clearInterval(voicemailTimer.current);
    voicemailTimer.current = null;
    voicemailStream.current?.getTracks().forEach((track) => track.stop());
    voicemailStream.current = null;
    voicemailRecorder.current = null;
    setVoicemailStatus("idle");
  }

  useEffect(() => {
    if (!session) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let messageToastTimer: number | undefined;
    const loadDirectory = async () => {
      const { data } = await supabase.rpc("portal_directory");
      if (active) membersRef.current = new Map((data ?? []).map((member: { id: string; full_name: string }) => [member.id, member.full_name]));
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
    const voiceMessageChannel = supabase.channel(`incoming-voice-messages-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_messages", filter: `recipient_id=eq.${session.id}` }, (event) => {
        const row = event.new as { sender_id: string };
        const sender = membersRef.current.get(row.sender_id) ?? "A portal member";
        setNotice(`${sender} left you a voice message.`);
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
        if (callRef.current?.id === row.id && (row.status === "declined" || row.status === "ended")) cleanupCall(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "voice_calls", filter: `callee_id=eq.${session.id}` }, (event) => {
        const row = event.new as { id: string; status: string };
        if (callRef.current?.id === row.id && (row.status === "declined" || row.status === "ended")) cleanupCall(true);
      }).subscribe();
    void supabase.from("voice_calls").select("id, caller_id, created_at").eq("callee_id", session.id).eq("status", "ringing").gte("created_at", new Date(Date.now() - 60_000).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data && active && !callRef.current) { const info: CallInfo = { id: data.id, peerId: data.caller_id, peerName: membersRef.current.get(data.caller_id) ?? "Portal member", direction: "incoming" }; callRef.current = info; setCall(info); ping(); } });
    const beginCall = (event: Event) => { const detail = (event as CustomEvent<{ id: string; name: string }>).detail; if (detail) void startCall(detail.id, detail.name); };
    window.addEventListener("portal-start-call", beginCall);
    return () => { active = false; window.removeEventListener("portal-start-call", beginCall); if (messageToastTimer) window.clearTimeout(messageToastTimer); void supabase.removeChannel(messageChannel); void supabase.removeChannel(voiceMessageChannel); void supabase.removeChannel(announcementChannel); void supabase.removeChannel(callChannel); cleanupCall(); };
  }, [cleanupCall, ping, session, startCall]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem("portal-message-sound", next ? "on" : "off"); } catch { /* optional preference */ }
    if (next) { const ctx = audioContext.current ?? new AudioContext(); audioContext.current = ctx; void ctx.resume(); }
  }
  useEffect(() => { try { setSoundOn(localStorage.getItem("portal-message-sound") !== "off"); } catch { /* optional preference */ } }, []);

  return <>
    <Link href="/messages" className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#1d1d1f] px-4 text-sm font-medium text-white shadow-lg hover:bg-black"><MessageIcon /> Messages</Link>
    <button onClick={toggleSound} aria-label={soundOn ? "Turn call and message sounds off" : "Turn call and message sounds on"} aria-pressed={soundOn} title={soundOn ? "Turn call and message sounds off" : "Turn call and message sounds on"} className="fixed bottom-[5.25rem] right-7 z-40 rounded-full border border-black/10 bg-white p-2.5 text-[#55555a] shadow-md hover:bg-[#f5f5f7]">{soundOn ? <Bell className="h-4 w-4"/> : <BellOff className="h-4 w-4"/>}</button>
    {notice && <div role="status" className="fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xl"><Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]"/><div><p className="text-xs font-semibold">Portal update</p><p className="mt-1 text-sm text-[#55555a]">{notice}</p><Link href="/messages" onClick={() => setNotice("")} className="mt-2 inline-block text-xs font-semibold text-[#0071e3]">Open messages</Link></div><button onClick={() => setNotice("")} aria-label="Dismiss" className="ml-auto text-[#86868b]"><X className="h-4 w-4"/></button></div>}
    {call && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center"><section className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${call.direction === "missed" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-[#0071e3]"}`}><Phone className="h-6 w-6"/></div><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#86868b]">{call.direction === "incoming" ? "Incoming voice call" : call.direction === "outgoing" ? "Calling" : call.direction === "missed" ? "No answer" : "Voice call"}</p><h2 className="mt-1 text-xl font-semibold">{call.peerName}</h2><p className="mt-2 text-sm text-[#6e6e73]">{call.direction === "missed" ? "They didn’t pick up. You can leave a voice message." : audioBlocked ? "Audio playback was blocked. Enable the speaker below." : callError || (call.direction === "incoming" ? "Accept to connect your microphone." : call.direction === "outgoing" ? "Waiting for them to answer…" : "Connected. Speak normally.")}</p>
      {call.direction === "missed" && <div className="mt-5 space-y-3">
        {voicemailStatus === "idle" && <div className="flex justify-center gap-3"><button onClick={() => void startVoicemail()} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-medium text-white"><Mic className="h-4 w-4"/> Leave voice message</button><button onClick={() => cleanupCall()} className="h-11 rounded-full border border-black/10 px-4 text-sm font-medium">Close</button></div>}
        {voicemailStatus === "prompting" && <div><p className="text-xs text-[#6e6e73]">An automated voice will introduce your message, then recording begins.</p><button onClick={discardVoicemailRecording} className="mt-3 h-10 rounded-full border border-black/10 px-4 text-sm">Cancel</button></div>}
        {voicemailStatus === "recording" && <div className="space-y-3"><AudioLevelMeter label="Recording" level={localLevel}/><p className="font-mono text-sm tabular-nums">{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")} / 02:00</p><div className="flex justify-center gap-3"><button onClick={finishVoicemail} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-medium text-white"><Send className="h-4 w-4"/> Finish & send</button><button onClick={discardVoicemailRecording} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm"><Square className="h-3.5 w-3.5"/> Discard</button></div></div>}
        {voicemailStatus === "uploading" && <p className="inline-flex items-center gap-2 text-sm text-[#6e6e73]"><LoaderCircle className="h-4 w-4 animate-spin"/> Sending your voice message…</p>}
        {voicemailStatus === "sent" && <div><p className="text-sm font-medium text-green-700">Voice message sent to {call.peerName}.</p><button onClick={() => cleanupCall()} className="mt-3 h-10 rounded-full border border-black/10 px-5 text-sm font-medium">Done</button></div>}
        {voicemailError && <p role="alert" className="text-xs text-red-600">{voicemailError}</p>}
      </div>}
      {call.direction !== "missed" && <>
      <div className="mt-5 grid grid-cols-2 gap-3"><AudioLevelMeter label="Your microphone" level={localLevel}/><AudioLevelMeter label={call.peerName} level={remoteLevel}/></div>
      <audio ref={remoteAudio} autoPlay playsInline aria-label={`Audio from ${call.peerName}`} className="hidden"/>
      <label className="mt-3 flex items-center gap-3 text-xs text-[#6e6e73]"><Volume2 className="h-4 w-4 shrink-0"/><span>Speaker</span><input aria-label="Speaker volume" type="range" min="0" max="1" step="0.05" value={remoteVolume} onChange={(event) => { const volume = Number(event.target.value); remoteVolumeRef.current = volume; setRemoteVolume(volume); if (remoteAudio.current) remoteAudio.current.volume = volume; }} className="w-full accent-[#0071e3]"/></label>
      {audioBlocked && <button onClick={() => { const audio = remoteAudio.current; if (!audio) return; audio.volume = remoteVolume; void audio.play().then(() => setAudioBlocked(false)).catch(() => setCallError("Allow audio playback in your browser settings.")); }} className="mt-3 rounded-full bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">Enable speaker audio</button>}
      {call.direction === "incoming" ? <div className="mt-6 flex justify-center gap-3"><button disabled={busy} onClick={() => void endCall(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-medium text-white"><PhoneOff className="h-4 w-4"/> Decline</button><button disabled={busy} onClick={() => void acceptCall()} className="inline-flex h-11 items-center gap-2 rounded-full bg-green-600 px-5 text-sm font-medium text-white">{busy ? "Connecting…" : "Accept"}</button></div> : <div className="mt-6 flex justify-center gap-3"><button disabled={!peerConnection.current} onClick={() => { const next = !muted; setMuted(next); localStream.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); }} className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-medium">{muted ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}{muted ? "Unmute" : "Mute"}</button><button onClick={() => void endCall()} className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-medium text-white"><PhoneOff className="h-4 w-4"/> End call</button></div>}
      </>}
    </section></div>}
  </>;
}

function MessageIcon() { return <span aria-hidden="true" className="text-base">✉</span>; }

function AudioLevelMeter({ label, level }: { label: string; level: number }) {
  const speaking = level > 0.035;
  const heights = [0.45, 0.7, 1, 0.58, 0.85, 0.52, 0.92, 0.62];
  return <div aria-label={`${label}: ${speaking ? "speaking" : "silent"}`} className="rounded-xl bg-[#f5f5f7] px-3 py-2">
    <div className="flex h-8 items-center justify-center gap-1" aria-hidden="true">{heights.map((scale, index) => <span key={index} className={`w-1 rounded-full transition-[height,background-color] duration-100 ${speaking ? "bg-[#0071e3]" : "bg-[#c7c7cc]"}`} style={{ height: `${Math.max(4, level * scale * 32)}px` }}/>)}</div>
    <p className="truncate text-[10px] font-medium text-[#6e6e73]">{speaking ? "Speaking" : label}</p>
  </div>;
}
