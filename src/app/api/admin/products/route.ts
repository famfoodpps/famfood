import { NextResponse } from "next/server";
import { products } from "@/data/catalog";
import { productFromRow, productToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ products, source: "seed" });

  const { data, error } = await client.from("products").select("*, categories(name_en, name_zh)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data.map(productFromRow), source: "supabase" });
}

export async function POST(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ product: body, source: "seed" }, { status: 201 });

  const { data, error } = await client.from("products").insert(productToRow(body)).select("*, categories(name_en, name_zh)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: productFromRow(data), source: "supabase" }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ product: body, source: "seed" });

  const { data, error } = await client
    .from("products")
    .update(productToRow(body))
    .eq("id", body.id)
    .select("*, categories(name_en, name_zh)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: productFromRow(data), source: "supabase" });
}
