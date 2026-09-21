"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Command, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"faculty" | "hod">("faculty");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate a brief network delay so the button feels realistic
    setTimeout(() => {
      if (role === "faculty") {
        router.push("/"); // Sends them to the main dashboard
      } else {
        router.push("/hod"); // Sends them to the HOD queue
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-4 text-[#1d1d1f] selection:bg-[#0071e3] selection:text-white">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center">
        <div className="h-12 w-12 bg-[#1d1d1f] rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
          <Command className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Faculty Portal
        </h1>
        <p className="text-sm text-[#86868b] mt-1">
          Sign in with your institutional Apple ID
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[360px] bg-white rounded-[24px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-black/[0.04]">
        {/* The "Demo" Role Toggle (Simulating Backend Auth Check) */}
        <div className="flex items-center p-1 bg-black/[0.04] rounded-lg mb-8">
          <button
            onClick={() => setRole("faculty")}
            type="button"
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              role === "faculty"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            Faculty
          </button>
          <button
            onClick={() => setRole("hod")}
            type="button"
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              role === "hod"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            HOD / Admin
          </button>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#1d1d1f] ml-1">
              Email ID
            </label>
            <input
              type="email"
              placeholder="name@institution.edu"
              required
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-black/[0.03] border border-transparent focus:border-black/[0.1] focus:bg-white focus:outline-none transition-all placeholder:text-[#86868b]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#1d1d1f] ml-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-black/[0.03] border border-transparent focus:border-black/[0.1] focus:bg-white focus:outline-none transition-all placeholder:text-[#86868b]"
            />
          </div>

          <a
            href="#"
            className="inline-block text-xs text-[#0071e3] hover:underline ml-1 mt-1"
          >
            Forgotten your password?
          </a>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-full shadow-sm transition-all disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Details */}
      <p className="mt-8 text-xs text-[#86868b]">
        Secure institutional login. Contact IT support for access issues.
      </p>
    </div>
  );
}
