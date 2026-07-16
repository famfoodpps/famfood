"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, MessageCircle, Plus, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency, getDefaultVariant, isPlaceholderDescription, variantPrice } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/hooks/useLanguage";
import { productWhatsAppUrl } from "@/lib/whatsapp";
import type { Product } from "@/types/catalog";

type ProductCardProps = {
  product: Product;
  mode?: "public" | "restaurant";
};

export function ProductCard({ product, mode = "public" }: ProductCardProps) {
  const cart = useCart(mode);
  const { locale, pick } = useLanguage();
  const variant = getDefaultVariant(product, mode);
  const price = variant ? variantPrice(variant, mode) : mode === "restaurant" ? product.restaurantPrice : product.publicPrice;
  const categoryName = pick(product.categoryName ?? { en: product.sourceCategory || "Products", zh: product.sourceCategory || "产品" });
  const hasPrice = price !== null && price > 0;
  const packing = pick(product.packing).trim();
  const weight = product.weight.trim();
  const specification = packing || weight;
  const description = pick(product.description);
  const showDescription = !isPlaceholderDescription(description);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timeout = window.setTimeout(() => setAdded(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [added]);

  function handleAdd() {
    cart.add(product.id, 1, variant?.id);
    setAdded(true);
  }

  return (
    <article className="group flex h-full min-h-[570px] flex-col overflow-hidden border border-[#ddd7cc] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#07586b] hover:shadow-2xl hover:shadow-[#07586b]/10">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-[#f7f2e8]">
          <Image src={product.image} alt={pick(product.name)} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="absolute left-4 top-4 bg-white/94 px-3 py-1 text-xs font-black uppercase text-[#07586b]">
            {categoryName}
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-6 text-center">
        <Link href={`/products/${product.slug}`} className="display-serif line-clamp-2 min-h-14 text-xl font-medium leading-7 text-[#182126] hover:text-[#07586b]">
          {pick(product.name)}
        </Link>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">{specification}</p>
        {showDescription && <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{description}</p>}
        <div className="mt-auto flex flex-col items-stretch justify-between gap-3 border-t border-[#eee7da] pt-5 sm:flex-row sm:items-center">
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{mode === "restaurant" ? "Restaurant" : "Retail"}</p>
            <p className="text-xl font-black text-[#07586b]">{hasPrice ? formatCurrency(price) : "Ask Price"}</p>
          </div>
          {hasPrice ? (
            <button
              type="button"
              disabled={!product.active || product.stockStatus === "Out of Stock"}
              onClick={handleAdd}
              className={`inline-flex h-10 items-center justify-center px-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto ${
                added ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#07586b] hover:bg-[#043f4f]"
              }`}
            >
              {added ? <Check className="mr-2 h-4 w-4" /> : mode === "restaurant" ? <Plus className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              {added ? (locale === "zh" ? "已加入" : "Added") : "Add"}
            </button>
          ) : (
            <a
              href={productWhatsAppUrl(product, locale, variant)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center bg-[#07586b] px-4 text-sm font-black text-white transition hover:bg-[#043f4f] sm:w-auto"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {locale === "zh" ? "WhatsApp 询价" : "WhatsApp Ask Price"}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
