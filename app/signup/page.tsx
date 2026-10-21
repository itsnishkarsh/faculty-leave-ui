"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { roleHome, signUpFaculty } from "@/lib/auth-store";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    const confirmation = String(data.get("confirmPassword"));
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    try {
      const result = await signUpFaculty(name, email, password);
      if (result.error) return setError(result.error);
      if (result.needsEmailConfirmation) {
        setMessage("Account created. Check your email and confirm the address, then sign in.");
        return;
      }
      if (result.session) router.push(roleHome(result.session.role));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect to Supabase.");
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-4 text-[#1d1d1f]"><div className="w-full max-w-[420px]"><Link href="/login" className="mb-5 inline-flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link><section className="rounded-[24px] border border-black/[0.04] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"><div className="mb-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0071e3]/10 text-[#0071e3]"><UserPlus className="h-5 w-5" /></div><h1 className="text-2xl font-semibold">Faculty sign up</h1><p className="mt-1 text-sm text-[#86868b]">Create your account to submit and track leave requests.</p></div><form onSubmit={handleSignUp} className="space-y-4"><label className="block space-y-1.5 text-xs font-medium">Full name<input name="name" required autoComplete="name" className="w-full rounded-xl bg-black/[0.03] px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30" /></label><label className="block space-y-1.5 text-xs font-medium">Institutional email<input name="email" type="email" required autoComplete="email" className="w-full rounded-xl bg-black/[0.03] px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30" /></label><label className="block space-y-1.5 text-xs font-medium">Password<input name="password" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-xl bg-black/[0.03] px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30" /></label><label className="block space-y-1.5 text-xs font-medium">Confirm password<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-xl bg-black/[0.03] px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#0071e3]/30" /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}<button type="submit" className="w-full rounded-full bg-[#0071e3] py-2.5 text-sm font-medium text-white hover:bg-[#0077ed]">Create faculty account</button></form><p className="mt-5 text-xs leading-relaxed text-[#86868b]">HOD and Admin roles must be assigned by an administrator in Supabase.</p></section></div></main>;
}
