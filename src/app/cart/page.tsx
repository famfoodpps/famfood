"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/hooks/useLanguage";
import { buildWhatsAppOrderUrl, type CheckoutDetails } from "@/lib/whatsapp";

export default function CartPage() {
  const cart = useCart("public");
  const { locale, pick } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [savedOrder, setSavedOrder] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [details, setDetails] = useState<CheckoutDetails>({
    name: "",
    phone: "",
    email: "",
    fulfillment: "Delivery",
    address: "",
    preferredDate: "",
    notes: "",
  });

  const canCheckout =
    cart.lines.length > 0 &&
    details.name.trim() &&
    details.phone.trim() &&
    (details.fulfillment === "Pickup" || details.address?.trim());

  async function checkout() {
    if (!canCheckout || submitting) return;
    setSubmitting(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ details, items: cart.items, channel: "Public" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save order.");
      if (payload.order?.orderNumber) setSavedOrder(payload.order.orderNumber);
      window.open(buildWhatsAppOrderUrl(cart.lines, details, locale), "_blank", "noopener,noreferrer");
      cart.clear();
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : "Unable to save order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white pt-[110px]">
      <div className="section-shell py-12">
        <p className="ff-eyebrow">Retail Checkout</p>
        <h1 className="display-serif mt-3 text-5xl font-medium md:text-6xl">{locale === "zh" ? "购物车" : "Cart"}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          {locale === "zh" ? "提交后订单会保存到系统，并同时打开 WhatsApp 发送订单信息。" : "Submit your order to the system and send the same order message to FAMFOOD on WhatsApp."}
        </p>
        {savedOrder && <p className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Order saved: {savedOrder}</p>}
        {checkoutError && <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{checkoutError}</p>}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="ff-card p-5">
            {cart.lines.length === 0 ? (
              <div className="border border-dashed border-slate-300 p-10 text-center">
                <p className="text-lg font-bold text-slate-900">{locale === "zh" ? "购物车是空的。" : "Your cart is empty."}</p>
                <Link href="/products" className="ff-button ff-button-primary mt-5">
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.lines.map((line) => (
                  <div key={`${line.productId}:${line.variantId || ""}`} className="grid gap-4 border border-[#ddd7cc] p-4 sm:grid-cols-[100px_1fr_auto] sm:items-center">
                    <div className="relative h-24 overflow-hidden bg-[#f7f2e8]">
                      <Image src={line.product.image} alt={pick(line.product.name)} fill sizes="100px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{pick(line.product.name)}</p>
                      {line.variant?.specification && <p className="mt-1 text-sm font-bold text-slate-700">{line.variant.specification}</p>}
                      <p className="mt-1 text-sm text-slate-500">{pick(line.product.packing) || line.product.weight}</p>
                      <p className="mt-2 font-bold text-[#07586b]">{formatCurrency(line.lineTotal)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cart.update(line.productId, line.quantity - 1, line.variantId)} className="h-9 w-9 border border-slate-200">
                        <Minus className="mx-auto h-4 w-4" />
                      </button>
                      <input value={line.quantity} onChange={(event) => cart.update(line.productId, Number(event.target.value), line.variantId)} className="h-9 w-14 border border-slate-200 text-center text-sm font-bold" />
                      <button type="button" onClick={() => cart.update(line.productId, line.quantity + 1, line.variantId)} className="h-9 w-9 border border-slate-200">
                        <Plus className="mx-auto h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => cart.remove(line.productId, line.variantId)} className="h-9 w-9 text-red-600">
                        <Trash2 className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="ff-card p-6">
            <h2 className="display-serif text-3xl font-medium">Order details</h2>
            <div className="mt-5 space-y-4">
              <Input label="Name" value={details.name} onChange={(value) => setDetails({ ...details, name: value })} />
              <Input label="Phone" value={details.phone} onChange={(value) => setDetails({ ...details, phone: value })} />
              <Input label="Email" value={details.email ?? ""} onChange={(value) => setDetails({ ...details, email: value })} />
              <label className="block">
                <span className="admin-label">Delivery / Pickup</span>
                <select value={details.fulfillment} onChange={(event) => setDetails({ ...details, fulfillment: event.target.value as CheckoutDetails["fulfillment"] })} className="admin-input">
                  <option>Delivery</option>
                  <option>Pickup</option>
                </select>
              </label>
              {details.fulfillment === "Delivery" && <Input label="Address" value={details.address ?? ""} onChange={(value) => setDetails({ ...details, address: value })} />}
              <Input label="Preferred Date" type="date" value={details.preferredDate ?? ""} onChange={(value) => setDetails({ ...details, preferredDate: value })} />
              <Input label="Notes" value={details.notes ?? ""} onChange={(value) => setDetails({ ...details, notes: value })} />
            </div>
            <div className="mt-6 border-t border-[#eee7da] pt-5">
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span className="text-[#07586b]">{formatCurrency(cart.total)}</span>
              </div>
              <button type="button" onClick={checkout} disabled={!canCheckout || submitting} className="ff-button ff-button-primary mt-5 w-full disabled:cursor-not-allowed disabled:bg-slate-300">
                {submitting ? "Submitting..." : "Save Order + WhatsApp"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="admin-input" />
    </label>
  );
}
