import { NextResponse } from "next/server";
import { categories } from "@/data/catalog";
import { hasPdfCatalogCategories } from "@/lib/catalog-source";
import { categoryFromRow, categoryToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ categories, source: "seed" });
  const { data, error } = await client.from("categories").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const catalog = data.map(categoryFromRow);
  if (!hasPdfCatalogCategories(catalog)) {
    return NextResponse.json({ categories, source: "seed-stale-supabase" });
  }
  return NextResponse.json({ categories: catalog, source: "supabase" });
}

export async function PATCH(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ category: body, source: "seed" });
  const query = isUuid(body.id)
    ? client.from("categories").update(categoryToRow(body)).eq("id", body.id)
    : client.from("categories").upsert(categoryToRow(body), { onConflict: "slug" });
  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: categoryFromRow(data), source: "supabase" });
}
