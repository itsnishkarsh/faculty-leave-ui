"use client";

import { useEffect, useState } from "react";

import {
  Users,
  UserMinus,
  Clock,
  ChevronRight,
  CalendarDays,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { LeaveRequest, readRequests, subscribeToLeaveRequests } from "@/lib/leave-store";
import { downloadCsv } from "@/lib/download-csv";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";
import { useAuth } from "@/components/auth-provider";

function HodDashboard() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let active = true;
    if (session) {
      const load = () => {
        void readRequests(session.role, session.id)
          .then((items) => { if (active) setRequests(items); })
          .catch((cause: unknown) => { if (active) setRequestError(cause instanceof Error ? cause.message : "Unable to load requests."); });
      };
      load();
      const unsubscribe = subscribeToLeaveRequests(load);
      return () => { active = false; unsubscribe(); };
    }
    return () => { active = false; };
  }, [session]);

  const pendingCount = requests.filter((request) => request.status === "Pending").length;

  const todayLeaves = [
    {
      name: "Dr. Arvind Sharma",
      role: "Assoc. Professor",
      type: "On Duty",
      cover: "Prof. Ananya Sen",
    },
    {
      name: "Prof. Meera Desai",
      role: "Asst. Professor",
      type: "Medical",
      cover: "Lectures Suspended",
    },
  ];

  // Mock data for the 6-month leave trends chart
  const leaveTrendsData = [
    { month: "Jun", Casual: 12, Medical: 4, "On Duty": 8 },
    { month: "Jul", Casual: 8, Medical: 2, "On Duty": 15 },
    { month: "Aug", Casual: 15, Medical: 7, "On Duty": 5 },
    { month: "Sep", Casual: 10, Medical: 12, "On Duty": 10 },
    { month: "Oct", Casual: 18, Medical: 5, "On Duty": 12 },
    { month: "Nov", Casual: 6, Medical: 2, "On Duty": 4 },
  ];

  return (
    <div className="min-h-screen pb-20 bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Translucent Frosted Glass Navbar */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm tracking-tight text-[#1d1d1f]">
              HOD Portal
            </span>
            <div className="h-4 w-px bg-black/[0.08]" />
            <nav className="flex items-center gap-5 text-xs text-[#86868b] font-normal">
              <span className="text-[#1d1d1f] font-medium">
                Department Overview
              </span>
              <Link
                href="/approvals"
                className="hover:text-[#1d1d1f] transition-colors"
              >
                Approval Queue
              </Link>
              <a href="#" className="hover:text-[#1d1d1f] transition-colors">
                Faculty Roster
              </a>
              <a href="#" className="hover:text-[#1d1d1f] transition-colors">
                Reports
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-xs font-medium">
              HOD
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-10 space-y-6">
        {requestError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#86868b]">
              Computer Science Department
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mt-1">
              Today&apos;s Overview
            </h1>
          </div>
          <p className="text-sm font-medium text-[#86868b]">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-5">
            <div className="flex items-center gap-2 text-[#86868b] mb-3">
              <UserMinus className="h-4 w-4 text-[#ff9500]" />
              <span className="text-xs font-semibold">
                Faculty on Leave Today
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                2
              </span>
              <span className="text-xs text-[#86868b]">/ 24 total staff</span>
            </div>
          </div>

          <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-5">
            <div className="flex items-center gap-2 text-[#86868b] mb-3">
              <Users className="h-4 w-4 text-[#34c759]" />
              <span className="text-xs font-semibold">Department Strength</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                91.6%
              </span>
              <span className="text-xs text-[#34c759] font-medium">
                +4% from yesterday
              </span>
            </div>
          </div>

          <div className="rounded-[20px] bg-[#0071e3] shadow-[0_4px_12px_rgba(0,113,227,0.2)] p-5 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/80 mb-3">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-semibold">Action Required</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{pendingCount}</span>
                <span className="text-xs text-white/80">pending requests</span>
              </div>
            </div>
            <Link
              href="/approvals"
              className="relative z-10 mt-4 flex items-center gap-1 text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors w-fit px-3 py-1.5 rounded-full"
            >
              Review Queue <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Detailed Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#1d1d1f]">
                Absent Faculty Roster
              </h2>
            </div>
            <div className="space-y-3">
              {todayLeaves.map((faculty) => (
                <div
                  key={faculty.name}
                  className="p-4 rounded-xl bg-[#f5f5f7] border border-black/[0.04]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-semibold text-[#1d1d1f]">
                        {faculty.name}
                      </div>
                      <div className="text-[11px] text-[#86868b]">
                        {faculty.role}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-white border border-black/[0.06] rounded shadow-sm text-[#1d1d1f]">
                      {faculty.type}
                    </span>
                  </div>
                  <div className="text-xs text-[#86868b] flex items-center gap-1.5 mt-3 pt-3 border-t border-black/[0.04]">
                    <Users className="h-3.5 w-3.5" />
                    Covered by:{" "}
                    <span className="font-medium text-[#1d1d1f]">
                      {faculty.cover}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#1d1d1f]">
                Upcoming This Week
              </h2>
              <CalendarDays className="h-4 w-4 text-[#86868b]" />
            </div>
            <div className="relative pl-4 border-l border-black/[0.08] space-y-6">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#0071e3] ring-4 ring-white" />
                <div className="text-xs font-semibold text-[#1d1d1f]">
                  Tomorrow
                </div>
                <div className="text-xs text-[#86868b] mt-1">
                  2 planned leaves (Medical, Casual)
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-black/[0.15] ring-4 ring-white" />
                <div className="text-xs font-semibold text-[#1d1d1f]">
                  Wednesday
                </div>
                <div className="text-xs text-[#86868b] mt-1">
                  0 planned leaves
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-black/[0.15] ring-4 ring-white" />
                <div className="text-xs font-semibold text-[#1d1d1f]">
                  Thursday
                </div>
                <div className="text-xs text-[#86868b] mt-1">
                  1 planned leave (On Duty - Seminar)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Chart Section */}
        <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">
                Leave Trends Analytics
              </h2>
              <p className="text-xs text-[#86868b] mt-0.5">
                6-month overview of departmental absences
              </p>
            </div>
            <button onClick={() => downloadCsv("department-leave-trends.csv", ["Month", "Casual", "Medical", "On Duty"], leaveTrendsData.map((item) => [item.month, String(item.Casual), String(item.Medical), String(item["On Duty"])]))} className="flex items-center gap-2 p-2 rounded-xl bg-[#f5f5f7] hover:bg-black/[0.05] transition-colors text-xs font-medium text-[#1d1d1f]">
              <BarChart2 className="h-4 w-4 text-[#86868b]" />
              Download Report
            </button>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaveTrendsData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                barSize={12}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e5ea"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#86868b", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#86868b", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "#f5f5f7" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                  iconType="circle"
                />
                <Bar dataKey="Casual" fill="#0071e3" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Medical" fill="#34c759" radius={[4, 4, 0, 0]} />
                <Bar dataKey="On Duty" fill="#af52de" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HodDashboardPage() {
  return <ProtectedContent roles={["hod"]}><HodDashboard /></ProtectedContent>;
}
