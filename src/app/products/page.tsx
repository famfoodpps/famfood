"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { useLanguage } from "@/hooks/useLanguage";
import type { Category, Product } from "@/types/catalog";

export default function ProductsPage() {
  const { locale, pick } = useLanguage();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const initial = new URLSearchParams(window.location.search).get("category");
      if (initial) setCategory(initial);
    });
    fetch("/api/categories")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load categories.");
        setCategories(Array.isArray(payload.categories) ? payload.categories : []);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load categories."));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), pageSize: "24" });
      if (category !== "all") params.set("category", category);
      if (query.trim()) params.set("q", query.trim());
      try {
        const response = await fetch(`/api/products?${params}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load products.");
        setProducts(Array.isArray(payload.products) ? payload.products : []);
        setTotalPages(payload.totalPages || 1);
        setTotal(payload.total || 0);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Unable to load products.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 300 : 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [category, page, query]);

  function selectCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  return (
    <>
      <PageHero title="Product Center" eyebrow={locale === "zh" ? "FAMFOOD 产品中心" : "FAMFOOD Products"} image="/sample-assets/seafood-table.jpg" />
      <section className="border-y border-[#ddd7cc] bg-[#f7f2e8]">
        <div className="section-shell flex flex-wrap gap-2 py-5 md:py-6">
          <button type="button" onClick={() => selectCategory("all")} className={`category-chip ${category === "all" ? "active" : ""}`}>{locale === "zh" ? "全部" : "All"}</button>
          {categories.filter((item) => item.active).map((item) => (
            <button key={item.id} type="button" onClick={() => selectCategory(item.slug)} className={`category-chip ${category === item.slug ? "active" : ""}`}>
              <span>{pick(item.name)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="bg-white py-16 md:py-20">
        <div className="section-shell">
          <Reveal className="grid gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <p className="ff-eyebrow">Product Management</p>
              <h2 className="display-serif mt-3 border-l-4 border-[#c22931] pl-5 text-4xl font-medium text-[#182126]">{locale === "zh" ? "产品目录" : "Product Catalog"}</h2>
              <p className="mt-4 text-sm font-bold text-slate-500">{total} {locale === "zh" ? "个产品系列" : "product families"}</p>
            </div>
            <label className="relative block">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={locale === "zh" ? "搜索产品或编号" : "Search product or SKU"} className="h-14 w-full border border-[#ddd7cc] bg-white pl-14 pr-5 text-sm outline-none focus:border-[#07586b]" />
            </label>
          </Reveal>
          {error && <div className="mt-8 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {loading ? (
            <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[0.72] animate-pulse bg-slate-100" />)}</div>
          ) : (
            <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
              {products.map((product, index) => <Reveal key={product.id} delay={index * 0.02}><ProductCard product={product} /></Reveal>)}
            </div>
          )}
          {!loading && !error && products.length === 0 && <div className="mt-10 border border-dashed border-slate-300 p-10 text-center text-slate-500">No products matched your search.</div>}
          {!loading && totalPages > 1 && <div className="mt-10 flex items-center justify-center gap-4"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="ff-button ff-button-outline disabled:opacity-40">Previous</button><span className="text-sm font-black">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="ff-button ff-button-outline disabled:opacity-40">Next</button></div>}
        </div>
      </section>
    </>
  );
}
