import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserRole = "faculty" | "hod" | "admin";
export type PortalSession = { id: string; name: string; email: string; role: UserRole; department: string | null };
export type PortalProfile = { id: string; name: string; email: string; role: UserRole; department: string | null };

function publishSession(session: PortalSession | null, error: string | null = null) {
  window.dispatchEvent(new CustomEvent("faculty-portal-session", { detail: { session, error } }));
}

export function roleHome(role: UserRole) {
  return role === "faculty" ? "/" : role === "hod" ? "/hod" : "/admin";
}

export async function getPortalSession(user: User) {
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .select("id, email, full_name, role, department")
    .eq("id", user.id)
    .single();

  if (error || !data) return { session: null, error: "Your account profile is missing. Ask an administrator to check the Supabase profile row." };
  if (!["faculty", "hod", "admin"].includes(data.role)) return { session: null, error: "Your account has an unsupported portal role." };

  return {
    session: { id: data.id, email: data.email, name: data.full_name, role: data.role as UserRole, department: data.department ?? null },
    error: null,
  };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { session: null, error: error?.message ?? "Sign in failed." };
  const result = await getPortalSession(data.user);
  publishSession(result.session, result.error);
  return result;
}

export async function signUpFaculty(name: string, email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) return { session: null, needsEmailConfirmation: false, error: error.message };
  if (!data.session || !data.user) return { session: null, needsEmailConfirmation: true, error: null };
  const result = await getPortalSession(data.user);
  publishSession(result.session, result.error);
  return { ...result, needsEmailConfirmation: false };
}

export async function signOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (!error) publishSession(null);
  return error?.message ?? null;
}

export async function listPortalUsers(): Promise<PortalProfile[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .select("id, full_name, email, role, department")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role as UserRole,
    department: profile.department ?? null,
  }));
}

export async function setPortalAccess(userId: string, role: UserRole, department: string | null) {
  const { error } = await getSupabaseBrowserClient().rpc("admin_set_profile_access", {
    target_user_id: userId,
    new_role: role,
    new_department: department,
  });
  if (error) throw new Error(error.message);
}
