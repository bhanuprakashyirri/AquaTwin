import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jqqduvjelvsnvxznttdi.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "your-supabase-anon-key-here" &&
  supabaseAnonKey.length > 20;

// Reusable Supabase client singleton
let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;

  // If anon key is missing, provide a safe dummy client that does not crash on mount,
  // but reports clear configuration guidance when methods are invoked.
  const keyToUse = isSupabaseConfigured
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

  _supabaseClient = createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "aquatwin.auth.token",
    },
  });

  return _supabaseClient;
}

export const supabase = getSupabaseClient();
