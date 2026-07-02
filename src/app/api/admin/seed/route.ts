import { NextResponse } from "next/server";
import { businessSettings, categories, products } from "@/data/catalog";
import { categoryToRow, productToRow, settingsToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function POST(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ seeded: false, source: "seed", message: "Supabase is not configured." });

  const { error: categoryError } = await client.from("categories").upsert(categories.map(categoryToRow), { onConflict: "slug" });
  if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });

  const { data: categoryRows, error: categoryReadError } = await client.from("categories").select("id, slug");
  if (categoryReadError) return NextResponse.json({ error: categoryReadError.message }, { status: 500 });
  const categoryIdBySlug = new Map((categoryRows || []).map((category) => [category.slug, category.id]));

  const productRows = products.map((product) => ({
    ...productToRow(product),
    category_id: categoryIdBySlug.get(product.categoryId) || null,
  }));
  const { error: productError } = await client.from("products").upsert(productRows, { onConflict: "slug" });
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const { data: existingSetting } = await client.from("business_settings").select("id").limit(1).maybeSingle();
  const settingRow = settingsToRow(businessSettings);
  const settingQuery = existingSetting
    ? client.from("business_settings").update(settingRow).eq("id", existingSetting.id)
    : client.from("business_settings").insert(settingRow);
  const { error: settingError } = await settingQuery;
  if (settingError) return NextResponse.json({ error: settingError.message }, { status: 500 });

  return NextResponse.json({ seeded: true, categories: categories.length, products: products.length, source: "supabase" });
}
