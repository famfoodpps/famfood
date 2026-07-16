import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase";

let cachedClient: SupabaseClient | null | undefined;

function browserClient() {
  if (cachedClient === undefined) cachedClient = createBrowserSupabase();
  return cachedClient;
}

/**
 * Returns a valid access token for portal API calls.
 * Asks the Supabase client first so an expired token is silently
 * refreshed, then falls back to the token stored at login time.
 */
export async function getPortalToken() {
  const supabase = browserClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) return token;
    } catch {
      // fall through to the stored token
    }
  }
  try {
    const session = JSON.parse(window.localStorage.getItem("famfood-session") || "{}") as { token?: string };
    return session.token || "";
  } catch {
    return "";
  }
}
