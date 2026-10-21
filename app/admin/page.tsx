"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, ShieldCheck, Users } from "lucide-react";
import { listPortalUsers, PortalProfile } from "@/lib/auth-store";
import { LeaveRequest, readRequests, subscribeToLeaveRequests } from "@/lib/leave-store";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";
import { useAuth } from "@/components/auth-provider";

function AdminOverview() {
  const { session } = useAuth();
  const [users, setUsers] = useState<PortalProfile[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (session) {
      const load = () => {
        void Promise.all([listPortalUsers(), readRequests(session.role, session.id)])
          .then(([profiles, leaveRequests]) => {
            if (active) {
              setUsers(profiles);
              setRequests(leaveRequests);
            }
          })
          .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load admin data."); });
      };
      load();
      const unsubscribe = subscribeToLeaveRequests(load);
      return () => { active = false; unsubscribe(); };
    }
    return () => { active = false; };
  }, [session]);

  const pending = requests.filter((request) => request.status === "Pending").length;

  return <main className="min-h-screen bg-[#f5f5f7] px-5 py-8 text-[#1d1d1f] sm:px-8"><div className="mx-auto max-w-5xl space-y-7">
    <header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1f] text-white"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-xs font-medium uppercase tracking-wider text-[#86868b]">Faculty Portal</p><h1 className="text-2xl font-semibold">Admin console</h1></div></div><SignOutButton /></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-black/[0.06] bg-white p-5"><Users className="h-5 w-5 text-[#0071e3]"/><p className="mt-3 text-3xl font-semibold">{users.length}</p><p className="text-sm text-[#86868b]">Portal accounts</p></div><div className="rounded-2xl border border-black/[0.06] bg-white p-5"><ClipboardList className="h-5 w-5 text-[#ff9500]"/><p className="mt-3 text-3xl font-semibold">{pending}</p><p className="text-sm text-[#86868b]">Pending leave requests</p></div><Link href="/approvals" className="flex items-center justify-between rounded-2xl bg-[#0071e3] p-5 text-white"><div><p className="font-semibold">Review leave requests</p><p className="mt-1 text-sm text-white/75">Open the approval queue</p></div><ClipboardList className="h-5 w-5"/></Link></div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><section className="rounded-2xl border border-black/[0.06] bg-white p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Portal accounts</h2><span className="text-xs text-[#86868b]">{users.length} users</span></div><div className="divide-y divide-black/[0.06]">{users.map((user) => <div key={user.id} className="flex items-center justify-between gap-3 py-3 first:pt-0"><div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-[#86868b]">{user.email}</p></div><span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs capitalize">{user.role}</span></div>)}{users.length === 0 && !error && <p className="text-sm text-[#86868b]">Accounts appear here after sign-up.</p>}</div></section>
      <section className="rounded-2xl border border-black/[0.06] bg-white p-6"><h2 className="font-semibold">Add HOD or Admin access</h2><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[#6e6e73]"><li>Create the user in Supabase Authentication, or ask them to sign up as faculty first.</li><li>In Supabase SQL Editor, update their matching row in <code className="rounded bg-black/[0.05] px-1">public.profiles</code> to role <code className="rounded bg-black/[0.05] px-1">hod</code> or <code className="rounded bg-black/[0.05] px-1">admin</code>.</li><li>Have them sign in again to load the assigned dashboard.</li></ol><p className="mt-4 text-xs leading-relaxed text-[#86868b]">Role changes are restricted to trusted database administration; the app never lets a user grant themselves elevated access.</p></section></div>
  </div></main>;
}

export default function AdminPage() { return <ProtectedContent roles={["admin"]}><AdminOverview /></ProtectedContent>; }
