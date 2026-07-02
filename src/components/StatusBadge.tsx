import type { OrderStatus, StockStatus } from "@/types/catalog";

const statusClass: Record<OrderStatus | StockStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Confirmed: "bg-sky-50 text-sky-700",
  Preparing: "bg-indigo-50 text-indigo-700",
  Ready: "bg-emerald-50 text-emerald-700",
  "Out for Delivery": "bg-cyan-50 text-cyan-700",
  Delivered: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
  "In Stock": "bg-emerald-50 text-emerald-700",
  Limited: "bg-amber-50 text-amber-700",
  "Pre-order": "bg-sky-50 text-sky-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

export function StatusBadge({ value }: { value: OrderStatus | StockStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass[value]}`}>{value}</span>;
}
