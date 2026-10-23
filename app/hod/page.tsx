"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Download, MessageCircle, Users } from "lucide-react";
import { LeaveRequest, readRequests, subscribeToLeaveRequests } from "@/lib/leave-store";
import { downloadCsv } from "@/lib/download-csv";
import { listPortalUsers, PortalProfile } from "@/lib/auth-store";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";
import { useAuth } from "@/components/auth-provider";
import { ProfilePhotoUploader } from "@/components/profile-photo-uploader";

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function HodDashboard() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [faculty, setFaculty] = useState<PortalProfile[]>([]);
  const [historyFacultyId, setHistoryFacultyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [items, profiles] = await Promise.all([readRequests(session.role, session.id), listPortalUsers()]);
      setRequests(items);
      setFaculty(profiles.filter((profile) => profile.role === "faculty"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load department data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const unsubscribe = subscribeToLeaveRequests(() => { void load(); });
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [load]);

  useEffect(() => {
    const refreshPhotos = () => { void load(); };
    window.addEventListener("portal-profile-photo-updated", refreshPhotos);
    return () => window.removeEventListener("portal-profile-photo-updated", refreshPhotos);
  }, [load]);

  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  const pending = requests.filter((request) => request.status === "Pending");
  const outToday = requests.filter((request) => request.status === "Approved" && request.startDate <= today && request.endDate >= today);
  const nextWeek = requests.filter((request) => request.status === "Approved" && request.startDate > today).slice(0, 6);
  const byFaculty = new Map(faculty.map((person) => [person.id, person.name]));

  const trend = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { label: date.toLocaleDateString("en-IN", { month: "short" }), count: requests.filter((request) => request.status === "Approved" && request.startDate.startsWith(key)).length };
  }), [requests]);
  const maxTrend = Math.max(1, ...trend.map((item) => item.count));

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-[#1d1d1f] sm:px-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Image src="/icon.png" alt="EduLeave Portal" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" /><div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#86868b] sm:text-xs sm:tracking-[0.16em]">EduLeave Portal · Department workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">HOD dashboard</h1></div></div><div className="flex flex-wrap items-center gap-3"><Link href="/approvals" className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ed]">Approval queue <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{pending.length}</span></Link><ProfilePhotoUploader /><SignOutButton /></div></header>
    <section className="rounded-3xl bg-[#1d1d1f] p-6 text-white sm:p-8"><p className="text-sm text-white/60">{session?.department || "Department not assigned"}</p><h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Department overview</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">A live view of leave activity for your assigned department. Faculty and requests in other departments are hidden by database access policies.</p></section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={<Users className="h-4 w-4" />} label="Faculty in department" value={faculty.length} />
      <Metric icon={<Clock3 className="h-4 w-4" />} label="Requests awaiting review" value={pending.length} />
      <Metric icon={<CalendarDays className="h-4 w-4" />} label="Approved out today" value={outToday.length} />
      <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Reviewed requests" value={requests.filter((item) => item.status !== "Pending").length} />
    </section>
    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <article className="rounded-3xl border border-black/[0.06] bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Faculty roster</h2><p className="mt-1 text-sm text-[#86868b]">Accounts assigned to this department</p></div><Users className="h-5 w-5 text-[#0071e3]" /></div><div className="mt-5 divide-y divide-black/[0.06]">{faculty.map((person) => { const history = requests.filter((request) => request.facultyId === person.id); const showingHistory = historyFacultyId === person.id; return <div key={person.id} className="py-3 first:pt-0"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{person.avatarUrl ? <img src={person.avatarUrl} alt={`${person.name}'s profile`} className="h-full w-full object-cover" /> : person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{person.name}</p><p className="truncate text-xs text-[#86868b]">{person.email}</p></div></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">Faculty</span></div><button onClick={() => setHistoryFacultyId(showingHistory ? null : person.id)} className="ml-[52px] mt-2 text-xs font-medium text-[#0071e3] hover:underline">{showingHistory ? "Hide leave history" : `View leave history (${history.length})`}</button>{showingHistory && <div className="ml-[52px] mt-2 rounded-xl bg-[#f7f7f8] px-3 py-2">{history.length ? history.map((request) => <div key={request.id} className="flex items-center justify-between gap-2 border-b border-black/[0.05] py-2 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-medium">{request.category} · {dateLabel(request.startDate)}{request.endDate !== request.startDate ? ` – ${dateLabel(request.endDate)}` : ""}</p><p className="truncate text-[10px] text-[#86868b]">{request.reason}{request.substitute ? ` · Substitute: ${request.substitute}` : ""}</p></div><span className={`shrink-0 text-[10px] font-medium ${request.status === "Approved" ? "text-emerald-700" : request.status === "Rejected" ? "text-red-700" : "text-amber-700"}`}>{request.status}</span></div>) : <p className="py-2 text-xs text-[#86868b]">No leave records yet.</p>}</div>}</div>; })}{!loading && faculty.length === 0 && <p className="py-6 text-sm text-[#86868b]">No faculty accounts are assigned to this department yet. Ask an administrator to assign them.</p>}</div></article>
      <article className="rounded-3xl border border-black/[0.06] bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Approved upcoming leave</h2><p className="mt-1 text-sm text-[#86868b]">Next scheduled absences</p></div><CalendarDays className="h-5 w-5 text-[#86868b]" /></div><div className="mt-5 space-y-3">{nextWeek.map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f7f8] p-3"><p className="text-sm font-medium">{byFaculty.get(item.facultyId) || item.faculty} · {item.category}</p><p className="mt-1 text-xs text-[#6e6e73]">{dateLabel(item.startDate)}{item.endDate !== item.startDate ? ` – ${dateLabel(item.endDate)}` : ""}</p></div>)}{!loading && nextWeek.length === 0 && <p className="py-4 text-sm text-[#86868b]">No upcoming approved leave requests.</p>}</div></article>
    </section>
    <section className="rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Approved leave trend</h2><p className="mt-1 text-sm text-[#86868b]">Based on real requests from the last six months</p></div><button onClick={() => downloadCsv("department-leave-report.csv", ["Faculty", "Leave type", "Start date", "End date", "Status", "Submitted"], requests.map((item) => [byFaculty.get(item.facultyId) || item.faculty, item.category, item.startDate, item.endDate, item.status, item.submittedAt]))} className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 text-xs font-medium hover:bg-black/[0.07]"><Download className="h-4 w-4" /> Export CSV</button></div><div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">{trend.map((item) => <div key={item.label} className="flex flex-col items-center gap-2"><div className="flex h-28 w-full items-end justify-center rounded-xl bg-[#f7f7f8] p-2"><div className="w-full max-w-10 rounded-t-md bg-[#0071e3]" style={{ height: `${Math.max(6, item.count / maxTrend * 100)}%` }} title={`${item.count} approved requests`} /></div><span className="text-xs text-[#86868b]">{item.label}</span><span className="text-xs font-medium">{item.count}</span></div>)}</div></section>
    <section className="rounded-3xl border border-black/[0.06] bg-white p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Recent requests</h2><p className="mt-1 text-sm text-[#86868b]">Latest department activity</p></div><Link href="/approvals" className="text-sm font-medium text-[#0071e3]">View approval queue</Link></div><div className="divide-y divide-black/[0.06]">{requests.slice(0, 6).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-medium">{byFaculty.get(item.facultyId) || item.faculty} · {item.category}</p><p className="mt-1 text-xs text-[#86868b]">{dateLabel(item.startDate)}{item.endDate !== item.startDate ? ` – ${dateLabel(item.endDate)}` : ""}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Approved" ? "bg-emerald-50 text-emerald-700" : item.status === "Rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span><Link href={`/leave/${item.id}`} aria-label={`Open conversation for ${byFaculty.get(item.facultyId) || item.faculty}'s leave request`} className="inline-flex items-center gap-1 text-xs font-medium text-[#0071e3]"><MessageCircle className="h-3.5 w-3.5" /> Chat</Link></div></div>)}{!loading && requests.length === 0 && <p className="py-6 text-sm text-[#86868b]">No leave requests have been submitted to this department.</p>}</div></section>
  </div></main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-black/[0.06] bg-white p-5"><span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-[#86868b]">{label}</p></div>;
}

export default function HodDashboardPage() { return <ProtectedContent roles={["hod"]}><HodDashboard /></ProtectedContent>; }
