import { NextResponse } from "next/server";
import { productFromRow, productToRow, productVariantToRow } from "@/lib/db-mappers";
import { cleanSearch, paginationFrom } from "@/lib/pagination";
import { PRODUCT_SELECT } from "@/lib/product-query";
import { assertRole } from "@/lib/supabase";
import type { Product } from "@/types/catalog";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const slugPattern = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;

function validate(product: Partial<Product>) {
  if (!product.slug || !slugPattern.test(product.slug)) return "Slug must use lowercase letters, numbers and hyphens.";
  if (!product.name?.en?.trim() || !product.name?.zh?.trim()) return "English and Chinese product names are required.";
  if (!product.categoryId && !product.categorySlug) return "Category is required.";
  for (const value of [product.publicPrice, product.restaurantPrice]) {
    if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) return "Prices must be empty or zero and above.";
  }
  for (const variant of product.variants || []) {
    if (!variant.specification?.trim()) return "Every specification needs a name.";
    for (const value of [variant.retailPrice, variant.promotionPrice, variant.restaurantPrice]) {
      if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) return "Specification prices must be empty or zero and above.";
    }
  }
  return null;
}

async function productRowForWrite(client: NonNullable<Awaited<ReturnType<typeof assertRole>>["client"]>, product: Product) {
  const row = productToRow(product);
  const categoryKey = product.categoryId || product.categorySlug || "";
  if (categoryKey && !isUuid(categoryKey)) {
    const { data, error } = await client.from("categories").select("id").eq("slug", categoryKey).maybeSingle();
    if (error) throw error;
    row.category_id = typeof data?.id === "string" ? data.id : null;
  }
  if (!row.category_id) throw new Error("Selected category was not found.");
  return row;
}

async function saveVariants(client: NonNullable<Awaited<ReturnType<typeof assertRole>>["client"]>, product: Product, productId: string) {
  if (!Array.isArray(product.variants)) return;
  const { error: deleteError } = await client.from("product_variants").delete().eq("product_id", productId);
  if (deleteError) throw deleteError;
  if (!product.variants.length) return;
  const rows = product.variants.map((variant, index) => productVariantToRow({ ...variant, variantKey: variant.variantKey || `admin-${index + 1}`, sortOrder: index }, productId));
  const { error } = await client.from("product_variants").insert(rows);
  if (error) throw error;
}

export async function GET(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const searchParams = new URL(request.url).searchParams;
  const search = cleanSearch(searchParams.get("q"));
  const category = searchParams.get("category")?.trim();
  const status = searchParams.get("status")?.trim();
  const { page, pageSize, from, to } = paginationFrom(searchParams, 30);
  let query = client.from("products").select(PRODUCT_SELECT, { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (search) query = query.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%,name_zh.ilike.%${search}%`);
  if (category && category !== "all") query = query.eq("categories.slug", category);
  if (status === "active") query = query.eq("active", true);
  if (status === "inactive") query = query.eq("active", false);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const [{ count: activeTotal }, { count: featuredTotal }] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }).eq("active", true),
    client.from("products").select("id", { count: "exact", head: true }).eq("featured", true),
  ]);
  return NextResponse.json({ products: (data || []).map(productFromRow), page, pageSize, total: count || 0, activeTotal: activeTotal || 0, featuredTotal: featuredTotal || 0, totalPages: Math.ceil((count || 0) / pageSize), source: "supabase" });
}

async function save(request: Request, method: "POST" | "PATCH") {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Product;
  const validationError = validate(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  try {
    const row = await productRowForWrite(client, body);
    const { data: previous } = method === "PATCH" && isUuid(body.id)
      ? await client.from("products").select("image_storage_path").eq("id", body.id).maybeSingle()
      : { data: null };
    const query = method === "PATCH" && isUuid(body.id)
      ? client.from("products").update(row).eq("id", body.id)
      : client.from("products").insert(row);
    const { data, error } = await query.select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 });
    await saveVariants(client, body, data.id);
    const { data: saved, error: readError } = await client.from("products").select(PRODUCT_SELECT).eq("id", data.id).single();
    if (readError) throw readError;
    if (previous?.image_storage_path && previous.image_storage_path !== body.imageStoragePath) {
      const { error: removeError } = await client.storage.from("product-images").remove([previous.image_storage_path]);
      if (removeError) return NextResponse.json({ error: `Product saved, but the old image could not be removed: ${removeError.message}` }, { status: 500 });
    }
    return NextResponse.json({ product: productFromRow(saved), source: "supabase" }, { status: method === "POST" ? 201 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save product." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return save(request, "POST");
}

export async function PATCH(request: Request) {
  return save(request, "PATCH");
}

export async function DELETE(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id)) return NextResponse.json({ error: "A valid product id is required." }, { status: 400 });
  const { data: product } = await client.from("products").select("image_storage_path").eq("id", id).maybeSingle();
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (product?.image_storage_path) await client.storage.from("product-images").remove([product.image_storage_path]);
  return NextResponse.json({ deleted: true });
}
