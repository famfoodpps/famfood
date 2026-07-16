import { NextResponse } from "next/server";
import { assertRole } from "@/lib/supabase";

type PriceUpdate = {
  sku?: string;
  slug?: string;
  name?: string;
  specification?: string;
  retailPrice?: number | null;
  promotionPrice?: number | null;
  restaurantPrice?: number | null;
};

type VariantRow = {
  id: string;
  specification: string | null;
  retail_price: number | null;
  promotion_price: number | null;
  restaurant_price: number | null;
  active: boolean;
  sort_order: number;
};

type ProductRow = {
  id: string;
  sku: string | null;
  slug: string | null;
  name_en: string | null;
  public_price: number | null;
  restaurant_price: number | null;
  active: boolean;
  categories: { name_en: string | null } | null;
  product_variants: VariantRow[];
};

const PRICE_SELECT = "id, sku, slug, name_en, public_price, restaurant_price, active, categories(name_en), product_variants(id, specification, retail_price, promotion_price, restaurant_price, active, sort_order)";

function csvCell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function sortedVariants(product: ProductRow) {
  return [...(product.product_variants || [])].sort((a, b) => a.sort_order - b.sort_order);
}

export async function GET(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await client.from("products").select(PRICE_SELECT).order("name_en");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ["sku", "slug", "name", "specification", "retailPrice", "promotionPrice", "restaurantPrice", "category", "productActive"];
  const rows: (string | number | boolean | null)[][] = [];
  for (const product of (data || []) as unknown as ProductRow[]) {
    const variants = sortedVariants(product);
    if (variants.length === 0) {
      rows.push([product.sku, product.slug, product.name_en, "", product.public_price, null, product.restaurant_price, product.categories?.name_en || "", product.active]);
      continue;
    }
    for (const variant of variants) {
      rows.push([product.sku, product.slug, product.name_en, variant.specification || "", variant.retail_price, variant.promotion_price, variant.restaurant_price, product.categories?.name_en || "", product.active]);
    }
  }
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="famfood-prices-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function numberFrom(value: string | undefined) {
  if (value === undefined) return undefined;
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/RM/gi, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function updatesFromCsv(text: string): PriceUpdate[] {
  const rows = parseCsv(text);
  const [header = [], ...body] = rows;
  const normalizedHeader = header.map((item) => item.trim().toLowerCase().replace(/[_\s-]+/g, ""));
  const indexOf = (...keys: string[]) => normalizedHeader.findIndex((item) => keys.includes(item));
  const skuIndex = indexOf("sku", "code");
  const slugIndex = indexOf("slug");
  const nameIndex = indexOf("name", "product", "productname");
  const specIndex = indexOf("specification", "spec", "variant");
  const retailIndex = indexOf("retailprice", "retail", "publicprice", "public", "price");
  const promotionIndex = indexOf("promotionprice", "promotion", "promo", "promoprice");
  const restaurantIndex = indexOf("restaurantprice", "restaurant", "wholesaleprice", "wholesale", "bulkprice");

  return body
    .map((row) => ({
      sku: skuIndex >= 0 ? row[skuIndex] : undefined,
      slug: slugIndex >= 0 ? row[slugIndex] : undefined,
      name: nameIndex >= 0 ? row[nameIndex] : undefined,
      specification: specIndex >= 0 ? row[specIndex] : undefined,
      retailPrice: retailIndex >= 0 ? numberFrom(row[retailIndex]) : undefined,
      promotionPrice: promotionIndex >= 0 ? numberFrom(row[promotionIndex]) : undefined,
      restaurantPrice: restaurantIndex >= 0 ? numberFrom(row[restaurantIndex]) : undefined,
    }))
    .filter((update) => (update.sku || update.slug || update.name) && (update.retailPrice !== undefined || update.promotionPrice !== undefined || update.restaurantPrice !== undefined));
}

export async function POST(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (file instanceof File && file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "CSV must be 2 MB or smaller." }, { status: 413 });
  const csvText = file instanceof File ? await file.text() : String(formData.get("csv") || "");
  const updates = updatesFromCsv(csvText);
  if (updates.length === 0) return NextResponse.json({ error: "No valid price rows found." }, { status: 400 });

  const { data, error: readError } = await client.from("products").select(PRICE_SELECT);
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const products = (data || []) as unknown as ProductRow[];

  const findProduct = (update: PriceUpdate) =>
    products.find((product) => {
      const name = String(product.name_en || "").toLowerCase();
      return (
        (update.sku && String(product.sku || "").toLowerCase() === update.sku.toLowerCase()) ||
        (update.slug && String(product.slug || "").toLowerCase() === update.slug.toLowerCase()) ||
        (update.name && name === update.name.toLowerCase())
      );
    });

  let updatedVariants = 0;
  let updatedProducts = 0;
  let unmatched = 0;
  const touchedProducts = new Map<string, ProductRow>();

  for (const update of updates) {
    const product = findProduct(update);
    if (!product) {
      unmatched += 1;
      continue;
    }
    const variants = sortedVariants(product);
    const spec = update.specification?.trim().toLowerCase();
    const variant = spec
      ? variants.find((item) => String(item.specification || "").trim().toLowerCase() === spec)
      : variants.length === 1
        ? variants[0]
        : undefined;

    if (variant) {
      const patch: Record<string, number | null> = {};
      if (update.retailPrice !== undefined) patch.retail_price = update.retailPrice;
      if (update.promotionPrice !== undefined) patch.promotion_price = update.promotionPrice;
      if (update.restaurantPrice !== undefined) patch.restaurant_price = update.restaurantPrice;
      if (Object.keys(patch).length > 0) {
        const { error } = await client.from("product_variants").update(patch).eq("id", variant.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        Object.assign(variant, patch);
        updatedVariants += 1;
        touchedProducts.set(product.id, product);
      }
    } else {
      const patch: Record<string, number | null> = {};
      if (update.retailPrice !== undefined) patch.public_price = update.retailPrice;
      if (update.restaurantPrice !== undefined) patch.restaurant_price = update.restaurantPrice;
      if (Object.keys(patch).length > 0) {
        const { error } = await client.from("products").update(patch).eq("id", product.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        updatedProducts += 1;
      }
    }
  }

  // Keep the product base price in sync with its default variant so
  // catalog sorting and no-variant fallbacks match what customers see.
  for (const product of touchedProducts.values()) {
    const variants = sortedVariants(product).filter((item) => item.active);
    const defaultVariant = variants.find((item) => (item.promotion_price ?? item.retail_price) !== null) || variants[0];
    if (!defaultVariant) continue;
    const patch: Record<string, number | null> = {};
    const publicPrice = defaultVariant.promotion_price ?? defaultVariant.retail_price;
    if (publicPrice !== null) patch.public_price = publicPrice;
    if (defaultVariant.restaurant_price !== null) patch.restaurant_price = defaultVariant.restaurant_price;
    if (Object.keys(patch).length > 0) {
      const { error } = await client.from("products").update(patch).eq("id", product.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ updated: updatedVariants + updatedProducts, updatedVariants, updatedProducts, unmatched, source: "supabase" });
}
