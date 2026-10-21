"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getSessionSnapshot, signOut, subscribeToSession, UserRole } from "@/lib/auth-store";

function getRole(snapshot: string | null): UserRole | null {
  if (!snapshot) return null;
  try {
    const value = JSON.parse(snapshot) as { role?: unknown };
    return value.role === "faculty" || value.role === "hod" || value.role === "admin" ? value.role : null;
  } catch { return null; }
}

export function ProtectedContent({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const sessionSnapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot, () => null);
  const role = getRole(sessionSnapshot);
  const rolesKey = roles.join(",");

  useEffect(() => {
    if (!role) router.replace("/login");
    else if (!rolesKey.split(",").includes(role)) router.replace(role === "faculty" ? "/" : role === "hod" ? "/hod" : "/admin");
  }, [rolesKey, router, role]);

  return role ? <>{children}</> : <div className="min-h-screen bg-[#f5f5f7]" aria-label="Loading account" />;
}

export function SignOutButton() {
  const router = useRouter();
  return <button onClick={() => { signOut(); router.replace("/login"); }} className="text-xs text-[#6e6e73] transition-colors hover:text-[#0071e3]">Sign out</button>;
}
