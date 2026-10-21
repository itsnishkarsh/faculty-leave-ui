"use client";

import { useEffect, useState } from "react";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  Search,
} from "lucide-react";
import { LeaveRequest, readRequests, saveRequest, subscribeToLeaveRequests } from "@/lib/leave-store";
import { downloadCsv } from "@/lib/download-csv";
import { useAuth } from "@/components/auth-provider";
import { ProtectedContent, SignOutButton } from "@/components/protected-content";

// 1. Define the validation rules using Zod
const leaveFormSchema = z.object({
  category: z.string({
    required_error: "Please select a leave category.",
  }).min(1, { message: "Please select a leave category." }),
  startDate: z.string().min(1, { message: "Start date is required." }),
  endDate: z.string().min(1, { message: "End date is required." }),
  substitute: z.string().optional(),
  reason: z.string().min(10, {
    message: "Reason must be at least 10 characters.",
  }),
});

function AppleFacultyDashboard() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let active = true;
    if (session) {
      const load = () => {
        void readRequests(session.role, session.id)
          .then((items) => { if (active) setRequests(items); })
          .catch((error: unknown) => { if (active) setRequestError(error instanceof Error ? error.message : "Unable to load requests."); });
      };
      load();
      const unsubscribe = subscribeToLeaveRequests(load);
      return () => { active = false; unsubscribe(); };
    }
    return () => { active = false; };
  }, [session]);

  function downloadSummary() {
    downloadCsv("faculty-leave-summary.csv", ["Request ID", "Category", "Start date", "End date", "Substitute", "Reason", "Status", "Submitted"], requests.map((request) => [request.id, request.category, request.startDate, request.endDate, request.substitute, request.reason, request.status, request.submittedAt]));
  }

  // 2. Initialize the form with the Zod resolver
  const form = useForm<z.infer<typeof leaveFormSchema>>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      category: "",
      startDate: "",
      endDate: "",
      substitute: "",
      reason: "",
    },
  });

  // 3. Define what happens on a successful submit
  async function onSubmit(values: z.infer<typeof leaveFormSchema>) {
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (values.startDate < localToday) {
      form.setError("startDate", { message: "Start date cannot be in the past." });
      return;
    }
    if (values.endDate < values.startDate) {
      form.setError("endDate", { message: "End date must be on or after the start date." });
      return;
    }
    const categoryNames: Record<string, string> = { cl: "Casual Leave", ml: "Medical Leave", od: "On Duty", el: "Earned Leave" };
    if (!session) return;
    try {
      await saveRequest({
        facultyId: session.id,
        category: categoryNames[values.category] ?? values.category,
        startDate: values.startDate,
        endDate: values.endDate,
        substitute: values.substitute?.trim() || "",
        reason: values.reason.trim(),
      });
      setRequests(await readRequests(session.role, session.id));
      setNotice("Your leave request was submitted for HOD review.");
      setRequestError("");
      form.reset();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to submit your request.");
    }
  }

  const approved = requests.filter((request) => request.status === "Approved");
  const pending = requests.filter((request) => request.status === "Pending");
  const rejected = requests.filter((request) => request.status === "Rejected");
  const approvedDays = approved.reduce((sum, request) => {
    const start = new Date(`${request.startDate}T00:00:00`);
    const end = new Date(`${request.endDate}T00:00:00`);
    return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, 0);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm tracking-tight text-[#1d1d1f]">Faculty Portal</span>
            <div className="h-4 w-px bg-black/[0.08]" />
            <nav className="flex items-center gap-5 text-xs text-[#86868b] font-normal">
              <a href="#overview" className="text-[#1d1d1f] font-medium transition-colors">
                Overview
              </a>
              <a href="#history" className="hover:text-[#1d1d1f] transition-colors">
                Leave History
              </a>
              <a href="#resources" className="hover:text-[#1d1d1f] transition-colors">Guidance</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-48 pl-8 pr-3 py-1 text-xs rounded-full bg-black/[0.04] border border-transparent focus:border-black/[0.1] focus:bg-white focus:outline-none transition-all placeholder:text-[#86868b]"
              />
            </div>
            <div className="h-7 w-7 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-xs font-medium">
              {(session?.name || "F").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="overview" className="max-w-6xl mx-auto px-6 pt-10 space-y-8">
        {notice && <div role="status" className="flex items-center justify-between rounded-xl border border-[#34c759]/20 bg-[#34c759]/10 px-4 py-3 text-sm text-[#1d8a42]">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message" className="font-semibold">×</button></div>}
        {requestError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#86868b]">
              {session?.department || "Faculty workspace"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mt-1">
              {session?.name ? `Welcome, ${session.name}` : "Your leave activity"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={downloadSummary} className="px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] bg-white border border-black/[0.08] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-black/[0.02] transition-colors">
              Download Summary
            </button>

            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-full shadow-sm transition-colors">
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Apply for Leave
                </button>
              </SheetTrigger>

              <SheetContent className="bg-[#f5f5f7]/95 backdrop-blur-2xl border-l border-black/[0.06] sm:max-w-md w-full p-0 flex flex-col shadow-2xl">
                <div className="p-6 border-b border-black/[0.04] bg-white/40">
                  <SheetTitle className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
                    New Leave Request
                  </SheetTitle>
                  <SheetDescription className="text-xs text-[#86868b] mt-1">
                    Submit your request. Approvals typically take 24-48 hours.
                  </SheetDescription>
                </div>

                {/* 4. Wrap the form inputs in the Form component */}
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col h-full overflow-hidden"
                  >
                    <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-medium text-[#1d1d1f]">
                              Leave Category
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full text-xs rounded-lg border-black/[0.08] bg-white shadow-sm focus:ring-[#0071e3]/20 focus:border-[#0071e3]">
                                  <SelectValue placeholder="Select leave type..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl border-black/[0.08] shadow-lg">
                                <SelectItem value="cl" className="text-xs">
                                  Casual Leave (CL)
                                </SelectItem>
                                <SelectItem value="ml" className="text-xs">
                                  Medical Leave (ML)
                                </SelectItem>
                                <SelectItem value="od" className="text-xs">
                                  On Duty (OD)
                                </SelectItem>
                                <SelectItem value="el" className="text-xs">
                                  Earned Leave (EL)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-medium text-[#1d1d1f]">
                                Start Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  className="text-xs rounded-lg border-black/[0.08] bg-white shadow-sm focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-medium text-[#1d1d1f]">
                                End Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  className="text-xs rounded-lg border-black/[0.08] bg-white shadow-sm focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="substitute"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-medium text-[#1d1d1f]">
                              Substitute Faculty (Optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Prof. Ananya Sen"
                                {...field}
                                className="text-xs rounded-lg border-black/[0.08] bg-white shadow-sm placeholder:text-[#86868b] focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-medium text-[#1d1d1f]">
                              Reason for Leave
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Briefly explain your request..."
                                {...field}
                                className="text-xs rounded-lg border-black/[0.08] bg-white shadow-sm min-h-[100px] resize-none placeholder:text-[#86868b] focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <SheetFooter className="p-6 bg-white/40 border-t border-black/[0.04] flex-row justify-end gap-3 sm:space-x-0 mt-auto">
                      <SheetClose asChild>
                        <button
                          type="button"
                          className="px-4 py-2 text-xs font-medium text-[#1d1d1f] bg-white border border-black/[0.08] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-black/[0.02] transition-colors"
                        >
                          Cancel
                        </button>
                      </SheetClose>
                      <button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                        className="px-5 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-full shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {form.formState.isSubmitting ? "Submitting…" : "Submit Request"}
                      </button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Live account activity summaries; leave balances require institution policy data. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ label: "Awaiting decision", value: pending.length, tone: "text-[#b25e00] bg-[#ff9500]/10" }, { label: "Approved requests", value: approved.length, tone: "text-[#1d8a42] bg-[#34c759]/10" }, { label: "Rejected requests", value: rejected.length, tone: "text-[#b42318] bg-red-500/10" }, { label: "Approved leave days", value: approvedDays, tone: "text-[#0071e3] bg-[#0071e3]/10" }].map((item) => <div key={item.label} className="rounded-[20px] bg-white p-5 border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${item.tone}`}>{item.label}</span><p className="mt-4 text-4xl font-semibold tracking-tight">{item.value}</p><p className="mt-1 text-xs text-[#86868b]">Across your submitted requests</p></div>)}
        </div>

        {/* Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="history" className="lg:col-span-2 rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-[#1d1d1f]">
                  Recent Applications
                </h2>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Track approvals, substitute coverage, and dates
                </p>
              </div>
              <span className="text-xs text-[#86868b]">{requests.length} saved request{requests.length === 1 ? "" : "s"}</span>
            </div>
            <div className="divide-y divide-black/[0.05]">
              {requests.filter((item) => `${item.id} ${item.reason} ${item.category} ${item.status}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#1d1d1f]">
                        {item.reason}
                      </span>
                      <span className="text-[10px] text-[#86868b] font-mono">
                        {item.id}
                      </span>
                    </div>
                    <div className="text-xs text-[#86868b] flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[#1d1d1f] font-medium">
                        {item.category}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(`${item.startDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{item.endDate !== item.startDate ? ` – ${new Date(`${item.endDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      </span>
                      <span>•</span>
                      <span>{item.substitute || "No substitute listed"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${item.status === "Approved" ? "text-[#1d8a42] bg-[#34c759]/10 border-[#34c759]/20" : item.status === "Rejected" ? "text-[#b42318] bg-red-500/10 border-red-500/20" : "text-[#b25e00] bg-[#ff9500]/10 border-[#ff9500]/20"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
              {requests.filter((item) => `${item.id} ${item.reason} ${item.category} ${item.status}`.toLowerCase().includes(search.toLowerCase())).length === 0 && <p className="py-8 text-center text-sm text-[#86868b]">{search ? "No requests match your search." : "Your submitted leave requests will appear here."}</p>}
            </div>
          </div>

          <div id="resources" className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1d1d1f]">
                <Calendar className="h-4 w-4 text-[#0071e3]" /> Upcoming
                Institutional Recess
              </div>
              <p className="text-xs text-[#86868b] mt-2 leading-relaxed">Choose the correct leave type, provide accurate dates and a clear reason, then submit for your department head to review. Your request status updates here after a decision.</p>
              <div className="mt-5 space-y-2.5">
                <div className="text-xs font-medium text-[#1d1d1f]">
                  Department Resources
                </div>
                <p className="rounded-xl bg-[#f5f5f7] p-3 text-xs leading-relaxed text-[#6e6e73]">Leave balance totals are not configured yet. Ask your administrator to add the institution’s approved leave entitlements before relying on balance calculations.</p>
              </div>
            </div>
            <div className="pt-4 border-t border-black/[0.04] text-[11px] text-[#86868b]">
              Need assistance? Contact your department head or portal administrator.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function FacultyDashboardPage() {
  return <ProtectedContent roles={["faculty"]}><AppleFacultyDashboard /></ProtectedContent>;
}
