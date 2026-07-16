import { NextResponse } from "next/server";
import { customerFromRow, orderFromRow, productFromRow } from "@/lib/db-mappers";
import { cleanSearch, paginationFrom } from "@/lib/pagination";
import { PRODUCT_SELECT } from "@/lib/product-query";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, profile, ok, configured } = await assertRole(request, ["restaurant"]);
  if (!configured) return NextResponse.json({ error: "Restaurant database is not configured." }, { status: 503 });
  if (!ok || !client || !profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const category = searchParams.get("category")?.trim();
  const search = cleanSearch(searchParams.get("q"));
  const { page, pageSize, from, to } = paginationFrom(searchParams, 24);

  const { data: customerRow, error: customerError } = await client.from("restaurant_customers").select("*").eq("user_id", profile.id).maybeSingle();
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
  if (!customerRow) return NextResponse.json({ error: "Restaurant customer profile not found." }, { status: 404 });

  let productsQuery = client
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("active", true)
    .eq("product_variants.active", true)
    .order("restaurant_price", { ascending: true, nullsFirst: false })
    .order("name_en", { ascending: true });
  if (category && category !== "all") productsQuery = productsQuery.eq("categories.slug", category);
  if (search) productsQuery = productsQuery.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%,name_zh.ilike.%${search}%`);

  const [{ data: productRows, error: productsError, count }, { data: orderRows, error: ordersError }] = await Promise.all([
    productsQuery.range(from, to),
    client.from("orders").select("*, order_items(*)").eq("restaurant_customer_id", customerRow.id).order("created_at", { ascending: false }).range(0, 49),
  ]);
  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });
  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  return NextResponse.json({
    customer: customerFromRow(customerRow),
    products: (productRows || []).map(productFromRow),
    orders: (orderRows || []).map(orderFromRow),
    page,
    pageSize,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    source: "supabase",
  });
}
