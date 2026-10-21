"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LeaveConversation } from "@/components/leave-conversation";
import { useAuth } from "@/components/auth-provider";
import { ProtectedContent } from "@/components/protected-content";
import { LeaveRequest, readRequests } from "@/lib/leave-store";

function ConversationPageContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { session } = useAuth();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (session) {
      void readRequests(session.role, session.id)
        .then((requests) => {
          if (!active) return;
          const match = requests.find((item) => item.id === id) ?? null;
          setRequest(match);
          if (!match) setError("This leave request is unavailable to your account.");
        })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load this leave request."); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [id, session]);

  if (loading) return <main className="min-h-screen bg-[#f5f5f7] p-8 text-center text-sm text-[#86868b]">Loading leave request…</main>;
  if (!request || !session) return <main className="min-h-screen bg-[#f5f5f7] p-8 text-center text-sm text-red-700">{error || "Leave request not found."}</main>;
  return <LeaveConversation request={request} session={session} />;
}

export default function LeaveConversationPage() {
  return <ProtectedContent roles={["faculty", "hod", "admin"]}><ConversationPageContent /></ProtectedContent>;
}
