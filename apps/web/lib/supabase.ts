import { createClient } from "@supabase/supabase-js";

// Initialize the client (usually done once in a shared config)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function uploadFile(file: File) {
  const { data, error } = await supabase.storage
    .from("files") // Your bucket name
    .upload(`public/${file.name}`, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return { id: data.id, path: data.path };
}

export default uploadFile;
