import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  if (!allowedTypes.has(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image under 5 MB.");
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const supabase = getSupabaseBrowserClient();
  const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("profile-photos").upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: previous } = await supabase.from("profiles").select("avatar_path").eq("id", userId).single();
  const { error: updateError } = await supabase.from("profiles").update({ avatar_path: objectPath }).eq("id", userId);
  if (updateError) {
    await supabase.storage.from("profile-photos").remove([objectPath]);
    throw new Error(updateError.message);
  }
  if (previous?.avatar_path) await supabase.storage.from("profile-photos").remove([previous.avatar_path]);

  const { data: signed, error: signedError } = await supabase.storage.from("profile-photos").createSignedUrl(objectPath, 3600);
  if (signedError || !signed) throw new Error(signedError?.message ?? "Could not display the uploaded photo.");
  return signed.signedUrl;
}
