import type { CartLine, Order, OrderItem } from "@/types/catalog";

export type { CartLine, Order, OrderItem };

export type CheckoutDetailsLike = {
  name: string;
  phone: string;
  email?: string;
  fulfillment: "Delivery" | "Pickup";
  address?: string;
  preferredDate?: string;
  notes?: string;
};
