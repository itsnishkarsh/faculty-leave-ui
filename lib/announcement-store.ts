import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type PortalAnnouncement = { id: string; senderId: string; scope: "all" | "department"; department: string | null; body: string; createdAt: string };

export async function readAnnouncements(): Promise<PortalAnnouncement[]> {
  const { data, error } = await getSupabaseBrowserClient().from("portal_announcements")
    .select("id, sender_id, scope, department, body, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, senderId: row.sender_id, scope: row.scope as PortalAnnouncement["scope"], department: row.department, body: row.body, createdAt: row.created_at }));
}

export async function sendAnnouncement(input: { senderId: string; scope: "all" | "department"; department: string | null; body: string }) {
  const body = input.body.trim();
  if (!body || body.length > 4000) throw new Error("Announcements must be between 1 and 4,000 characters.");
  const { error } = await getSupabaseBrowserClient().from("portal_announcements").insert({ sender_id: input.senderId, scope: input.scope, department: input.department, body });
  if (error) throw new Error(error.message);
}

export function subscribeToAnnouncements(onChange: () => void) {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel("portal-announcements")
    .on("postgres_changes", { event: "*", schema: "public", table: "portal_announcements" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
