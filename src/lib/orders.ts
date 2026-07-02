import type { CartLine, CheckoutDetailsLike, Order, OrderItem } from "@/types/order-internal";

export function buildOrderItems(lines: CartLine[]): OrderItem[] {
  return lines.map((line) => ({
    productId: line.productId,
    productName: line.product.name.en,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));
}

export function buildDemoOrder(lines: CartLine[], details: CheckoutDetailsLike, channel: Order["channel"]): Order {
  return {
    id: `local-${Date.now()}`,
    orderNumber: `FO-${Date.now().toString().slice(-6)}`,
    channel,
    customerName: details.name,
    customerPhone: details.phone,
    customerEmail: details.email,
    fulfillment: details.fulfillment,
    address: details.address,
    preferredDate: details.preferredDate,
    notes: details.notes,
    status: "Pending",
    total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    items: buildOrderItems(lines),
    createdAt: new Date().toISOString(),
  };
}
