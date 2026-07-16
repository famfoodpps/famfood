import { NextResponse } from "next/server";
import { businessSettings } from "@/data/catalog";
import { settingsFromRow, settingsToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await client.from("business_settings").select("*").limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: settingsFromRow(data, businessSettings), source: "supabase" });
}

export async function PATCH(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  const row = settingsToRow(body);
  const { data: existing } = await client.from("business_settings").select("id").limit(1).maybeSingle();
  const query = existing
    ? client.from("business_settings").update(row).eq("id", existing.id).select().single()
    : client.from("business_settings").insert(row).select().single();
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: settingsFromRow(data, businessSettings), source: "supabase" });
}
