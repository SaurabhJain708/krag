import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 1. Define the keys
// Use SUPABASE_URL for server-side (already in turbo.json env)
// Fallback to NEXT_PUBLIC_SUPABASE_URL if SUPABASE_URL is not set
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required"
  );
}
// ⚠️ VITAL: Use SERVICE_ROLE_KEY because you are using Better Auth
// and need to bypass RLS to access your private bucket.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

// 2. Extend the global scope so TypeScript knows about our hidden variable
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

// 3. Create the client (or reuse the existing one if it exists)
export const supabase =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false, // Not needed for server-side admin
      persistSession: false, // Not needed for server-side admin
    },
  });

// 4. Save the instance to the global scope if we aren't in production
if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabase = supabase;
}
