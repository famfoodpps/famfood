import { NextResponse } from "next/server";
import { categoryFromRow, categoryToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";
import type { Category } from "@/types/catalog";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validate(category: Partial<Category>) {
  if (!category.slug || !slugPattern.test(category.slug)) return "Slug must use lowercase letters, numbers and hyphens.";
  if (!category.name?.en?.trim() || !category.name?.zh?.trim()) return "English and Chinese category names are required.";
  if (!Number.isFinite(category.sortOrder)) return "Sort order must be a number.";
  return null;
}

export async function GET(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await client.from("categories").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data.map(categoryFromRow), source: "supabase" });
}

async function save(request: Request, method: "POST" | "PATCH") {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Category;
  const validationError = validate(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const row = categoryToRow(body);
  const { data: previous } = method === "PATCH" && isUuid(body.id)
    ? await client.from("categories").select("image_storage_path").eq("id", body.id).maybeSingle()
    : { data: null };
  const query = method === "PATCH" && isUuid(body.id)
    ? client.from("categories").update(row).eq("id", body.id)
    : client.from("categories").insert(row);
  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 });
  if (previous?.image_storage_path && previous.image_storage_path !== body.imageStoragePath) {
    const { error: removeError } = await client.storage.from("product-images").remove([previous.image_storage_path]);
    if (removeError) return NextResponse.json({ error: `Category saved, but the old image could not be removed: ${removeError.message}` }, { status: 500 });
  }
  return NextResponse.json({ category: categoryFromRow(data), source: "supabase" }, { status: method === "POST" ? 201 : 200 });
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
  if (!isUuid(id)) return NextResponse.json({ error: "A valid category id is required." }, { status: 400 });
  const { count, error: countError } = await client.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count || 0) > 0) return NextResponse.json({ error: `Move or delete the ${count} products in this category first.` }, { status: 409 });
  const { data: category } = await client.from("categories").select("image_storage_path").eq("id", id).maybeSingle();
  const { error } = await client.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (category?.image_storage_path) await client.storage.from("product-images").remove([category.image_storage_path]);
  return NextResponse.json({ deleted: true });
}
