"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
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
  const mobileItemStyle = (index: number) => ({ "--mobile-menu-delay": `${index * 65}ms` } as CSSProperties);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid || open ? "border-b border-black/10 bg-white/95 shadow-sm backdrop-blur-xl" : "bg-transparent text-white"
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
              Enterprise
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
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`mobile-menu-button inline-flex h-11 w-11 items-center justify-center border lg:hidden ${open ? "is-open" : ""} ${
            dark ? "border-white/40 text-white" : "border-slate-200 text-slate-800"
          }`}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <div id="mobile-navigation" className={`mobile-menu-panel lg:hidden ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <div className="section-shell mobile-menu-inner">
          <div className="mobile-menu-kicker" style={mobileItemStyle(0)}>
            <span>FAMFOOD</span>
            <LanguageToggle compact />
          </div>
          <nav className="mobile-menu-list" aria-label="Mobile navigation">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mobile-menu-link ${pathname === item.href ? "is-active" : ""}`}
                style={mobileItemStyle(index + 1)}
              >
                <span>{item.label}</span>
                <small>{item.zh}</small>
              </Link>
            ))}
            <Link href="/cart" onClick={() => setOpen(false)} className="mobile-menu-link" style={mobileItemStyle(navItems.length + 1)}>
              <span>Cart</span>
              <small>{count} item{count === 1 ? "" : "s"}</small>
            </Link>
          </nav>
          <div className="mobile-menu-actions" style={mobileItemStyle(navItems.length + 2)}>
            <Link href="/restaurant/login" onClick={() => setOpen(false)} className="mobile-menu-primary">
              Restaurant Login
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
