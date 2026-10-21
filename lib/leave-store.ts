import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { UserRole } from "@/lib/auth-store";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";
export type LeaveRequest = {
  id: string;
  facultyId: string;
  faculty: string;
  category: string;
  startDate: string;
  endDate: string;
  substitute: string;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
};

const categoryNames: Record<string, string> = {
  cl: "Casual Leave",
  ml: "Medical Leave",
  od: "On Duty",
  el: "Earned Leave",
};

export async function readRequests(role: UserRole, facultyId: string): Promise<LeaveRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, faculty_id, leave_type, start_date, end_date, substitute, reason, status, submitted_at")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const facultyIds = [...new Set(rows.map((row) => row.faculty_id))];
  const names = new Map<string, string>();
  if (role !== "faculty" && facultyIds.length) {
    const profiles = await supabase.from("profiles").select("id, full_name").in("id", facultyIds);
    if (profiles.error) throw new Error(profiles.error.message);
    for (const profile of profiles.data ?? []) names.set(profile.id, profile.full_name);
  }

  return rows.map((row) => ({
    id: row.id,
    facultyId: row.faculty_id,
    faculty: row.faculty_id === facultyId ? "You" : names.get(row.faculty_id) ?? "Faculty member",
    category: categoryNames[row.leave_type] ?? row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    substitute: row.substitute ?? "",
    reason: row.reason,
    status: row.status.charAt(0).toUpperCase() + row.status.slice(1) as LeaveStatus,
    submittedAt: row.submitted_at,
  }));
}

export async function saveRequest(request: {
  facultyId: string;
  category: string;
  startDate: string;
  endDate: string;
  substitute: string;
  reason: string;
}) {
  const leaveTypes: Record<string, string> = { "Casual Leave": "cl", "Medical Leave": "ml", "On Duty": "od", "Earned Leave": "el" };
  const { error } = await getSupabaseBrowserClient().from("leave_requests").insert({
    faculty_id: request.facultyId,
    leave_type: leaveTypes[request.category] ?? request.category,
    start_date: request.startDate,
    end_date: request.endDate,
    substitute: request.substitute || null,
    reason: request.reason,
  });
  if (error) throw new Error(error.message);
}

export async function updateRequestStatus(id: string, status: LeaveStatus, reviewerId: string) {
  const { error } = await getSupabaseBrowserClient()
    .from("leave_requests")
    .update({
      status: status.toLowerCase(),
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function subscribeToLeaveRequests(onChange: () => void) {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase
    .channel("faculty-leave-requests")
    .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
