import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type LeaveMessage = {
  id: string;
  leaveRequestId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type CallbackRequest = {
  id: string;
  leaveRequestId: string;
  requesterId: string;
  phone: string;
  preferredTime: string;
  note: string | null;
  status: "open" | "contacted" | "closed";
  handledBy: string | null;
  createdAt: string;
};

export async function readLeaveMessages(leaveRequestId: string): Promise<LeaveMessage[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("leave_messages")
    .select("id, leave_request_id, sender_id, body, created_at")
    .eq("leave_request_id", leaveRequestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, leaveRequestId: row.leave_request_id, senderId: row.sender_id, body: row.body, createdAt: row.created_at }));
}

export async function sendLeaveMessage(leaveRequestId: string, senderId: string, body: string) {
  const message = body.trim();
  if (!message || message.length > 4000) throw new Error("Messages must be between 1 and 4,000 characters.");
  const { error } = await getSupabaseBrowserClient().from("leave_messages").insert({ leave_request_id: leaveRequestId, sender_id: senderId, body: message });
  if (error) throw new Error(error.message);
}

export async function readCallbackRequests(leaveRequestId: string): Promise<CallbackRequest[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("leave_callback_requests")
    .select("id, leave_request_id, requester_id, phone, preferred_time, note, status, handled_by, created_at")
    .eq("leave_request_id", leaveRequestId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    leaveRequestId: row.leave_request_id,
    requesterId: row.requester_id,
    phone: row.phone,
    preferredTime: row.preferred_time,
    note: row.note,
    status: row.status as CallbackRequest["status"],
    handledBy: row.handled_by,
    createdAt: row.created_at,
  }));
}

export async function createCallbackRequest(input: { leaveRequestId: string; requesterId: string; phone: string; preferredTime: string; note: string }) {
  const { error } = await getSupabaseBrowserClient().from("leave_callback_requests").insert({
    leave_request_id: input.leaveRequestId,
    requester_id: input.requesterId,
    phone: input.phone.trim(),
    preferred_time: input.preferredTime.trim(),
    note: input.note.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateCallbackRequest(id: string, status: CallbackRequest["status"], handledBy: string) {
  const { error } = await getSupabaseBrowserClient().from("leave_callback_requests").update({ status, handled_by: handledBy }).eq("id", id);
  if (error) throw new Error(error.message);
}

export function subscribeToConversation(leaveRequestId: string, onChange: () => void) {
  const channel = getSupabaseBrowserClient()
    .channel(`leave-conversation-${leaveRequestId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "leave_messages", filter: `leave_request_id=eq.${leaveRequestId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "leave_callback_requests", filter: `leave_request_id=eq.${leaveRequestId}` }, onChange)
    .subscribe();
  return () => { void getSupabaseBrowserClient().removeChannel(channel); };
}
