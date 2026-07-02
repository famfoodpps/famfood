import { NextResponse } from "next/server";
import { products, restaurantCustomers } from "@/data/catalog";
import { customerFromRow, orderFromRow, productFromRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";

export async function GET(request: Request) {
  const { client, profile, ok } = await assertRole(request, ["restaurant"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!client || !profile) {
    return NextResponse.json({
      customer: restaurantCustomers[0],
      products: products.filter((product) => product.active),
      orders: [],
      source: "seed",
    });
  }

  const { data: customerRow, error: customerError } = await client
    .from("restaurant_customers")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
  if (!customerRow) return NextResponse.json({ error: "Restaurant customer profile not found." }, { status: 404 });

  const [{ data: productRows, error: productsError }, { data: orderRows, error: ordersError }] = await Promise.all([
    client.from("products").select("*, categories(name_en, name_zh)").eq("active", true).order("created_at", { ascending: false }),
    client.from("orders").select("*, order_items(*)").eq("restaurant_customer_id", customerRow.id).order("created_at", { ascending: false }),
  ]);

  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });
  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  return NextResponse.json({
    customer: customerFromRow(customerRow),
    products: (productRows || []).map(productFromRow),
    orders: (orderRows || []).map(orderFromRow),
    source: "supabase",
  });
}
