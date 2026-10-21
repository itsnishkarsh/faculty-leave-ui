"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { ShieldCheck, Users, UserPlus, ClipboardList } from "lucide-react";
import { createManagedUser, listPortalUsers, PortalUser } from "@/lib/auth-store";
import { getRequestsSnapshot, readRequests, subscribeToRequests } from "@/lib/leave-store";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";

type PublicUser = Omit<PortalUser, "password">;

function AdminOverview() {
  const [users, setUsers] = useState<PublicUser[]>(() => listPortalUsers());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requestSnapshot = useSyncExternalStore(subscribeToRequests, getRequestsSnapshot, () => "[]");
  const pending = (JSON.parse(requestSnapshot) as ReturnType<typeof readRequests>).filter((request) => request.status === "Pending").length;

  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const result = createManagedUser(String(data.get("name")), String(data.get("email")), String(data.get("password")), String(data.get("role")) as "faculty" | "hod");
    if (result) return setError(result);
    setUsers(listPortalUsers());
    setMessage("Account created. Share the temporary password with the user securely.");
    event.currentTarget.reset();
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-5 py-8 text-[#1d1d1f] sm:px-8"><div className="mx-auto max-w-5xl space-y-7"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1f] text-white"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-xs font-medium uppercase tracking-wider text-[#86868b]">Faculty Portal</p><h1 className="text-2xl font-semibold">Admin console</h1></div></div><SignOutButton /></header>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-black/[0.06] bg-white p-5"><Users className="h-5 w-5 text-[#0071e3]"/><p className="mt-3 text-3xl font-semibold">{users.length}</p><p className="text-sm text-[#86868b]">Local demo accounts</p></div><div className="rounded-2xl border border-black/[0.06] bg-white p-5"><ClipboardList className="h-5 w-5 text-[#ff9500]"/><p className="mt-3 text-3xl font-semibold">{pending}</p><p className="text-sm text-[#86868b]">Pending leave requests</p></div><Link href="/approvals" className="flex items-center justify-between rounded-2xl bg-[#0071e3] p-5 text-white"><div><p className="font-semibold">Review leave requests</p><p className="mt-1 text-sm text-white/75">Open the approval queue</p></div><ClipboardList className="h-5 w-5"/></Link></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><section className="rounded-2xl border border-black/[0.06] bg-white p-6"><div className="mb-5 flex items-center gap-2"><UserPlus className="h-4 w-4 text-[#0071e3]"/><h2 className="font-semibold">Create an account</h2></div><form onSubmit={addUser} className="space-y-4"><label className="block space-y-1.5 text-xs font-medium">Full name<input name="name" required className="w-full rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30"/></label><label className="block space-y-1.5 text-xs font-medium">Email<input name="email" type="email" required className="w-full rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30"/></label><label className="block space-y-1.5 text-xs font-medium">Role<select name="role" className="w-full rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm font-normal"><option value="faculty">Faculty</option><option value="hod">HOD</option></select></label><label className="block space-y-1.5 text-xs font-medium">Temporary password<input name="password" type="password" required minLength={8} className="w-full rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30"/></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}<button className="w-full rounded-full bg-[#0071e3] py-2.5 text-sm font-medium text-white hover:bg-[#0077ed]">Create account</button></form></section>
      <section className="rounded-2xl border border-black/[0.06] bg-white p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Portal accounts</h2><span className="text-xs text-[#86868b]">This browser only</span></div><div className="divide-y divide-black/[0.06]">{users.map((user) => <div key={user.email} className="flex items-center justify-between gap-3 py-3 first:pt-0"><div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-[#86868b]">{user.email}</p></div><span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs capitalize">{user.role}</span></div>)}</div></section></div><p className="text-xs leading-relaxed text-[#86868b]">Demo accounts and passwords are stored in this browser for demonstration only. Do not use real staff details or deploy this as a secure system.</p>
  </div></main>;
}

export default function AdminPage() { return <ProtectedContent roles={["admin"]}><AdminOverview /></ProtectedContent>; }
