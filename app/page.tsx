"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
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
  Clock,
  FileText,
  Plus,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

// 1. Define the validation rules using Zod
const leaveFormSchema = z.object({
  category: z.string({
    required_error: "Please select a leave category.",
  }),
  startDate: z.string().min(1, { message: "Start date is required." }),
  endDate: z.string().min(1, { message: "End date is required." }),
  substitute: z.string().optional(),
  reason: z.string().min(10, {
    message: "Reason must be at least 10 characters.",
  }),
});

export default function AppleFacultyDashboard() {
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
  function onSubmit(values: z.infer<typeof leaveFormSchema>) {
    console.log("Form successfully validated and submitted:", values);
    // Here you would typically send the data to your backend API
    alert("Leave request submitted successfully!");
    form.reset(); // Clear the form after submission
  }

  const quotas = [
    {
      type: "Casual Leave",
      code: "CL",
      used: 4,
      total: 12,
      remaining: 8,
      accent: "bg-[#0071e3]",
      note: "Renews July 1",
    },
    {
      type: "Medical Leave",
      code: "ML",
      used: 0,
      total: 10,
      remaining: 10,
      accent: "bg-[#34c759]",
      note: "Medical slip required > 2 days",
    },
    {
      type: "Duty / Conference",
      code: "OD",
      used: 3,
      total: 15,
      remaining: 12,
      accent: "bg-[#af52de]",
      note: "Dean approval required",
    },
    {
      type: "Earned Leave",
      code: "EL",
      used: 12,
      total: 30,
      remaining: 18,
      accent: "bg-[#ff9500]",
      note: "Encashable quota",
    },
  ];

  const recentHistory = [
    {
      id: "REQ-2041",
      title: "ICLR 2026 Academic Conference",
      category: "On Duty (OD)",
      dates: "Oct 14 – Oct 17, 2026",
      days: "4 days",
      substitute: "Prof. Ananya Sen (Dept. Assigned)",
      status: "Approved",
      statusClass: "text-[#1d8a42] bg-[#34c759]/10 border-[#34c759]/20",
    },
    {
      id: "REQ-1988",
      title: "Family Emergency / Personal",
      category: "Casual Leave",
      dates: "Nov 02, 2026",
      days: "1 day",
      substitute: "Lectures Rescheduled",
      status: "Under Review",
      statusClass: "text-[#b25e00] bg-[#ff9500]/10 border-[#ff9500]/20",
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm tracking-tight text-[#1d1d1f]">
              Faculty Portal
            </span>
            <div className="h-4 w-px bg-black/[0.08]" />
            <nav className="flex items-center gap-5 text-xs text-[#86868b] font-normal">
              <a
                href="#"
                className="text-[#1d1d1f] font-medium transition-colors"
              >
                Overview
              </a>
              <a href="#" className="hover:text-[#1d1d1f] transition-colors">
                Leave History
              </a>
              <a href="#" className="hover:text-[#1d1d1f] transition-colors">
                Department Schedule
              </a>
              <a href="#" className="hover:text-[#1d1d1f] transition-colors">
                Academic Guidelines
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search requests..."
                className="w-48 pl-8 pr-3 py-1 text-xs rounded-full bg-black/[0.04] border border-transparent focus:border-black/[0.1] focus:bg-white focus:outline-none transition-all placeholder:text-[#86868b]"
              />
            </div>
            <div className="h-7 w-7 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-xs font-medium">
              FK
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#86868b]">
              Academic Session 2026–2027
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mt-1">
              Leave Quotas & Activity
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] bg-white border border-black/[0.08] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-black/[0.02] transition-colors">
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
                        className="px-5 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-full shadow-sm transition-colors"
                      >
                        Submit Request
                      </button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Apple Rounded Metric Cards (Quotas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quotas.map((item) => {
            const percentUsed = (item.used / item.total) * 100;
            return (
              <div
                key={item.code}
                className="rounded-[20px] bg-white p-5 border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1d1d1f]">
                      {item.type}
                    </span>
                    <span className="text-[11px] font-mono text-[#86868b] bg-black/[0.03] px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                      {item.remaining}
                    </span>
                    <span className="text-xs text-[#86868b]">
                      days left of {item.total}
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-black/[0.05] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.accent}`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-black/[0.04] text-[11px] text-[#86868b]">
                  {item.note}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-[#1d1d1f]">
                  Recent Applications
                </h2>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Track approvals, substitute coverage, and dates
                </p>
              </div>
              <a
                href="#"
                className="text-xs text-[#0071e3] hover:underline flex items-center gap-0.5"
              >
                All records <ChevronRight className="h-3 w-3" />
              </a>
            </div>
            <div className="divide-y divide-black/[0.05]">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#1d1d1f]">
                        {item.title}
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
                        {item.dates} ({item.days})
                      </span>
                      <span>•</span>
                      <span>{item.substitute}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${item.statusClass}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1d1d1f]">
                <Calendar className="h-4 w-4 text-[#0071e3]" /> Upcoming
                Institutional Recess
              </div>
              <p className="text-xs text-[#86868b] mt-2 leading-relaxed">
                Mid-term recess starts next week (Oct 26 – Oct 30). Academic
                duties resume on Monday, Nov 02. Leaves contiguous with vacation
                days require Dean confirmation.
              </p>
              <div className="mt-5 space-y-2.5">
                <div className="text-xs font-medium text-[#1d1d1f]">
                  Department Resources
                </div>
                <a
                  href="#"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#f5f5f7] hover:bg-black/[0.05] transition-colors text-xs text-[#1d1d1f]"
                >
                  <span>Faculty Policy Handbook</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#86868b]" />
                </a>
                <a
                  href="#"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#f5f5f7] hover:bg-black/[0.05] transition-colors text-xs text-[#1d1d1f]"
                >
                  <span>Substitute Duty Guidelines</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#86868b]" />
                </a>
              </div>
            </div>
            <div className="pt-4 border-t border-black/[0.04] text-[11px] text-[#86868b]">
              Need assistance? Contact the{" "}
              <a href="#" className="text-[#0071e3] hover:underline">
                Academic Registrar
              </a>
              .
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
