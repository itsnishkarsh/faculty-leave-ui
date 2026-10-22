"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { uploadProfilePhoto } from "@/lib/profile-photo-store";

export function ProfilePhotoUploader() {
  const { session } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setPhotoUrl(session?.avatarUrl ?? null); }, [session?.avatarUrl]);
  if (!session) return null;

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session) return;
    setBusy(true);
    setError("");
    try {
      const uploadedUrl = await uploadProfilePhoto(session.id, file);
      setPhotoUrl(uploadedUrl);
      window.dispatchEvent(new CustomEvent("portal-profile-photo-updated", { detail: { avatarUrl: uploadedUrl } }));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload this photo."); }
    finally { setBusy(false); }
  }

  const initials = session.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return <div className="relative flex items-center gap-2">
    <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Upload or change profile photo" title="Upload or change profile photo" className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-semibold text-blue-700 ring-1 ring-black/10 disabled:opacity-60">
      {photoUrl ? <img src={photoUrl} alt={`${session.name}'s profile`} className="h-full w-full object-cover" /> : initials}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</span>
    </button>
    <button type="button" onClick={() => input.current?.click()} disabled={busy} className="text-xs font-medium text-[#6e6e73] hover:text-[#0071e3]">{busy ? "Uploading…" : "Profile photo"}</button>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectPhoto(event)} className="hidden" />
    {error && <p role="alert" className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg bg-red-50 p-2 text-xs text-red-700 shadow">{error}</p>}
  </div>;
}
