import { NextResponse } from "next/server";
import { products } from "@/data/catalog";
import { createAdminSupabase } from "@/lib/supabase";
import { productFromRow } from "@/lib/db-mappers";

export async function GET() {
  const client = createAdminSupabase();
  if (!client) {
    return NextResponse.json({ products: products.filter((product) => product.active), source: "seed" });
  }

  const { data, error } = await client
    .from("products")
    .select("*, categories(slug, name_en, name_zh)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data.map(productFromRow), source: "supabase" });
}
