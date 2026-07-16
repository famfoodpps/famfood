import { businessSettings, formatCurrency, text } from "@/data/catalog";
import type { CartLine, Locale, Product, ProductVariant } from "@/types/catalog";

export type CheckoutDetails = {
  name: string;
  phone: string;
  email?: string;
  fulfillment: "Delivery" | "Pickup";
  address?: string;
  preferredDate?: string;
  notes?: string;
};

export function productWhatsAppUrl(product: Product, locale: Locale, variant?: ProductVariant) {
  const specification = variant?.specification ? ` - ${variant.specification}` : "";
  const sku = product.sku ? ` (${product.sku})` : "";
  const message = `Hi FAMFOOD, I would like to ask the price for ${text(product.name, locale)}${specification}${sku}.`;
  return `https://wa.me/${businessSettings.whatsappInternational}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppOrderMessage(lines: CartLine[], details: CheckoutDetails, locale: Locale) {
  const itemLines = lines.map((line, index) => {
    const specification = line.variant?.specification ? ` (${line.variant.specification})` : "";
    return `${index + 1}. ${text(line.product.name, locale)}${specification} x ${line.quantity} - ${formatCurrency(line.lineTotal)}`;
  });

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return [
    "Hi FAMFOOD, I would like to submit an order.",
    "",
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    details.email ? `Email: ${details.email}` : "",
    `Fulfillment: ${details.fulfillment}`,
    details.address ? `Address: ${details.address}` : "",
    details.preferredDate ? `Preferred date: ${details.preferredDate}` : "",
    "",
    "Items:",
    ...itemLines,
    "",
    `Total: ${formatCurrency(total)}`,
    details.notes ? `Notes: ${details.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWhatsAppOrderUrl(lines: CartLine[], details: CheckoutDetails, locale: Locale) {
  const message = buildWhatsAppOrderMessage(lines, details, locale);
  return `https://wa.me/${businessSettings.whatsappInternational}?text=${encodeURIComponent(message)}`;
}
