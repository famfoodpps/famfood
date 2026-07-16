import { NextResponse } from "next/server";
import { assertRole } from "@/lib/supabase";

type PriceUpdate = {
  sku?: string;
  slug?: string;
  name?: string;
  publicPrice?: number | null;
  restaurantPrice?: number | null;
};

type ProductPriceTarget = {
  id: string;
  sku?: string | null;
  slug?: string | null;
  name_en?: string | null;
};

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
  const publicPriceIndex = indexOf("publicprice", "public", "retailprice", "retail", "publicprice");
  const restaurantPriceIndex = indexOf("restaurantprice", "restaurant", "wholesaleprice", "wholesale", "bulkprice");

  return body
    .map((row) => ({
      sku: skuIndex >= 0 ? row[skuIndex] : undefined,
      slug: slugIndex >= 0 ? row[slugIndex] : undefined,
      name: nameIndex >= 0 ? row[nameIndex] : undefined,
      publicPrice: publicPriceIndex >= 0 ? numberFrom(row[publicPriceIndex]) : undefined,
      restaurantPrice: restaurantPriceIndex >= 0 ? numberFrom(row[restaurantPriceIndex]) : undefined,
    }))
    .filter((update) => (update.sku || update.slug || update.name) && (update.publicPrice !== undefined || update.restaurantPrice !== undefined));
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

  const { data: productRows, error: readError } = await client.from("products").select("id, sku, slug, name_en");
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const findProduct = (update: PriceUpdate): ProductPriceTarget | undefined =>
    productRows?.find((product) => {
      const name = String(product.name_en || "").toLowerCase();
      return (
        (update.sku && String(product.sku || "").toLowerCase() === update.sku.toLowerCase()) ||
        (update.slug && String(product.slug || "").toLowerCase() === update.slug.toLowerCase()) ||
        (update.name && name === update.name.toLowerCase())
      );
    });

  const matched = updates
    .map((update) => ({ update, product: findProduct(update) }))
    .filter((item): item is { update: PriceUpdate; product: ProductPriceTarget } => Boolean(item.product));

  for (const item of matched) {
    const patch: Record<string, number | null> = {};
    if (item.update.publicPrice !== undefined) patch.public_price = item.update.publicPrice;
    if (item.update.restaurantPrice !== undefined) patch.restaurant_price = item.update.restaurantPrice;
    if (Object.keys(patch).length > 0) {
      const { error } = await client.from("products").update(patch).eq("id", item.product.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ updated: matched.length, unmatched: updates.length - matched.length, source: "supabase" });
}
