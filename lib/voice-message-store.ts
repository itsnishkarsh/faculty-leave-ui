import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type VoiceMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  durationSeconds: number;
  createdAt: string;
  audioUrl: string;
};

export async function sendVoiceMessage(senderId: string, recipientId: string, audio: Blob, durationSeconds: number) {
  if (!audio.size) throw new Error("The recording was empty. Please record your message again.");
  if (audio.size > 10 * 1024 * 1024) throw new Error("The voice message is too large. Keep recordings under 10 MB.");
  const mimeType = audio.type.split(";")[0] || "audio/webm";
  const extension = mimeType === "audio/mp4" ? "m4a" : mimeType === "audio/ogg" ? "ogg" : "webm";
  const objectPath = `${senderId}/${recipientId}/${crypto.randomUUID()}.${extension}`;
  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage.from("voice-messages").upload(objectPath, audio, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error: rowError } = await supabase.from("voice_messages").insert({
    sender_id: senderId,
    recipient_id: recipientId,
    object_path: objectPath,
    duration_seconds: Math.min(120, Math.max(1, Math.round(durationSeconds))),
  });
  if (rowError) {
    await supabase.storage.from("voice-messages").remove([objectPath]);
    throw new Error(rowError.message);
  }
}

export async function readVoiceMessages(userId: string, peerId: string): Promise<VoiceMessage[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("voice_messages")
    .select("id, sender_id, recipient_id, object_path, duration_seconds, created_at")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map(async (row) => {
    const { data: signed, error: signedError } = await supabase.storage.from("voice-messages").createSignedUrl(row.object_path, 3600);
    if (signedError || !signed) throw new Error(signedError?.message ?? "Unable to open this voice message.");
    return { id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, durationSeconds: row.duration_seconds, createdAt: row.created_at, audioUrl: signed.signedUrl };
  }));
}

export function subscribeToVoiceMessages(userId: string, onChange: () => void) {
  const channel = getSupabaseBrowserClient().channel(`voice-messages-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "voice_messages", filter: `recipient_id=eq.${userId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "voice_messages", filter: `sender_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => { void getSupabaseBrowserClient().removeChannel(channel); };
}
