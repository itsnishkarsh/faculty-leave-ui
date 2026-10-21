export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveRequest = {
  id: string;
  faculty: string;
  category: string;
  startDate: string;
  endDate: string;
  substitute: string;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
};

const STORAGE_KEY = "faculty-portal-leave-requests-v1";
const CHANGE_EVENT = "faculty-leave-requests-changed";

export function readRequests(): LeaveRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? (value as LeaveRequest[]) : [];
  } catch {
    return [];
  }
}

export function getRequestsSnapshot() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

export function createRequestId() {
  return `REQ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function saveRequest(request: LeaveRequest) {
  const requests = readRequests();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([request, ...requests]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function updateRequestStatus(id: string, status: LeaveStatus) {
  const requests = readRequests().map((request) => request.id === id ? { ...request, status } : request);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToRequests(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
