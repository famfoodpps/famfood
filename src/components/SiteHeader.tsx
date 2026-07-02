"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { businessSettings } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { LanguageToggle } from "@/components/LanguageToggle";

const navItems = [
  { href: "/", label: "Home", zh: "首页" },
  { href: "/products", label: "Products", zh: "产品中心" },
  { href: "/restaurant-supply", label: "Restaurant Supply", zh: "餐厅供应" },
  { href: "/about", label: "About", zh: "关于我们" },
  { href: "/contact", label: "Contact", zh: "联系" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart("public");
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(pathname !== "/");

  useEffect(() => {
    const onScroll = () => setSolid(pathname !== "/" || window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const dark = !solid && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? "border-b border-black/10 bg-white/95 shadow-sm backdrop-blur-xl" : "bg-transparent text-white"
      }`}
    >
      <div className="section-shell flex h-[78px] items-center justify-between gap-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/famfood-assets/famfoodlogo.jpg"
            alt="FAMFOOD logo"
            width={58}
            height={58}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white/70"
            priority
          />
          <div className="min-w-0">
            <p className={`text-xl font-black leading-none ${dark ? "text-white" : "text-[#07586b]"}`}>FAMFOOD</p>
            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${dark ? "text-white/78" : "text-slate-500"}`}>
              Products Enterprise
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-black uppercase tracking-[0.06em] lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition ${pathname === item.href ? "text-[#d8aa45]" : dark ? "text-white hover:text-[#d8aa45]" : "text-[#182126] hover:text-[#07586b]"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={`hidden items-center gap-2 lg:flex ${dark ? "text-white" : "text-[#182126]"}`}>
          <LanguageToggle compact />
          <Link
            href="/cart"
            className={`relative inline-flex h-10 items-center justify-center border px-4 text-sm font-black ${
              dark ? "border-white/40 hover:bg-white/10" : "border-slate-200 hover:border-[#07586b]"
            }`}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart
            {count > 0 && <span className="ml-2 rounded-full bg-[#c22931] px-2 py-0.5 text-xs text-white">{count}</span>}
          </Link>
          <a
            href={`https://wa.me/${businessSettings.whatsappInternational}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center bg-[#07586b] px-5 text-sm font-black text-white hover:bg-[#043f4f]"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-11 w-11 items-center justify-center border lg:hidden ${
            dark ? "border-white/40 text-white" : "border-slate-200 text-slate-800"
          }`}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white text-[#182126] lg:hidden">
          <div className="section-shell grid gap-2 py-4">
            <div className="pb-2">
              <LanguageToggle compact />
            </div>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="px-3 py-3 text-sm font-bold hover:bg-slate-50">
                {item.label} / {item.zh}
              </Link>
            ))}
            <Link href="/cart" onClick={() => setOpen(false)} className="px-3 py-3 text-sm font-bold hover:bg-slate-50">
              Cart ({count})
            </Link>
            <Link href="/restaurant/login" onClick={() => setOpen(false)} className="bg-[#07586b] px-3 py-3 text-sm font-bold text-white">
              Restaurant Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
