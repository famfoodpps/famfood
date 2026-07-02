"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { formatCurrency, getCategoryName } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/hooks/useLanguage";
import type { Product } from "@/types/catalog";

type ProductCardProps = {
  product: Product;
  mode?: "public" | "restaurant";
};

export function ProductCard({ product, mode = "public" }: ProductCardProps) {
  const cart = useCart(mode);
  const { locale, pick } = useLanguage();
  const price = mode === "restaurant" ? product.restaurantPrice : product.publicPrice;
  const categoryName = product.categoryName ? pick(product.categoryName) : getCategoryName(product.categoryId, locale);

  return (
    <article className="group overflow-hidden border border-[#ddd7cc] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#07586b] hover:shadow-2xl hover:shadow-[#07586b]/10">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-[#f7f2e8]">
          <Image src={product.image} alt={pick(product.name)} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="absolute left-4 top-4 bg-white/94 px-3 py-1 text-xs font-black uppercase text-[#07586b]">
            {categoryName}
          </span>
        </div>
      </Link>
      <div className="p-6 text-center">
        <Link href={`/products/${product.slug}`} className="display-serif text-xl font-medium text-[#182126] hover:text-[#07586b]">
          {pick(product.name)}
        </Link>
        <p className="mt-2 text-sm text-slate-500">
          {pick(product.packing)} · {product.weight}
        </p>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{pick(product.description)}</p>
        <div className="mt-5 flex flex-col items-stretch justify-between gap-3 border-t border-[#eee7da] pt-5 sm:flex-row sm:items-center">
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{mode === "restaurant" ? "Restaurant" : "Retail"}</p>
            <p className="text-xl font-black text-[#07586b]">{formatCurrency(price)}</p>
          </div>
          <button
            type="button"
            disabled={!product.active || product.stockStatus === "Out of Stock"}
            onClick={() => cart.add(product.id)}
            className="inline-flex h-10 items-center justify-center bg-[#07586b] px-4 text-sm font-black text-white hover:bg-[#043f4f] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            {mode === "restaurant" ? <Plus className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
