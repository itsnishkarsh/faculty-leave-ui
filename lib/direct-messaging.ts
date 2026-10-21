import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type DirectoryMember = { id: string; name: string; role: string; department: string | null };
export type DirectMessage = { id: string; senderId: string; recipientId: string; body: string; createdAt: string; readAt: string | null };

export async function readDirectory(): Promise<DirectoryMember[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("portal_directory");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { id: string; full_name: string; role: string; department: string | null }) => ({ id: row.id, name: row.full_name, role: row.role, department: row.department }));
}

export async function readDirectMessages(userId: string, peerId: string): Promise<DirectMessage[]> {
  const { data, error } = await getSupabaseBrowserClient().from("direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at, readAt: row.read_at }));
}

export async function sendDirectMessage(senderId: string, recipientId: string, body: string) {
  const text = body.trim();
  if (!text || text.length > 4000) throw new Error("Messages must be between 1 and 4,000 characters.");
  const { error } = await getSupabaseBrowserClient().from("direct_messages").insert({ sender_id: senderId, recipient_id: recipientId, body: text });
  if (error) throw new Error(error.message);
}

export async function markDirectMessagesRead(userId: string, peerId: string) {
  const { error } = await getSupabaseBrowserClient().from("direct_messages").update({ read_at: new Date().toISOString() })
    .eq("sender_id", peerId).eq("recipient_id", userId).is("read_at", null);
  if (error) throw new Error(error.message);
}

export function subscribeToDirectMessages(userId: string, onChange: () => void) {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel(`direct-messages-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `sender_id=eq.${userId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
