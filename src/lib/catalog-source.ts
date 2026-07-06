import type { Category, Product } from "@/types/catalog";

export function hasPdfCatalogProducts(catalog: Pick<Product, "slug" | "sku">[]) {
  const slugs = new Set(catalog.map((product) => product.slug));
  const skus = new Set(catalog.map((product) => product.sku));
  return slugs.has("sp1-smoked-salmon") && skus.has("I36") && catalog.length >= 120;
}

export function hasPdfCatalogCategories(catalog: Pick<Category, "slug">[]) {
  const slugs = new Set(catalog.map((category) => category.slug));
  return slugs.has("special-promotion-sales") && slugs.has("whole-fish") && slugs.has("fresh-juice") && catalog.length >= 20;
}
