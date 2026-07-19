"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { HeroSlider } from "@/components/HeroSlider";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { RollingText } from "@/components/RollingText";
import { useLanguage } from "@/hooks/useLanguage";
import type { Category, Product } from "@/types/catalog";

const stockCategorySlugs = new Set([
  "fish-seafood",
  "prawn-squid",
  "shellfish",
  "meat",
  "hotpot-oden",
  "finger-food-dim-sum",
  "japanese-ingredients",
  "cooking-essentials",
  "dessert-drinks",
  "vegetables-fruits",
  "frozen-food",
]);

function categoryImage(category: Category) {
  const stockImage = stockCategorySlugs.has(category.slug)
    ? `/famfood-assets/categories/stock/${category.slug}.webp`
    : "";

  if (stockImage && !category.imageStoragePath) {
    return stockImage;
  }

  return category.image || stockImage || "/product-placeholder.svg";
}

export default function Home() {
  const { locale, pick } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/categories"), fetch("/api/products?featured=true&page=1&pageSize=8")])
      .then(async ([categoryResponse, productResponse]) => {
        const [categoryPayload, productPayload] = await Promise.all([categoryResponse.json(), productResponse.json()]);
        if (categoryResponse.ok) setCategories(Array.isArray(categoryPayload.categories) ? categoryPayload.categories : []);
        if (productResponse.ok) setFeatured(Array.isArray(productPayload.products) ? productPayload.products : []);
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <HeroSlider />

      <section className="relative overflow-hidden bg-[#fbfaf6] py-20 md:py-28">
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full border border-[#d8aa45]/30 md:h-96 md:w-96" />
        <div className="section-shell relative">
          <Reveal className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="ff-eyebrow">{locale === "zh" ? "更聪明的采购方式" : "A more considered way to buy food"}</p>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {locale === "zh" ? "本地精选 / 为真实厨房而设计" : "Local range / Built for real kitchens"}
                </span>
              </div>
              <h2 className="ff-title mt-6 max-w-xl text-[#182126]">
                {locale === "zh" ? (
                  <>
                    厨房有更多选择，<span className="text-[#07586b]">下单少一点复杂。</span>
                  </>
                ) : (
                  <>
                    More choice for the kitchen. <span className="text-[#07586b]">Less friction in the order.</span>
                  </>
                )}
              </h2>
              <div className="mt-10 flex max-w-md items-start gap-5 border-t border-[#d8aa45]/60 pt-5">
                <p className="text-sm font-bold leading-7 text-slate-600">
                  {locale === "zh"
                    ? "FAMFOOD 让食品采购更简单：精选海鲜、冷冻食品、饮品与厨房必备，搭配更顺手的订购方式，让每一次补货都更快。"
                    : "FAMFOOD makes sourcing feel simpler: a curated range of seafood, frozen food, drinks and kitchen essentials, with a smoother way to move every order forward."}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoBlock
                eyebrow={locale === "zh" ? "给餐饮客户" : "For food businesses"}
                title={locale === "zh" ? "为下一场出餐做好准备。" : "Ready for the next service."}
                text={
                  locale === "zh"
                    ? "查看餐厅价格、快速补货并集中管理订单记录，让团队少花时间找货，多花时间服务顾客。"
                    : "Access restaurant pricing, reorder quickly and keep order history in one place—so your team can spend less time sourcing and more time serving."
                }
                cta={locale === "zh" ? "查看餐饮供应" : "View restaurant supply"}
                href="/restaurant-supply"
                icon={<Building2 className="h-7 w-7" />}
                tone="dark"
              />
              <InfoBlock
                eyebrow={locale === "zh" ? "给家庭与零售" : "For homes & retail"}
                title={locale === "zh" ? "好食材，买起来更轻松。" : "Good food, made easier to shop."}
                text={
                  locale === "zh"
                    ? "浏览产品、保存所需，适合的时候通过 WhatsApp 发出订单。"
                    : "Explore the catalog, save what you need and send your order on WhatsApp when it suits you."
                }
                cta={locale === "zh" ? "浏览产品" : "Browse the catalog"}
                href="/products"
                icon={<ShieldCheck className="h-7 w-7" />}
                tone="light"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <RollingText />

      <section className="bg-[#f7f2e8] py-20 md:py-24">
        <div className="section-shell">
          <Reveal className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="ff-eyebrow">Shop by Category</p>
              <h2 className="ff-title mt-4">Product Center</h2>
            </div>
            <Link href="/products" className="ff-button ff-button-outline">
              View Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Reveal key={category.id} delay={index * 0.04}>
                <Link href={`/products?category=${category.slug}`} className="group block overflow-hidden border border-[#ddd7cc] bg-white">
                  <div className="relative aspect-[1.08] overflow-hidden">
                    <Image src={categoryImage(category)} alt={pick(category.name)} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <h3 className="display-serif absolute bottom-4 left-4 right-4 text-[clamp(1.1rem,1.8vw,1.45rem)] font-medium leading-tight text-white">
                      {pick(category.name)}
                    </h3>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-24">
        <div className="section-shell">
          <Reveal className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="ff-eyebrow">Brand Promotion</p>
              <h2 className="ff-title mt-4">{locale === "zh" ? "精选供应产品" : "Featured Supplies"}</h2>
            </div>
            <Link href="/products" className="font-black text-[#07586b]">
              More Products <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          </Reveal>
          <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
            {featured.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.035} className="h-full">
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="ff-dark-panel relative overflow-hidden py-20 md:py-28">
        <Image src="/sample-assets/seafood2.jpg" alt="Seafood supplier" fill sizes="100vw" className="object-cover opacity-[0.16]" />
        <div className="section-shell relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <Reveal>
            <p className="ff-eyebrow text-[#d8aa45]">Built for Food Businesses</p>
            <h2 className="ff-title mt-5 text-white">
              {locale === "zh" ? "为餐厅、咖啡馆与零售客户打造稳定供应。" : "Reliable local supply for restaurants, cafes and retailers."}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg leading-9 text-white/82">
              {locale === "zh"
                ? "餐饮客户登录后可查看餐厅价格、快速加购、提交订单并追踪订单状态。"
                : "Restaurant buyers can log in for restaurant pricing, quick order tools, order submission and status tracking."}
            </p>
            <div className="mt-8 grid gap-4">
              {[
                locale === "zh" ? "登录后显示餐厅价格" : "Restaurant pricing after login",
                locale === "zh" ? "数量式快速下单" : "Fast quantity-based quick order",
                locale === "zh" ? "订单记录与状态追踪" : "Order history and status tracking",
              ].map((item) => (
                <p key={item} className="flex items-center gap-3 text-white/88">
                  <CheckCircle2 className="h-5 w-5 text-[#d8aa45]" />
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/restaurant-supply" className="ff-button ff-button-light">
                Apply Account
              </Link>
              <Link href="/restaurant/login" className="ff-button border border-white/55 text-white hover:bg-white hover:text-[#07586b]">
                Restaurant Login
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="section-shell grid gap-6 md:grid-cols-3">
          {[
            ["Reliable Supply", "Product variety and responsive local support.", ShieldCheck],
            ["Cold-Chain Focus", "Frozen product catalog for repeat food service use.", Truck],
            ["B2B Catalog", "Professional product center with public and restaurant prices.", Building2],
          ].map(([title, body, Icon]) => (
            <Reveal key={title as string} className="h-full">
              <div className="flex h-full min-h-[218px] flex-col border border-[#ddd7cc] bg-white p-8">
                {typeof Icon !== "string" && <Icon className="h-8 w-8 text-[#07586b]" />}
                <h3 className="display-serif mt-5 text-2xl font-medium">{title as string}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body as string}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

function InfoBlock({
  eyebrow,
  icon,
  title,
  text: body,
  cta,
  href,
  tone,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  cta: string;
  href: string;
  tone: "dark" | "light";
}) {
  return (
    <article
      className={`group flex min-h-[340px] flex-col border p-7 transition duration-300 hover:-translate-y-1 ${
        tone === "dark" ? "border-[#07586b] bg-[#07586b] text-white" : "border-[#d8d1c4] bg-white text-[#182126]"
      }`}
    >
      <div className="flex items-center">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center border ${
            tone === "dark" ? "border-white/20 text-[#d8aa45]" : "border-[#d8aa45]/60 text-[#07586b]"
          }`}
        >
          {icon}
        </span>
        <span className={`ml-5 h-px flex-1 ${tone === "dark" ? "bg-white/20" : "bg-[#d8aa45]/60"}`} />
      </div>
      <p className={`mt-10 text-[10px] font-black uppercase tracking-[0.18em] ${tone === "dark" ? "text-white/60" : "text-slate-500"}`}>{eyebrow}</p>
      <h3 className="display-serif mt-4 text-3xl font-medium leading-tight">{title}</h3>
      <p className={`mt-4 text-sm leading-7 ${tone === "dark" ? "text-white/75" : "text-slate-600"}`}>{body}</p>
      <Link
        href={href}
        className={`mt-auto inline-flex cursor-pointer items-center gap-2 pt-8 text-xs font-black uppercase tracking-[0.1em] transition-[color,gap] group-hover:gap-3 hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
          tone === "dark" ? "text-white hover:text-[#d8aa45] focus-visible:outline-white" : "text-[#07586b] hover:text-[#c22931] focus-visible:outline-[#07586b]"
        }`}
      >
        {cta}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
