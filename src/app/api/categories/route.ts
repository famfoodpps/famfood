import { NextResponse } from "next/server";
import { categories } from "@/data/catalog";
import { categoryFromRow } from "@/lib/db-mappers";
import { createAdminSupabase } from "@/lib/supabase";

export async function GET() {
  const client = createAdminSupabase();
  if (!client) return NextResponse.json({ categories: categories.filter((category) => category.active), source: "seed" });

  const { data, error } = await client.from("categories").select("*").eq("active", true).order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data.map(categoryFromRow), source: "supabase" });
}
