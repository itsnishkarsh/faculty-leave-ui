"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { roleHome, signOut, UserRole } from "@/lib/auth-store";
import { useAuth } from "@/components/auth-provider";

export function ProtectedContent({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const { loading, session } = useAuth();
  const rolesKey = roles.join(",");

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!rolesKey.split(",").includes(session.role)) router.replace(roleHome(session.role));
  }, [loading, rolesKey, router, session]);

  if (loading || !session || !rolesKey.split(",").includes(session.role)) {
    return <div className="min-h-screen bg-[#f5f5f7]" aria-label="Loading account" />;
  }
  return <>{children}</>;
}

export function SignOutButton() {
  const router = useRouter();
  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }
  return <button onClick={handleSignOut} className="text-xs text-[#6e6e73] transition-colors hover:text-[#0071e3]">Sign out</button>;
}
