import { NextResponse } from "next/server";
import { products } from "@/data/catalog";
import { hasPdfCatalogProducts } from "@/lib/catalog-source";
import { productFromRow, productToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";
import type { Product } from "@/types/catalog";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function productRowForWrite(client: NonNullable<Awaited<ReturnType<typeof assertRole>>["client"]>, product: Product) {
  const row = productToRow(product);
  const categoryKey = product.categoryId || product.categorySlug || "";

  if (categoryKey && !isUuid(categoryKey)) {
    const { data } = await client.from("categories").select("id").eq("slug", categoryKey).maybeSingle();
    row.category_id = typeof data?.id === "string" ? data.id : null;
  }

  return row;
}

export async function GET(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ products, source: "seed" });

  const { data, error } = await client.from("products").select("*, categories(slug, name_en, name_zh)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const catalog = data.map(productFromRow);
  if (!hasPdfCatalogProducts(catalog)) {
    return NextResponse.json({ products, source: "seed-stale-supabase" });
  }
  return NextResponse.json({ products: catalog, source: "supabase" });
}

export async function POST(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ product: body, source: "seed" }, { status: 201 });

  const { data, error } = await client.from("products").upsert(await productRowForWrite(client, body), { onConflict: "slug" }).select("*, categories(slug, name_en, name_zh)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: productFromRow(data), source: "supabase" }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!client) return NextResponse.json({ product: body, source: "seed" });

  const query = isUuid(body.id)
    ? client.from("products").update(await productRowForWrite(client, body)).eq("id", body.id)
    : client.from("products").upsert(await productRowForWrite(client, body), { onConflict: "slug" });
  const { data, error } = await query.select("*, categories(slug, name_en, name_zh)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: productFromRow(data), source: "supabase" });
}
