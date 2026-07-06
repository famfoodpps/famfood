import { NextResponse } from "next/server";
import { categories } from "@/data/catalog";
import { hasPdfCatalogCategories } from "@/lib/catalog-source";
import { categoryFromRow } from "@/lib/db-mappers";
import { createAdminSupabase } from "@/lib/supabase";

export async function GET() {
  const client = createAdminSupabase();
  if (!client) return NextResponse.json({ categories: categories.filter((category) => category.active), source: "seed" });

  const { data, error } = await client.from("categories").select("*").eq("active", true).order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const catalog = data.map(categoryFromRow);
  if (!hasPdfCatalogCategories(catalog)) {
    return NextResponse.json({ categories: categories.filter((category) => category.active), source: "seed-stale-supabase" });
  }
  return NextResponse.json({ categories: catalog, source: "supabase" });
}
