import { NextResponse } from "next/server";
import { categories } from "@/data/catalog";
import { categoryFromRow, categoryToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ categories, source: "seed" });
  const { data, error } = await client.from("categories").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data.map(categoryFromRow), source: "supabase" });
}

export async function PATCH(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ category: body, source: "seed" });
  const { data, error } = await client.from("categories").update(categoryToRow(body)).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: categoryFromRow(data), source: "supabase" });
}
