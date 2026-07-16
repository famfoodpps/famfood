import { NextResponse } from "next/server";
import { productFromRow } from "@/lib/db-mappers";
import { PRODUCT_SELECT } from "@/lib/product-query";
import { createAdminSupabase, getBearerProfile } from "@/lib/supabase";
import type { CartItem, Product, ProductVariant } from "@/types/catalog";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

type OrderLine = {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export async function POST(request: Request) {
  const client = createAdminSupabase();
  if (!client) return NextResponse.json({ error: "Order database is not configured." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? (body.items as CartItem[]).slice(0, 100) : [];
  if (!items.length) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  const channel = body.channel === "Restaurant" ? "Restaurant" : "Public";
  const details = (body.details && typeof body.details === "object" ? body.details : {}) as Record<string, string>;
  const productIds = [...new Set(items.map((item) => String(item.productId || "")).filter(Boolean))];

  const { data: rows, error: catalogError } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds)
    .eq("active", true);
  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 500 });
  const catalog = (rows || []).map(productFromRow);

  const lines = items.flatMap<OrderLine>((item) => {
    const product = catalog.find((candidate) => candidate.id === item.productId);
    if (!product) return [];
    const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId && candidate.active) : undefined;
    if (item.variantId && !variant) return [];
    const price = channel === "Restaurant"
      ? (variant ? variant.restaurantPrice : product.restaurantPrice)
      : (variant ? variant.promotionPrice ?? variant.retailPrice : product.publicPrice);
    if (price === null || price <= 0) return [];
    const quantity = Math.min(999, Math.max(1, Number(item.quantity) || 1));
    return [{ product, variant, quantity, unitPrice: price, lineTotal: price * quantity }];
  });

  if (lines.length !== items.length) {
    return NextResponse.json({ error: "One or more products are unavailable or require WhatsApp Ask Price." }, { status: 400 });
  }

  let restaurantCustomerId: string | null = null;
  if (channel === "Restaurant") {
    const profile = await getBearerProfile(request, client);
    if (!profile || profile.role !== "restaurant") return NextResponse.json({ error: "Unauthorized restaurant order." }, { status: 401 });
    const { data: customer, error } = await client.from("restaurant_customers").select("id").eq("user_id", profile.id).eq("status", "Active").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!customer) return NextResponse.json({ error: "Active restaurant profile not found." }, { status: 404 });
    restaurantCustomerId = customer.id;
  }

  const customerName = String(details.name || "").trim();
  const customerPhone = String(details.phone || "").trim();
  if (!customerName || !customerPhone) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const orderNumber = `FO-${Date.now().toString().slice(-8)}`;

  const { data: order, error: orderError } = await client.from("orders").insert({
    order_number: orderNumber,
    restaurant_customer_id: restaurantCustomerId,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: details.email?.trim() || null,
    channel,
    fulfillment: details.fulfillment === "Pickup" ? "Pickup" : "Delivery",
    address: details.address?.trim() || null,
    preferred_date: details.preferredDate || null,
    notes: details.notes?.trim() || null,
    status: "Pending",
    total,
  }).select("id, created_at").single();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const { error: itemsError } = await client.from("order_items").insert(lines.map((line) => ({
    order_id: order.id,
    product_id: line.product.id,
    product_variant_id: line.variant?.id || null,
    product_slug: line.product.slug,
    product_name: line.product.name.en,
    product_specification: line.variant?.specification || null,
    quantity: line.quantity,
    unit_price: line.unitPrice,
    line_total: line.lineTotal,
  })));
  if (itemsError) {
    await client.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ order: { id: order.id, orderNumber, total, createdAt: order.created_at }, source: "supabase" }, { status: 201 });
}
