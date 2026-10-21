"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeft, Check, Clock3, X } from "lucide-react";
import { getRequestsSnapshot, LeaveRequest, subscribeToRequests, updateRequestStatus } from "@/lib/leave-store";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";

function prettyDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ApprovalQueue() {
  const snapshot = useSyncExternalStore(subscribeToRequests, getRequestsSnapshot, () => "[]");
  const requests = JSON.parse(snapshot) as LeaveRequest[];

  const pending = requests.filter((request) => request.status === "Pending");
  const decided = requests.filter((request) => request.status !== "Pending");

  function decide(id: string, status: "Approved" | "Rejected") {
    updateRequestStatus(id, status);
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-5 py-8 text-[#1d1d1f] sm:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <div className="flex items-center justify-between"><Link href="/hod" className="inline-flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Department overview</Link><SignOutButton /></div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-medium uppercase tracking-wider text-[#86868b]">Computer Science Department</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Leave approvals</h1></div>
          <span className="rounded-full bg-[#0071e3]/10 px-3 py-1.5 text-sm font-medium text-[#0071e3]">{pending.length} awaiting review</span>
        </header>

        <section className="space-y-3" aria-label="Pending requests">
          {pending.length === 0 ? <div className="rounded-2xl border border-black/[0.06] bg-white p-10 text-center"><Clock3 className="mx-auto h-7 w-7 text-[#86868b]" /><h2 className="mt-3 font-semibold">You’re all caught up</h2><p className="mt-1 text-sm text-[#86868b]">New faculty requests will appear here.</p></div> : pending.map((request) => (
            <article key={request.id} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{request.faculty}</h2><span className="rounded-full bg-[#ff9500]/10 px-2.5 py-1 text-xs font-medium text-[#9a5b00]">Pending</span><span className="font-mono text-xs text-[#86868b]">{request.id}</span></div>
                  <p className="text-sm font-medium">{request.category} · {prettyDate(request.startDate)}{request.startDate !== request.endDate ? ` – ${prettyDate(request.endDate)}` : ""}</p>
                  <p className="max-w-2xl text-sm leading-relaxed text-[#6e6e73]">{request.reason}</p>
                  <p className="text-xs text-[#86868b]">Substitute: {request.substitute || "Not specified"} · Submitted {new Date(request.submittedAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start">
                  <button onClick={() => decide(request.id, "Approved")} className="inline-flex items-center gap-1.5 rounded-full bg-[#1d8a42] px-4 py-2 text-sm font-medium text-white hover:bg-[#167638]"><Check className="h-4 w-4" /> Approve</button>
                  <button onClick={() => decide(request.id, "Rejected")} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.04]"><X className="h-4 w-4" /> Reject</button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {decided.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold">Recently reviewed</h2>{decided.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.05] bg-white/70 px-4 py-3 text-sm"><span className="font-medium">{request.faculty} · {request.category}</span><span className={request.status === "Approved" ? "text-[#1d8a42]" : "text-[#c23b32]"}>{request.status}</span></div>)}</section>}
        <p className="text-xs text-[#86868b]">Demo requests are stored in this browser only.</p>
      </div>
    </main>
  );
}

export default function ApprovalQueuePage() {
  return <ProtectedContent roles={["hod", "admin"]}><ApprovalQueue /></ProtectedContent>;
}
