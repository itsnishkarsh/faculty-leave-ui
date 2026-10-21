export type UserRole = "faculty" | "hod" | "admin";
export type PortalUser = { name: string; email: string; password: string; role: UserRole };
export type PortalSession = Omit<PortalUser, "password">;

const USERS_KEY = "faculty-portal-users-v1";
const SESSION_KEY = "faculty-portal-session-v1";

const demoUsers: PortalUser[] = [
  { name: "Demo Faculty", email: "faculty@faculty.demo", password: "Faculty123!", role: "faculty" },
  { name: "Demo HOD", email: "hod@faculty.demo", password: "Hod123!", role: "hod" },
  { name: "Demo Admin", email: "admin@faculty.demo", password: "Admin123!", role: "admin" },
];

function readUsers(): PortalUser[] {
  if (typeof window === "undefined") return demoUsers;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "null") as PortalUser[] | null;
    if (Array.isArray(parsed)) return parsed;
  } catch { /* Start with demo accounts if saved data is malformed. */ }
  window.localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
  return demoUsers;
}

export function signIn(email: string, password: string): PortalSession | null {
  const user = readUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password);
  if (!user) return null;
  const session: PortalSession = { name: user.name, email: user.email, role: user.role };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("faculty-portal-session-changed"));
  return session;
}

export function signUpFaculty(name: string, email: string, password: string): string | null {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) return "An account with this email already exists.";
  const user: PortalUser = { name: name.trim(), email: normalizedEmail, password, role: "faculty" };
  window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return null;
}

export function createManagedUser(name: string, email: string, password: string, role: "faculty" | "hod"): string | null {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) return "An account with this email already exists.";
  window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, { name: name.trim(), email: normalizedEmail, password, role }]));
  return null;
}

export function listPortalUsers(): Omit<PortalUser, "password">[] {
  return readUsers().map((user) => ({ name: user.name, email: user.email, role: user.role }));
}

export function getSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as PortalSession | null;
    if (!session || !["faculty", "hod", "admin"].includes(session.role) || typeof session.email !== "string" || typeof session.name !== "string") return null;
    return session;
  }
  catch { return null; }
}

export function getSessionSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function subscribeToSession(callback: () => void) {
  window.addEventListener("faculty-portal-session-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("faculty-portal-session-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function signOut() {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("faculty-portal-session-changed"));
}

export function roleHome(role: UserRole) {
  return role === "faculty" ? "/" : role === "hod" ? "/hod" : "/admin";
}
