"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardList, Copy, Database, MessageCircle, Phone, Search, ShieldCheck, Users } from "lucide-react";
import { listPortalUsers, PortalProfile, setPortalAccess, UserRole } from "@/lib/auth-store";
import { DEPARTMENTS, isDepartment } from "@/lib/departments";
import { LeaveRequest, readRequests, subscribeToLeaveRequests } from "@/lib/leave-store";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";
import { useAuth } from "@/components/auth-provider";
import { DemoSeedResult, seedDemoAccounts } from "@/lib/demo-seed";

const roleLabels: Record<UserRole, string> = { faculty: "Faculty", hod: "Head of Department", admin: "Administrator" };
const roleStyles: Record<UserRole, string> = {
  faculty: "bg-slate-100 text-slate-700",
  hod: "bg-violet-50 text-violet-700",
  admin: "bg-blue-50 text-blue-700",
};

function AdminOverview() {
  const { session } = useAuth();
  const [users, setUsers] = useState<PortalProfile[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [drafts, setDrafts] = useState<Record<string, { role: UserRole; department: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [demoResult, setDemoResult] = useState<DemoSeedResult | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const [profiles, leaveRequests] = await Promise.all([listPortalUsers(), readRequests(session.role, session.id)]);
      setUsers(profiles);
      setRequests(leaveRequests);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const unsubscribe = subscribeToLeaveRequests(() => { void load(); });
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [load]);

  const visibleUsers = useMemo(() => users.filter((user) => {
    const matchesSearch = `${user.name} ${user.email} ${user.department ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (roleFilter === "all" || user.role === roleFilter);
  }), [users, search, roleFilter]);

  const pending = requests.filter((request) => request.status === "Pending").length;
  const roleCounts = { faculty: users.filter((user) => user.role === "faculty").length, hod: users.filter((user) => user.role === "hod").length, admin: users.filter((user) => user.role === "admin").length };
  async function saveAccess(user: PortalProfile) {
    const draft = drafts[user.id] ?? { role: user.role, department: user.department ?? "" };
    if (draft.role !== "admin" && !isDepartment(draft.department)) {
      setError(draft.role === "hod" ? "Choose an approved department before assigning HOD access." : "Choose an approved department for this faculty account.");
      return;
    }
    setSavingId(user.id);
    setError("");
    try {
      await setPortalAccess(user.id, draft.role, draft.department.trim() || null);
      await load();
      setDrafts((current) => { const next = { ...current }; delete next[user.id]; return next; });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this account.");
    } finally {
      setSavingId(null);
    }
  }

  async function createDemoData() {
    setDemoLoading(true);
    setDemoError("");
    try {
      const result = await seedDemoAccounts();
      setDemoResult(result);
      await load();
    } catch (cause) {
      setDemoError(cause instanceof Error ? cause.message : "Unable to create demo accounts.");
    } finally {
      setDemoLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-[#1d1d1f] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Image src="/icon.png" alt="EduLeave Portal" width={44} height={44} className="h-11 w-11 rounded-xl" /><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#86868b]">EduLeave Portal</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin console</h1></div></div>
        <SignOutButton />
      </header>

      <section className="rounded-3xl bg-[#1d1d1f] p-6 text-white sm:p-8">
        <p className="text-sm text-white/60">Administration</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Manage your faculty portal</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Review accounts, understand access levels, and keep the approval workflow moving.</p></div><Link href="/approvals" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#1d1d1f] transition hover:bg-white/90">Open approvals <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      {<section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Database className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Demo data tools</p><h2 className="mt-1 text-lg font-semibold">Create sample faculty accounts</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#6e6e73]">Adds 33 fictional faculty accounts (3 per department), one HOD for each of 11 departments, 99 labeled leave requests, and sample conversations. Keeps your existing single administrator. This writes records to the connected Supabase project.</p></div></div><button disabled={demoLoading} onClick={() => void createDemoData()} className="h-10 rounded-xl bg-[#1d1d1f] px-4 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50">{demoLoading ? "Preparing sample data…" : demoResult ? "Refresh demo access" : "Create demo accounts"}</button></div>{demoError && <p role="alert" className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">{demoError}</p>}{demoResult && <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Demo sign-in credentials</h3><p className="mt-1 text-xs text-[#6e6e73]">Use these at the normal sign-in page. All listed accounts share the demo password below.</p></div><button onClick={() => void navigator.clipboard?.writeText(demoResult.password)} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium"><Copy className="h-3.5 w-3.5" /> Copy password</button></div><p className="mt-3 rounded-lg bg-[#f5f5f7] px-3 py-2 font-mono text-sm">{demoResult.password}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{demoResult.createdAccounts.map((account) => <div key={account.email} className="rounded-xl bg-[#f7f7f8] p-3"><p className="text-sm font-medium">{account.name} <span className="font-normal text-[#86868b]">· {account.role === "hod" ? "HOD" : "Faculty"}</span></p><p className="mt-1 break-all font-mono text-xs text-[#55555a]">{account.email}</p><p className="mt-1 text-[10px] text-[#86868b]">{account.department}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-amber-900">These are fictional demo identities. Their `.test` email addresses cannot receive email. Sample requests are labeled DEMO DATA. Keep demo seeding disabled when you no longer need it.</p></div>}</section>}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Users className="h-4 w-4" />} label="Portal accounts" value={users.length} tone="blue" />
        <Metric icon={<ClipboardList className="h-4 w-4" />} label="Awaiting review" value={pending} tone="amber" />
        <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Department heads" value={roleCounts.hod} tone="violet" />
        <Metric icon={<Check className="h-4 w-4" />} label="Administrators" value={roleCounts.admin} tone="green" />
      </section>

      <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm shadow-black/[0.02]">
        <div className="flex flex-col gap-4 border-b border-black/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="text-lg font-semibold">Portal accounts</h2><p className="mt-1 text-sm text-[#86868b]">{users.length} registered {users.length === 1 ? "account" : "accounts"}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><span className="sr-only">Search accounts</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="h-10 w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 sm:w-56" /></label>
            <label><span className="sr-only">Filter accounts by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:w-48"><option value="all">All roles</option><option value="faculty">Faculty</option><option value="hod">Head of Department</option><option value="admin">Administrator</option></select></label>
          </div>
        </div>
        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-4 bg-[#fafafa] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[#86868b] sm:grid"><span>Name</span><span>Department</span><span>Access level</span><span>Quick chat</span></div>
        <div className="divide-y divide-black/[0.06]">
          {visibleUsers.map((user) => {
            const draft = drafts[user.id] ?? { role: user.role, department: user.department ?? "" };
            const changed = draft.role !== user.role || draft.department !== (user.department ?? "");
            return <div key={user.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-center sm:gap-4 sm:px-6">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{user.name || "Unnamed account"}</p><p className="truncate text-xs text-[#86868b]">{user.email}</p></div>
            <label className="space-y-1"><span className="text-[10px] font-medium uppercase tracking-wide text-[#86868b] sm:hidden">Department</span><select aria-label={`Department for ${user.name}`} value={draft.department} onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: { ...draft, department: event.target.value } }))} className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-xs outline-none focus:border-blue-500">{user.department && !isDepartment(user.department) ? <option value={user.department}>Replace invalid value: {user.department}</option> : <option value="">Choose department</option>}{DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
            <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`role-${user.id}`}>Access level for {user.name}</label><select id={`role-${user.id}`} value={draft.role} onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: { ...draft, role: event.target.value as UserRole } }))} className={`h-9 rounded-full px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/30 ${roleStyles[draft.role]}`}><option value="faculty">Faculty</option><option value="hod">Head of Department</option><option value="admin">Administrator</option></select>{changed && <button onClick={() => void saveAccess(user)} disabled={savingId === user.id} className="h-9 rounded-lg bg-[#1d1d1f] px-3 text-xs font-medium text-white hover:bg-black/80 disabled:opacity-50">{savingId === user.id ? "Saving…" : "Save access"}</button>}</div>
            <div className="flex flex-wrap gap-2">{user.id !== session?.id && <><Link href={`/messages?member=${encodeURIComponent(user.id)}`} aria-label={`Message ${user.name}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"><MessageCircle className="h-4 w-4" /><span>Message</span></Link><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("portal-start-call", { detail: { id: user.id, name: user.name } }))} aria-label={`Call ${user.name}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-700 transition hover:border-green-300 hover:bg-green-100"><Phone className="h-4 w-4" /><span>Call</span></button></>}</div>
          </div>})}
          {!loading && visibleUsers.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#86868b]">{users.length ? "No accounts match those filters." : "Accounts will appear here after users sign up."}</p>}
          {loading && <p className="px-6 py-10 text-center text-sm text-[#86868b]">Loading portal accounts…</p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm shadow-black/[0.02]">
          <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck className="h-4 w-4" /></div><div><h2 className="font-semibold">How roles are assigned</h2><p className="mt-1 text-sm leading-6 text-[#6e6e73]">New sign-ups start as faculty. Admins assign HOD or administrator access after verifying the person’s institutional responsibility.</p></div></div>
          <div className="mt-5 space-y-3 rounded-2xl bg-[#f7f7f8] p-4 text-sm leading-6 text-[#55555a]"><p><span className="font-medium text-[#1d1d1f]">Faculty</span> — submit leave requests and follow their status.</p><p><span className="font-medium text-[#1d1d1f]">Head of Department</span> — review requests for their department.</p><p><span className="font-medium text-[#1d1d1f]">Administrator</span> — manage portal access and review all requests.</p></div>
          <p className="mt-4 text-xs leading-5 text-[#86868b]">Role changes are performed through a Supabase function that verifies the signed-in administrator. HODs must have a department; they only see and review that department’s leave requests.</p>
        </article>
        <article className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Access controls</p><h2 className="mt-2 text-lg font-semibold">Assign roles with department scope</h2><p className="mt-2 text-sm leading-6 text-[#55555a]">Choose only from the institution’s department list. When you assign HOD, that HOD’s approval queue is limited to faculty assigned to the same department.</p>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-white/80 p-4"><p className="text-sm font-medium">Database migrations required</p><p className="mt-1 text-xs leading-5 text-[#6e6e73]">Run migrations <code>202610210001</code> and <code>202610210002</code> from the project’s <code>supabase/migrations</code> folder in Supabase SQL Editor before saving role changes.</p></div>
          <p className="mt-4 text-xs text-[#6e6e73]">To protect the last administrator account, the database blocks self-demotion and removal of the final admin.</p>
        </article>
      </section>
    </div>
  </main>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "blue" | "amber" | "violet" | "green" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700", green: "bg-emerald-50 text-emerald-700" };
  return <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm shadow-black/[0.02]"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm text-[#86868b]">{label}</p></div>;
}

export default function AdminPage() { return <ProtectedContent roles={["admin"]}><AdminOverview /></ProtectedContent>; }
