import type { BusinessSettings, Locale, OrderStatus, Product, ProductVariant } from "@/types/catalog";

export const orderStatuses: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

// Site identity is intentionally a tiny build-safe fallback. Products, categories,
// prices and images are never sourced from this module.
export const businessSettings: BusinessSettings = {
  brandName: "FAMFOOD",
  businessName: "FAMFOOD Product Enterprise",
  businessNature: "Seafoods and Juice Retails & Supplies",
  address: "15, Jalan Ensing Timur, Kuching, Malaysia, 93250 Kuching, Sarawak, Malaysia",
  email: "famfpe@gmail.com",
  whatsapp: "011-1246 0284",
  whatsappInternational: "601112460284",
  mapQuery: "15, Jalan Ensing Timur, Kuching, Malaysia, 93250 Kuching, Sarawak, Malaysia",
  openingHoursWeekday: "Monday - Saturday: 9:00 AM - 6:00 PM",
  openingHoursSunday: "Sunday: 9:00 AM - 2:00 PM",
  facebookUrl: "https://www.facebook.com/famfpe",
  instagramUrl: "https://www.instagram.com/fppe9878/",
};

export const heroSlides = [
  {
    image: "/sample-assets/seafood1.jpg",
    eyebrow: { en: "Selection - Cold Chain - Supply", zh: "选品 - 冷链 - 供应" },
    title: { en: "FAMFOOD", zh: "FAMFOOD" },
    subtitle: {
      en: "Premium frozen seafood and food supply for every family and restaurant.",
      zh: "为家庭与餐饮业供应优质冷冻海鲜与食品。",
    },
  },
  {
    image: "/sample-assets/seafood2.jpg",
    eyebrow: { en: "Restaurant Supply Partner", zh: "餐饮供应伙伴" },
    title: { en: "From Ocean Selection To Kitchen Service", zh: "从海味选品到厨房供应" },
    subtitle: {
      en: "Stable product access, restaurant pricing and fast repeat ordering.",
      zh: "稳定货源、餐厅价格与高效复购流程。",
    },
  },
  {
    image: "/sample-assets/seafood-table.jpg",
    eyebrow: { en: "Product Center", zh: "产品中心" },
    title: { en: "Seafood, Japanese Goods, Frozen Staples", zh: "海鲜 日式 冷冻食品" },
    subtitle: {
      en: "A practical catalog for retailers, restaurants, cafes and homes.",
      zh: "面向零售、餐厅、咖啡馆与家庭的实用产品目录。",
    },
  },
];

export function text(value: { en: string; zh: string }, locale: Locale) {
  return value[locale] || value.en;
}

export function isPlaceholderDescription(value: string) {
  const trimmed = value.trim();
  return !trimmed || /from the FAMFOOD catalog\.?$/i.test(trimmed) || /来自\s*FAMFOOD\s*产品目录。?$/.test(trimmed);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function variantPrice(variant: ProductVariant | undefined, mode: "public" | "restaurant") {
  if (!variant) return null;
  if (mode === "restaurant") return variant.restaurantPrice;
  return variant.promotionPrice ?? variant.retailPrice;
}

export function productPrice(product: Product, mode: "public" | "restaurant", variant?: ProductVariant) {
  return variant ? variantPrice(variant, mode) : mode === "restaurant" ? product.restaurantPrice : product.publicPrice;
}

export function getDefaultVariant(product: Product, mode: "public" | "restaurant") {
  const active = product.variants.filter((variant) => variant.active);
  return active.find((variant) => variantPrice(variant, mode) !== null) || active[0];
}

export function getProductCategorySlug(product: Product) {
  return product.categorySlug || product.categoryId;
}
