import Link from "next/link";
import { Clock, ExternalLink, Mail, MapPin, MessageCircle } from "lucide-react";
import { businessSettings } from "@/data/catalog";

export function Footer() {
  return (
    <footer className="bg-[#101a1f] text-white">
      <div className="section-shell grid gap-10 py-14 md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="ff-eyebrow text-[#d8aa45]">{businessSettings.businessName}</p>
          <h2 className="display-serif mt-4 max-w-lg text-3xl font-medium leading-tight">
            Seafood, juice and food supplies for Kuching families, retailers and restaurants.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/68">{businessSettings.businessNature}</p>
          <div className="mt-7 flex gap-3">
            <Link href="/products" className="ff-button ff-button-light">
              Product Center
            </Link>
            <Link href="/restaurant/login" className="ff-button border border-white/30 text-white hover:bg-white hover:text-[#07586b]">
              Restaurant Login
            </Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/54">Contact</h3>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white/78">
            <p className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#d8aa45]" />
              {businessSettings.address}
            </p>
            <a className="flex gap-3 hover:text-[#d8aa45]" href={`mailto:${businessSettings.email}`}>
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#d8aa45]" />
              {businessSettings.email}
            </a>
            <a className="flex gap-3 hover:text-[#d8aa45]" href={`https://wa.me/${businessSettings.whatsappInternational}`} target="_blank" rel="noreferrer">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#d8aa45]" />
              WhatsApp {businessSettings.whatsapp}
            </a>
            <p className="flex gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#d8aa45]" />
              <span>
                {businessSettings.openingHoursWeekday}
                <br />
                {businessSettings.openingHoursSunday}
              </span>
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              <a className="inline-flex items-center gap-2 hover:text-[#d8aa45]" href={businessSettings.facebookUrl} target="_blank" rel="noreferrer">
                Facebook
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a className="inline-flex items-center gap-2 hover:text-[#d8aa45]" href={businessSettings.instagramUrl} target="_blank" rel="noreferrer">
                Instagram
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">© 2026 FAMFOOD Enterprise. All rights reserved.</div>
    </footer>
  );
}
