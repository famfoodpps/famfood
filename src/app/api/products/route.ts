import { NextResponse } from "next/server";
import { productFromRow } from "@/lib/db-mappers";
import { cleanSearch, paginationFrom } from "@/lib/pagination";
import { PRODUCT_SELECT } from "@/lib/product-query";
import { createAdminSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const client = createAdminSupabase();
  if (!client) return NextResponse.json({ error: "Catalog database is not configured." }, { status: 503 });

  const searchParams = new URL(request.url).searchParams;
  const ids = searchParams.get("ids")?.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 100) || [];
  const slug = searchParams.get("slug")?.trim();
  const category = searchParams.get("category")?.trim();
  const catalog = searchParams.get("catalog")?.trim();
  const isB2bCatalog = catalog === "b2b";
  const featured = searchParams.get("featured") === "true";
  const search = cleanSearch(searchParams.get("q"));
  const sort = searchParams.get("sort");
  const { page, pageSize, from, to } = paginationFrom(searchParams);

  let query = client
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("active", true)
    .eq("product_variants.active", true);

  if (!isB2bCatalog) query = query.eq("retail_visible", true);

  if (sort === "price_asc") {
    query = query.order("public_price", { ascending: true, nullsFirst: false });
  } else if (sort === "price_desc") {
    query = query.order("public_price", { ascending: false, nullsFirst: false });
  } else if (sort === "name_asc") {
    query = query.order("name_en", { ascending: true });
  } else {
    query = query.order("featured", { ascending: false }).order("categories(sort_order)", { ascending: true });
  }
  if (sort !== "name_asc") query = query.order("name_en", { ascending: true });
  query = query.order("sort_order", { referencedTable: "product_variants", ascending: true });

  if (ids.length) query = query.in("id", ids);
  if (slug) query = query.eq("slug", slug);
  if (category && category !== "all") query = query.eq("categories.slug", category);
  if (featured) query = query.eq("featured", true);
  if (search) query = query.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%,name_zh.ilike.%${search}%`);
  if (!ids.length && !slug) query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const products = (data || []).map(productFromRow).map((product) => ({
    ...product,
    restaurantPrice: null,
    variants: product.variants.map((variant) => ({ ...variant, restaurantPrice: null })),
  }));
  return NextResponse.json({ products, page, pageSize, total: count || 0, totalPages: Math.ceil((count || 0) / pageSize), catalog: isB2bCatalog ? "b2b" : "retail", source: "supabase" });
}
