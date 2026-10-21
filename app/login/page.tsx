"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Command } from "lucide-react";
import { getSession, roleHome, signIn } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const user = getSession();
    if (user) router.replace(roleHome(user.role));
  }, [router]);

  function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    const data = new FormData(event.currentTarget);
    const user = signIn(String(data.get("email")), String(data.get("password")));
    if (!user) {
      setError("We couldn’t find an account with those details.");
      setIsLoading(false);
      return;
    }
    router.push(roleHome(user.role));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f5f5f7] p-4 text-[#1d1d1f]">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1d1d1f] text-white shadow-lg"><Command className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Faculty Portal</h1>
        <p className="mt-1 text-sm text-[#86868b]">Sign in to continue to your dashboard</p>
      </div>
      <div className="w-full max-w-[390px] rounded-[24px] border border-black/[0.04] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <form onSubmit={handleSignIn} className="space-y-4">
          <label className="block space-y-1.5 text-xs font-medium">Email address<input name="email" type="email" autoComplete="username" placeholder="name@institution.edu" required className="w-full rounded-xl border border-transparent bg-black/[0.03] px-4 py-2.5 text-sm font-normal outline-none transition focus:border-black/10 focus:bg-white" /></label>
          <label className="block space-y-1.5 text-xs font-medium">Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required className="w-full rounded-xl border border-transparent bg-black/[0.03] px-4 py-2.5 text-sm font-normal outline-none transition focus:border-black/10 focus:bg-white" /></label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={isLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] py-2.5 text-sm font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-70">{isLoading ? "Signing in…" : "Sign in"}{!isLoading && <ArrowRight className="h-4 w-4" />}</button>
        </form>
        <p className="mt-5 text-center text-sm text-[#6e6e73]">New faculty member? <Link className="font-medium text-[#0071e3] hover:underline" href="/signup">Create an account</Link></p>
      </div>
      <details className="mt-5 w-full max-w-[390px] rounded-xl border border-black/[0.06] bg-white/70 px-4 py-3 text-xs text-[#6e6e73]
      "><summary className="cursor-pointer font-medium text-[#1d1d1f]">Demo accounts</summary><div className="mt-3 space-y-1.5"><p>Faculty: faculty@faculty.demo / Faculty123!</p><p>HOD: hod@faculty.demo / Hod123!</p><p>Admin: admin@faculty.demo / Admin123!</p></div></details>
      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-[#86868b]">Demo sign-in is stored in this browser. It is for project previews and is not secure authentication.</p>
    </main>
  );
}
