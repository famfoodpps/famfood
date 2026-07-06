"use client";

import { Clock, ExternalLink, Mail, MapPin, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { businessSettings } from "@/data/catalog";
import { useLanguage } from "@/hooks/useLanguage";

export default function ContactPage() {
  const { locale } = useLanguage();

  return (
    <>
      <PageHero title="Contact" eyebrow={locale === "zh" ? "联系 FAMFOOD" : "Talk to FAMFOOD"} image="/sample-assets/seafood2.jpg" />
      <section className="bg-white py-16 md:py-20">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="ff-card p-8">
            <p className="ff-eyebrow">Contact Information</p>
            <h1 className="display-serif mt-4 text-4xl font-medium">{locale === "zh" ? "欢迎联系" : "Send us a message"}</h1>
            <p className="mt-4 leading-7 text-slate-600">{businessSettings.businessNature}</p>
            <div className="mt-8 space-y-5">
              <p className="flex gap-4 text-slate-700">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#07586b]" />
                {businessSettings.address}
              </p>
              <a className="flex gap-4 text-slate-700 hover:text-[#07586b]" href={`mailto:${businessSettings.email}`}>
                <Mail className="mt-1 h-5 w-5 shrink-0 text-[#07586b]" />
                {businessSettings.email}
              </a>
              <a className="flex gap-4 text-slate-700 hover:text-[#07586b]" href={`https://wa.me/${businessSettings.whatsappInternational}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-[#07586b]" />
                WhatsApp {businessSettings.whatsapp}
              </a>
              <p className="flex gap-4 text-slate-700">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-[#07586b]" />
                <span>
                  {businessSettings.openingHoursWeekday}
                  <br />
                  {businessSettings.openingHoursSunday}
                </span>
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-sm font-black text-[#07586b]">
                <a className="inline-flex items-center gap-2 hover:text-[#c22931]" href={businessSettings.facebookUrl} target="_blank" rel="noreferrer">
                  Facebook
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a className="inline-flex items-center gap-2 hover:text-[#c22931]" href={businessSettings.instagramUrl} target="_blank" rel="noreferrer">
                  Instagram
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="overflow-hidden border border-[#ddd7cc] bg-white shadow-sm">
            <iframe title="FAMFOOD map" src={`https://www.google.com/maps?q=${encodeURIComponent(businessSettings.mapQuery)}&output=embed`} className="h-[460px] w-full" loading="lazy" />
          </div>
        </div>
      </section>
    </>
  );
}
