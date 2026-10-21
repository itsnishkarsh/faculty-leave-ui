import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type DemoSeedResult = {
  createdAccounts: { name: string; email: string; role: string; department: string }[];
  password: string;
  seededRequests: number;
  demoOnly: true;
};

export async function seedDemoAccounts(): Promise<DemoSeedResult> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sign in as an administrator, then try again.");
  const response = await fetch("/api/admin/demo-seed", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = await response.json() as DemoSeedResult | { error?: string };
  if (!response.ok) throw new Error("error" in result ? result.error ?? "Could not create demo accounts." : "Could not create demo accounts.");
  return result as DemoSeedResult;
}
