"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { HeroSlider } from "@/components/HeroSlider";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { RollingText } from "@/components/RollingText";
import { useLanguage } from "@/hooks/useLanguage";
import type { Category, Product } from "@/types/catalog";

export default function Home() {
  const { locale, pick } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/categories"), fetch("/api/products?page=1&pageSize=8")])
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

      <section className="bg-white py-20 md:py-28">
        <div className="section-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Reveal>
            <p className="ff-eyebrow">About FAMFOOD</p>
            <h2 className="ff-title mt-5 text-[#182126]">
              {locale === "zh" ? "扎根古晋的高级冷冻食品供应伙伴。" : "A Kuching supplier with a premium catalog mindset."}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg leading-9 text-slate-600">
              {locale === "zh"
                ? "FAMFOOD Enterprise 为餐厅、零售商、咖啡馆与家庭客户供应海鲜、果汁、冷冻食品、烹饪干货与即食食材，重点是稳定、方便与专业服务。"
                : "FAMFOOD Enterprise supplies seafood, juice, frozen food, cooking essentials and ready food to restaurants, retailers, cafes and home customers with a focus on stable access, convenience and professional service."}
            </p>
            <div className="mt-9 grid gap-6 sm:grid-cols-2">
              <InfoBlock title={locale === "zh" ? "餐饮供应" : "Restaurant Supply"} text={locale === "zh" ? "餐厅价格、快速下单与订单记录。" : "Restaurant pricing, quick ordering and order history for repeat buyers."} icon={<Building2 className="h-7 w-7" />} />
              <InfoBlock title={locale === "zh" ? "家庭与零售" : "Retail Orders"} text={locale === "zh" ? "公众客户可浏览产品、保存订单并发送 WhatsApp。" : "Public customers can browse products, save an order and send WhatsApp checkout."} icon={<ShieldCheck className="h-7 w-7" />} />
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
                    <Image src={category.image} alt={pick(category.name)} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <h3 className="display-serif absolute bottom-4 left-4 right-4 text-[clamp(1.1rem,1.8vw,1.45rem)] font-medium leading-tight text-white">
                      {pick(category.name)}
                    </h3>
                  </div>
                  <p className="min-h-12 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#07586b]">{pick(category.group)}</p>
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
              <Reveal key={product.id} delay={index * 0.035}>
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

function InfoBlock({ icon, title, text: body }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border-l-2 border-[#c22931] pl-6">
      <div className="text-[#07586b]">{icon}</div>
      <h3 className="display-serif mt-4 text-2xl font-medium text-[#182126]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}
