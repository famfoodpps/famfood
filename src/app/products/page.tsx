"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { categories as seedCategories, getProductCategorySlug, products as seedProducts } from "@/data/catalog";
import { useLanguage } from "@/hooks/useLanguage";
import type { Category, Product } from "@/types/catalog";

export default function ProductsPage() {
  const { locale, pick } = useLanguage();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [products, setProducts] = useState<Product[]>(seedProducts);

  useEffect(() => {
    queueMicrotask(() => {
      const initial = new URLSearchParams(window.location.search).get("category");
      if (initial) setCategory(initial);
    });
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/categories").then((response) => response.json()), fetch("/api/products").then((response) => response.json())])
      .then(([categoryPayload, productPayload]) => {
        if (Array.isArray(categoryPayload.categories) && seedCategories.every((seedCategory) => categoryPayload.categories.some((item: Category) => item.slug === seedCategory.slug))) {
          setCategories(categoryPayload.categories);
        }
        if (Array.isArray(productPayload.products)) setProducts(productPayload.products);
      })
      .catch(() => {
        setCategories(seedCategories);
        setProducts(seedProducts);
      });
  }, []);

  const selectedCategory = useMemo(() => {
    if (category === "all") return null;
    return categories.find((item) => item.slug === category || item.id === category) || null;
  }, [categories, category]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const categorySlug = selectedCategory?.slug || category;
      const matchesCategory =
        category === "all" ||
        getProductCategorySlug(product) === categorySlug ||
        product.categorySlug === category ||
        product.categoryId === category;
      const target = `${product.name.en} ${product.name.zh} ${product.description.en} ${product.description.zh}`.toLowerCase();
      const matchesQuery = target.includes(query.toLowerCase());
      return product.active && matchesCategory && matchesQuery;
    });
  }, [category, products, query, selectedCategory]);

  return (
    <>
      <PageHero title="Product Center" eyebrow={locale === "zh" ? "FAMFOOD 产品中心" : "FAMFOOD Products"} image="/sample-assets/seafood-table.jpg" />

      <section className="border-b border-[#ddd7cc] bg-[#f7f2e8]">
        <div className="section-shell flex overflow-x-auto text-sm">
          <button
            type="button"
            onClick={() => setCategory("all")}
            data-text={locale === "zh" ? "全部" : "All"}
            className={`category-tab h-16 min-w-32 border-l border-[#ddd7cc] px-7 font-black ${category === "all" ? "active" : ""}`}
          >
            <span>{locale === "zh" ? "全部" : "All"}</span>
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.slug)}
              data-text={pick(item.name)}
              className={`category-tab h-16 min-w-44 border-l border-[#ddd7cc] px-7 font-black last:border-r ${
                category === item.slug || category === item.id ? "active" : ""
              }`}
            >
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
              <h2 className="display-serif mt-3 border-l-4 border-[#c22931] pl-5 text-4xl font-medium text-[#182126]">
                {locale === "zh" ? "产品目录" : "Product Catalog"}
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-600">
                {locale === "zh"
                  ? "浏览 FAMFOOD 海鲜、肉类、冷冻食品、烹饪干货、饮品与配套优惠。"
                  : "Browse FAMFOOD seafood, meat, frozen food, cooking essentials, drinks and bundle offers."}
              </p>
            </div>
            <label className="relative block">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={locale === "zh" ? "请输入关键词" : "Please enter keywords"}
                className="h-14 w-full border border-[#ddd7cc] bg-white pl-14 pr-5 text-sm outline-none focus:border-[#07586b]"
              />
            </label>
          </Reveal>

          <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
            {visibleProducts.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.03}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
          {visibleProducts.length === 0 && <div className="mt-10 border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No products matched your search.</div>}
        </div>
      </section>
    </>
  );
}
