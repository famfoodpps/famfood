"use client";

import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { businessSettings } from "@/data/catalog";
import { useLanguage } from "@/hooks/useLanguage";

export default function AboutPage() {
  const { locale } = useLanguage();

  return (
    <>
      <PageHero title="About FAMFOOD" eyebrow={locale === "zh" ? "关于我们" : "Kuching Food Supplier"} image="/famfood-assets/485448655_18054120662513729_6138464181924839718_n.webp" />
      <section className="bg-white py-16 md:py-24">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <div className="relative aspect-square overflow-hidden border border-[#ddd7cc] bg-[#f7f2e8]">
              <Image src="/famfood-assets/famfoodlogo.jpg" alt="FAMFOOD logo" fill sizes="50vw" className="object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="ff-eyebrow">{businessSettings.businessName}</p>
            <h1 className="ff-title mt-4">{locale === "zh" ? "海鲜、果汁与食品供应伙伴。" : "Seafood, juice and food supply partner."}</h1>
            <p className="mt-6 text-lg leading-9 text-slate-600">
              {locale === "zh"
                ? "FAMFOOD 扎根古晋，专注供应海鲜、果汁、冷冻食品、即食食材与烹饪干货，为餐厅、零售商与家庭客户提供方便可靠的采购体验。"
                : "FAMFOOD is based in Kuching and focuses on seafood, juice, frozen food, ready food and cooking essentials, serving restaurants, retailers and homes with a convenient and reliable catalog experience."}
            </p>
            <p className="mt-4 font-black text-[#07586b]">{businessSettings.businessNature}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Seafoods", "Juice Retail", "Kuching Supply"].map((item) => (
                <div key={item} className="border border-[#ddd7cc] p-5">
                  <p className="text-3xl font-black text-[#07586b]">{item.split(" ")[0]}</p>
                  <p className="mt-2 text-sm text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
