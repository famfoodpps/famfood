import { NextResponse } from "next/server";
import { demoOrders } from "@/data/catalog";
import { orderFromRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ orders: demoOrders, source: "seed" });
  const { data, error } = await client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data.map(orderFromRow), source: "supabase" });
}

export async function PATCH(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ order: body, source: "seed" });
  const { data, error } = await client.from("orders").update({ status: body.status }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: orderFromRow(data), source: "supabase" });
}
