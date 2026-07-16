import { NextResponse } from "next/server";
import { orderStatuses } from "@/data/catalog";
import { orderFromRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).range(0, 99);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data.map(orderFromRow), source: "supabase" });
}

export async function PATCH(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.id || !orderStatuses.includes(body.status)) return NextResponse.json({ error: "Valid order id and status are required." }, { status: 400 });
  const { data, error } = await client.from("orders").update({ status: body.status }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: orderFromRow(data), source: "supabase" });
}
