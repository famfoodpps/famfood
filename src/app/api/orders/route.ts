import { NextResponse } from "next/server";
import { demoOrders, products } from "@/data/catalog";
import { orderFromRow, productFromRow } from "@/lib/db-mappers";
import { hasPdfCatalogProducts } from "@/lib/catalog-source";
import { createAdminSupabase, getBearerProfile } from "@/lib/supabase";
import type { CartItem } from "@/types/catalog";

export async function GET() {
  const client = createAdminSupabase();
  if (!client) return NextResponse.json({ orders: demoOrders, source: "seed" });

  const { data, error } = await client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data.map(orderFromRow), source: "supabase" });
}

export async function POST(request: Request) {
  const body = await request.json();
  const items = (body.items ?? []) as CartItem[];
  const channel = body.channel === "Restaurant" ? "Restaurant" : "Public";
  const details = body.details ?? {};
  const client = createAdminSupabase();
  let catalog = products;
  if (client) {
    const { data: dbProducts } = await client.from("products").select("*, categories(slug, name_en, name_zh)").eq("active", true);
    if (dbProducts) {
      const dbCatalog = dbProducts.map(productFromRow);
      catalog = hasPdfCatalogProducts(dbCatalog) ? dbCatalog : products;
    }
  }

  const lines = items
    .map((item) => {
      const product = catalog.find((candidate) => candidate.id === item.productId);
      if (!product) return null;
      const unitPrice = channel === "Restaurant" ? product.restaurantPrice || product.publicPrice : product.publicPrice;
      return {
        product,
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice,
        lineTotal: unitPrice * Math.max(1, Number(item.quantity) || 1),
      };
    })
    .filter(Boolean) as { product: (typeof products)[number]; quantity: number; unitPrice: number; lineTotal: number }[];

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const orderNumber = `FO-${Date.now().toString().slice(-6)}`;
  const fallbackOrder = {
    id: `local-${Date.now()}`,
    orderNumber,
    channel,
    customerName: details.name ?? "Customer",
    customerPhone: details.phone ?? "",
    fulfillment: details.fulfillment ?? "Delivery",
    address: details.address ?? "",
    preferredDate: details.preferredDate ?? null,
    notes: details.notes ?? "",
    status: "Pending",
    total,
    createdAt: new Date().toISOString(),
    items: lines.map((line) => ({
      productId: line.product.id,
      productName: line.product.name.en,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
  };

  if (!client) return NextResponse.json({ order: fallbackOrder, source: "seed" }, { status: 201 });

  let restaurantCustomerId = body.restaurantCustomerId ?? null;
  if (channel === "Restaurant") {
    const profile = await getBearerProfile(request, client);
    if (!profile || profile.role !== "restaurant") return NextResponse.json({ error: "Unauthorized restaurant order." }, { status: 401 });
    const { data: customer, error: customerError } = await client.from("restaurant_customers").select("id").eq("user_id", profile.id).maybeSingle();
    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
    if (!customer) return NextResponse.json({ error: "Restaurant customer profile not found." }, { status: 404 });
    restaurantCustomerId = customer.id;
  }

  const { data: order, error: orderError } = await client
    .from("orders")
    .insert({
      order_number: orderNumber,
      restaurant_customer_id: restaurantCustomerId,
      customer_name: fallbackOrder.customerName,
      customer_phone: fallbackOrder.customerPhone,
      customer_email: details.email ?? null,
      channel,
      fulfillment: fallbackOrder.fulfillment,
      address: fallbackOrder.address,
      preferred_date: fallbackOrder.preferredDate,
      notes: fallbackOrder.notes,
      status: "Pending",
      total,
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const { error: itemsError } = await client.from("order_items").insert(
    lines.map((line) => ({
      order_id: order.id,
      product_id: null,
      product_slug: line.product.slug,
      product_name: line.product.name.en,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      line_total: line.lineTotal,
    })),
  );

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  return NextResponse.json({ order: { ...fallbackOrder, id: order.id }, source: "supabase" }, { status: 201 });
}
