import { supabase } from "./supabase";
import { randomUUID } from "crypto";

export async function uploadFile({
  buffer,
  mimeType,
  userId,
}: {
  buffer: Buffer;
  mimeType: string;
  userId: string;
}) {
  const uuid = randomUUID();

  const filePath = `${userId}/${uuid}`;

  const { data, error } = await supabase.storage
    .from("files")
    .upload(filePath, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;
  return data;
}
