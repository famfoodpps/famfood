import { NextResponse } from "next/server";
import { customerFromRow, customerToRow } from "@/lib/db-mappers";
import { assertRole } from "@/lib/supabase";
import type { RestaurantCustomer } from "@/types/catalog";

export async function GET(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await client.from("restaurant_customers").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data.map(customerFromRow), source: "supabase" });
}

export async function POST(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as RestaurantCustomer;
  if (!body.email || !body.temporaryPassword || !body.restaurantName || !body.picName) {
    return NextResponse.json({ error: "Restaurant name, PIC name, email and temporary password are required." }, { status: 400 });
  }

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email: body.email,
    password: body.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      role: "restaurant",
      restaurant_name: body.restaurantName,
      pic_name: body.picName,
    },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || "Unable to create auth user." }, { status: 500 });
  }

  const { error: profileError } = await client.from("profiles").insert({
    id: authData.user.id,
    role: "restaurant",
    display_name: body.restaurantName,
    phone: body.phone || null,
  });

  if (profileError) {
    await client.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data: customer, error: customerError } = await client
    .from("restaurant_customers")
    .insert({
      user_id: authData.user.id,
      restaurant_name: body.restaurantName,
      legal_company_name: body.legalCompanyName || body.restaurantName,
      pic_name: body.picName,
      phone: body.phone || null,
      email: body.email,
      address: body.address || null,
      company_registration_no: body.companyRegistrationNo || null,
      tax_identification_no: body.taxIdentificationNo || null,
      sst_registration_no: body.sstRegistrationNo || null,
      e_invoice_email: body.eInvoiceEmail || body.email,
      business_type: body.businessType || null,
      billing_address: body.billingAddress || body.address || null,
      billing_postcode: body.billingPostcode || null,
      billing_city: body.billingCity || null,
      billing_state: body.billingState || null,
      billing_country: body.billingCountry || "Malaysia",
      payment_terms: body.paymentTerms || "COD",
      login_enabled: true,
      price_tier: body.priceTier || "Standard Restaurant",
      status: body.status || "Active",
    })
    .select()
    .single();

  if (customerError) {
    await client.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  return NextResponse.json({ customer: customerFromRow(customer), source: "supabase" }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase admin connection is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as RestaurantCustomer;
  if (!body.id || !body.restaurantName?.trim() || !body.picName?.trim()) return NextResponse.json({ error: "Customer id, restaurant name and PIC name are required." }, { status: 400 });

  const { data, error } = await client.from("restaurant_customers").update(customerToRow(body)).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: customerFromRow(data), source: "supabase" });
}
