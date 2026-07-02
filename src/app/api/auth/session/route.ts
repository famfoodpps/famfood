import { NextResponse } from "next/server";
import { createAdminSupabase, getBearerProfile } from "@/lib/supabase";

export async function GET(request: Request) {
  const client = createAdminSupabase();
  if (!client) {
    return NextResponse.json({ profile: null, configured: false });
  }

  const profile = await getBearerProfile(request, client);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ profile, configured: true });
}
