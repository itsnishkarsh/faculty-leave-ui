"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getPortalSession, PortalSession } from "@/lib/auth-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthState = { loading: boolean; session: PortalSession | null; error: string | null };
const AuthContext = createContext<AuthState>({ loading: true, session: null, error: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, error: null });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const handlePortalSession = (event: Event) => {
      const detail = (event as CustomEvent<AuthState>).detail;
      if (active) setState({ loading: false, session: detail.session, error: detail.error });
    };
    window.addEventListener("faculty-portal-session", handlePortalSession);

    const applySession = async (session: Session | null) => {
      if (!session?.user) {
        if (active) setState({ loading: false, session: null, error: null });
        return;
      }
      const result = await getPortalSession(session.user);
      if (active) setState({ loading: false, session: result.session, error: result.error });
    };

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => { void applySession(session); }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void supabase.auth.getSession().then(({ data: sessionData }) => applySession(sessionData.session));
    } catch (error) {
      window.setTimeout(() => {
        if (active) setState({ loading: false, session: null, error: error instanceof Error ? error.message : "Supabase configuration error." });
      }, 0);
    }

    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("faculty-portal-session", handlePortalSession);
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
