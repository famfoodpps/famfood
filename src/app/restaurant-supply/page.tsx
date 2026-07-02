"use client";

import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { businessSettings } from "@/data/catalog";
import { useLanguage } from "@/hooks/useLanguage";

export default function RestaurantSupplyPage() {
  const { locale } = useLanguage();

  return (
    <>
      <PageHero title="Restaurant Supply" eyebrow={locale === "zh" ? "餐饮客户专区" : "B2B Food Service"} image="/sample-assets/seafood-table.jpg" />
      <section className="bg-white py-16 md:py-24">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="ff-eyebrow">Restaurant supply</p>
            <h1 className="ff-title mt-3">{locale === "zh" ? "为餐厅与咖啡馆打造的采购系统。" : "Built for restaurants, cafes and retailers."}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {locale === "zh"
                ? "申请餐饮账号后，可查看餐厅价格、使用快速下单、提交订单并查看订单状态。"
                : "Apply for a restaurant account to access restaurant pricing, quick order tools, order submission and order status tracking."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={`https://wa.me/${businessSettings.whatsappInternational}?text=${encodeURIComponent("Hi FAMFOOD, I would like to apply for a restaurant account.")}`} target="_blank" rel="noreferrer" className="ff-button ff-button-primary">
                Apply Account
              </a>
              <Link href="/restaurant/login" className="ff-button ff-button-outline">
                Login as Restaurant
              </Link>
            </div>
          </div>
          <div className="ff-card p-8">
            <Building2 className="h-12 w-12 text-[#07586b]" />
            <h2 className="display-serif mt-5 text-3xl font-medium">Portal includes</h2>
            <div className="mt-6 grid gap-4">
              {["Restaurant pricing after login", "Fast quantity-based quick order", "Cart and submit order flow", "Order history and status tracking", "Account details for restaurant buyers"].map((item) => (
                <p key={item} className="flex gap-3 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#07586b]" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
