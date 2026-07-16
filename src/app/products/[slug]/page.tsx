"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { Check, MessageCircle, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, getDefaultVariant, variantPrice } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/hooks/useLanguage";
import { productWhatsAppUrl } from "@/lib/whatsapp";
import type { Product, ProductVariant } from "@/types/catalog";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const { locale, pick } = useLanguage();
  const cart = useCart("public");
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/products?slug=${encodeURIComponent(params.slug)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load product.");
        const next = Array.isArray(payload.products) ? payload.products[0] as Product | undefined : undefined;
        if (!next) throw new Error("Product not found.");
        setProduct(next);
        const defaultVariant = getDefaultVariant(next, "public");
        setSelectedVariantId(defaultVariant?.id || "");
        if (next.categorySlug) {
          fetch(`/api/products?category=${encodeURIComponent(next.categorySlug)}&pageSize=4`)
            .then((result) => result.json())
            .then((relatedPayload) => setRelated((relatedPayload.products || []).filter((item: Product) => item.id !== next.id).slice(0, 3)))
            .catch(() => undefined);
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load product."))
      .finally(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    if (!added) return;
    const timeout = window.setTimeout(() => setAdded(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [added]);

  if (loading) return <div className="min-h-screen animate-pulse bg-slate-50 pt-[110px]" />;
  if (error || !product) return <div className="section-shell min-h-[60vh] pt-[150px]"><div className="border border-red-200 bg-red-50 p-6 font-bold text-red-700">{error || "Product not found."}</div></div>;

  const selectedVariant = product.variants.find((item) => item.id === selectedVariantId) || getDefaultVariant(product, "public");
  const publicPrice = selectedVariant ? variantPrice(selectedVariant, "public") : product.publicPrice;
  const restaurantPrice = selectedVariant ? variantPrice(selectedVariant, "restaurant") : product.restaurantPrice;
  const categoryName = pick(product.categoryName ?? { en: product.sourceCategory || "Products", zh: product.sourceCategory || "产品" });
  const hasPublicPrice = publicPrice !== null && publicPrice > 0;

  return (
    <div className="bg-white pt-[110px]">
      <div className="section-shell py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative aspect-square overflow-hidden border border-[#ddd7cc] bg-[#f7f2e8]">
            <Image src={product.image} alt={pick(product.name)} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="ff-card p-7 md:p-10">
            <p className="ff-eyebrow">{categoryName}</p>
            <h1 className="display-serif mt-4 break-words text-5xl font-medium text-[#182126] md:text-6xl">{pick(product.name)}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{pick(product.description)}</p>
            {product.variants.length > 1 && <label className="mt-7 block"><span className="admin-label">{locale === "zh" ? "规格" : "Specification"}</span><select value={selectedVariant?.id || ""} onChange={(event) => setSelectedVariantId(event.target.value)} className="admin-input mt-2">{product.variants.filter((item) => item.active).map((variant: ProductVariant) => <option key={variant.id} value={variant.id}>{variant.specification}{variant.code ? ` · ${variant.code}` : ""}</option>)}</select></label>}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info label="SKU" value={product.sku} />
              <Info label={locale === "zh" ? "包装" : "Packing"} value={pick(product.packing)} />
              <Info label={locale === "zh" ? "重量" : "Weight"} value={product.weight} />
              <Info label="MOQ" value={pick(product.moq)} />
            </div>
            <div className="mt-8 bg-[#f7f2e8] p-5">
              <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Public price</p>
                  <p className="text-3xl font-black text-[#07586b]">{hasPublicPrice ? formatCurrency(publicPrice) : "Ask Price"}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Restaurant price</p>
                  <p className="text-3xl font-black text-[#182126]">{restaurantPrice !== null && restaurantPrice > 0 ? formatCurrency(restaurantPrice) : "Ask Price"}</p>
                </div>
                <StatusBadge value={product.stockStatus} />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {hasPublicPrice ? (
                <button
                  type="button"
                  onClick={() => {
                    cart.add(product.id, 1, selectedVariant?.id);
                    setAdded(true);
                  }}
                  className={`ff-button ${added ? "bg-emerald-600 text-white hover:bg-emerald-700" : "ff-button-primary"}`}
                >
                  {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {added ? (locale === "zh" ? "已加入购物车" : "Added to Cart") : "Add to Cart"}
                </button>
              ) : (
                <a href={productWhatsAppUrl(product, locale, selectedVariant)} target="_blank" rel="noreferrer" className="ff-button ff-button-primary">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Ask Price
                </a>
              )}
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <section className="mt-16">
            <p className="ff-eyebrow">Related Products</p>
            <h2 className="display-serif mt-3 text-4xl font-medium text-[#182126]">More From This Category</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#ddd7cc] p-4">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-[#182126]">{value}</p>
    </div>
  );
}
