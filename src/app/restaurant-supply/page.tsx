"use client";

import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { businessSettings } from "@/data/catalog";
import { useLanguage } from "@/hooks/useLanguage";
import type { Category, Product } from "@/types/catalog";

export default function RestaurantSupplyPage() {
  const { locale, pick } = useLanguage();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
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
      const params = new URLSearchParams({ catalog: "b2b", page: String(page), pageSize: "24" });
      if (category !== "all") params.set("category", category);
      if (query.trim()) params.set("q", query.trim());
      if (sort !== "recommended") params.set("sort", sort);

      try {
        const response = await fetch(`/api/products?${params}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load B2B products.");
        setProducts(Array.isArray(payload.products) ? payload.products : []);
        setTotalPages(payload.totalPages || 1);
        setTotal(payload.total || 0);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Unable to load B2B products.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 300 : 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [category, page, query, sort]);

  function selectCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  return (
    <>
      <PageHero title="Restaurant Supply" eyebrow={locale === "zh" ? "FAMFOOD 餐饮供应" : "FAMFOOD B2B Catalog"} image="/sample-assets/seafood-table.jpg" />

      <section className="border-y border-[#ddd7cc] bg-[#f7f2e8]">
        <div className="section-shell flex flex-wrap gap-2 py-5 md:py-6">
          <button type="button" onClick={() => selectCategory("all")} className={`category-chip ${category === "all" ? "active" : ""}`}>
            {locale === "zh" ? "全部" : "All"}
          </button>
          {categories.filter((item) => item.active).map((item) => (
            <button key={item.id} type="button" onClick={() => selectCategory(item.slug)} className={`category-chip ${category === item.slug ? "active" : ""}`}>
              <span>{pick(item.name)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="section-shell">
          <Reveal className="mb-12 grid gap-6 border border-[#ddd7cc] bg-[#f7f2e8] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div className="flex gap-4">
              <Building2 className="mt-1 h-8 w-8 shrink-0 text-[#07586b]" />
              <div>
                <h2 className="display-serif text-2xl font-medium text-[#182126]">
                  {locale === "zh" ? "登录查看餐饮价格与快速下单" : "Sign in for B2B pricing and quick ordering"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {locale === "zh"
                    ? "公开目录展示餐饮供应范围。餐饮价格、购物车、订单记录与客户专属功能仅在登录后显示。"
                    : "Browse our restaurant supply range publicly. B2B pricing, cart, order history and account tools are available after sign-in."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={`https://wa.me/${businessSettings.whatsappInternational}?text=${encodeURIComponent("Hi FAMFOOD, I would like to apply for a restaurant account.")}`}
                target="_blank"
                rel="noreferrer"
                className="ff-button ff-button-outline bg-white"
              >
                {locale === "zh" ? "申请账号" : "Apply Account"}
              </a>
              <Link href="/restaurant/login" className="ff-button ff-button-primary">
                {locale === "zh" ? "餐饮客户登录" : "Restaurant Login"}
              </Link>
            </div>
          </Reveal>

          <Reveal className="grid gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <p className="ff-eyebrow">{locale === "zh" ? "FAMFOOD 餐饮产品" : "Restaurant Supply"}</p>
              <h2 className="display-serif mt-3 border-l-4 border-[#c22931] pl-5 text-4xl font-medium text-[#182126]">
                {locale === "zh" ? "B2B 产品目录" : "B2B Product Catalog"}
              </h2>
              <p className="mt-4 text-sm font-bold text-slate-500">{total} {locale === "zh" ? "个餐饮产品" : "B2B products"}</p>
            </div>
            <div className="grid gap-3">
              <label className="relative block">
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                  placeholder={locale === "zh" ? "搜索餐饮产品" : "Search B2B products"}
                  className="h-14 w-full border border-[#ddd7cc] bg-white pl-14 pr-5 text-sm outline-none focus:border-[#07586b]"
                />
              </label>
              <select
                value={sort}
                onChange={(event) => { setSort(event.target.value); setPage(1); }}
                className="h-12 w-full border border-[#ddd7cc] bg-white px-4 text-sm outline-none focus:border-[#07586b] sm:w-56 sm:justify-self-end"
              >
                <option value="recommended">{locale === "zh" ? "推荐排序" : "Recommended"}</option>
                <option value="name_asc">{locale === "zh" ? "名称：A–Z" : "Name: A–Z"}</option>
              </select>
            </div>
          </Reveal>

          {error && <div className="mt-8 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {loading ? (
            <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[0.72] animate-pulse bg-slate-100" />)}
            </div>
          ) : (
            <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
              {products.map((product, index) => (
                <Reveal key={product.id} delay={index * 0.02} className="h-full">
                  <ProductCard product={product} mode="restaurant" detailHref={`/products/${product.slug}?catalog=b2b`} />
                </Reveal>
              ))}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="mt-10 border border-dashed border-slate-300 p-10 text-center text-slate-500">
              {locale === "zh" ? "没有符合条件的餐饮产品。" : "No B2B products matched your search."}
            </div>
          )}
          {!loading && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="ff-button ff-button-outline disabled:opacity-40">Previous</button>
              <span className="text-sm font-black">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="ff-button ff-button-outline disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
