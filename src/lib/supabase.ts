import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export function createBrowserSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function createAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getBearerProfile(request: Request, client: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("id, role, display_name, phone")
    .eq("id", userData.user.id)
    .maybeSingle();

  return profile;
}

export async function assertRole(request: Request, roles: string[]) {
  const client = createAdminSupabase();
  if (!client) return { client: null, profile: null, ok: true };

  const profile = await getBearerProfile(request, client);
  const ok = Boolean(profile && roles.includes(profile.role));
  return { client, profile, ok };
}
