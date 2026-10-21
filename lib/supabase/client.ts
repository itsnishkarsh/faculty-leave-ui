import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase is not configured. Add the project URL and publishable key to .env.local, then restart the dev server.");
  }
  client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true },
  });
  return client;
}
