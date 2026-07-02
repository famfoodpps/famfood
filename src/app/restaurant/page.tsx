"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History, LayoutDashboard, LogOut, Plus, ShoppingCart, UserRound } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { StatusBadge } from "@/components/StatusBadge";
import { demoOrders, formatCurrency, products as seedProducts, restaurantCustomers } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/hooks/useLanguage";
import type { Order, Product, RestaurantCustomer } from "@/types/catalog";

type PortalTab = "dashboard" | "products" | "quick" | "cart" | "history" | "account";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Product List", icon: ShoppingCart },
  { id: "quick", label: "Quick Order", icon: Plus },
  { id: "cart", label: "Cart", icon: ShoppingCart },
  { id: "history", label: "Order History", icon: History },
  { id: "account", label: "Account Details", icon: UserRound },
] satisfies { id: PortalTab; label: string; icon: typeof LayoutDashboard }[];

export default function RestaurantPortalPage() {
  const router = useRouter();
  const cart = useCart("restaurant");
  const { pick } = useLanguage();
  const [tab, setTab] = useState<PortalTab>("dashboard");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [productList, setProductList] = useState<Product[]>(seedProducts);
  const [customer, setCustomer] = useState<RestaurantCustomer>(restaurantCustomers[0]);

  useEffect(() => {
    queueMicrotask(() => {
      const session = window.localStorage.getItem("famfood-session");
      if (!session?.includes("restaurant")) router.push("/restaurant/login");
      const parsed = JSON.parse(session || "{}") as { token?: string };
      fetch("/api/restaurant/portal", {
        headers: parsed.token ? { authorization: `Bearer ${parsed.token}` } : {},
      })
        .then((response) => response.json())
        .then((payload) => {
          if (payload.customer) setCustomer(payload.customer);
          if (Array.isArray(payload.products)) setProductList(payload.products);
          if (Array.isArray(payload.orders)) setOrders(payload.orders);
        })
        .catch(() => setOrders(demoOrders.filter((order) => order.channel === "Restaurant")));
    });
  }, [router]);

  const recentOrders = orders.filter((order) => order.channel === "Restaurant").slice(0, 5);

  async function submitRestaurantOrder() {
    if (cart.lines.length === 0) return;
    const nextOrder: Order = {
      id: `local-${Date.now()}`,
      orderNumber: `FO-${Date.now().toString().slice(-6)}`,
      customerName: customer.restaurantName,
      customerPhone: customer.phone,
      restaurantCustomerId: customer.id,
      channel: "Restaurant",
      fulfillment: "Delivery",
      address: customer.address,
      status: "Pending",
      total: cart.total,
      createdAt: new Date().toISOString(),
      items: cart.lines.map((line) => ({
        productId: line.productId,
        productName: line.product.name.en,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    };
    const session = JSON.parse(window.localStorage.getItem("famfood-session") || "{}") as { token?: string };
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session.token ? { authorization: `Bearer ${session.token}` } : {}),
      },
      body: JSON.stringify({
        channel: "Restaurant",
        restaurantCustomerId: customer.id,
        details: { name: customer.restaurantName, phone: customer.phone, fulfillment: "Delivery", address: customer.address },
        items: cart.items,
      }),
    }).catch(() => null);
    if (response?.ok) {
      const payload = await response.json();
      setOrders((current) => [payload.order || nextOrder, ...current]);
    } else {
      setOrders((current) => [nextOrder, ...current]);
    }
    cart.clear();
    setTab("history");
  }

  function addQuickOrder(productId: string) {
    const quantity = Math.max(1, quantities[productId] ?? 1);
    cart.add(productId, quantity);
    setQuantities((current) => ({ ...current, [productId]: 1 }));
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] pt-[104px]">
      <div className="section-shell py-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="ff-eyebrow">Restaurant portal</p>
            <h1 className="display-serif mt-2 break-words text-4xl font-medium text-slate-950 md:text-5xl">{customer.restaurantName}</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem("famfood-session");
              router.push("/restaurant/login");
            }}
            className="ff-button ff-button-outline bg-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[250px_1fr]">
          <nav className="ff-card p-3">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`mb-1 flex w-full items-center px-4 py-3 text-left text-sm font-black ${tab === id ? "bg-[#07586b] text-white" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {id === "cart" ? `${label} (${cart.count})` : label}
              </button>
            ))}
          </nav>

          <section>
            {tab === "dashboard" && (
              <div className="grid gap-6 md:grid-cols-3">
                <Metric label="Open Orders" value={recentOrders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length.toString()} />
                <Metric label="Cart Items" value={cart.count.toString()} />
                <Metric label="Price Tier" value={customer.priceTier} />
                <div className="ff-card p-6 md:col-span-3">
                  <h2 className="display-serif text-3xl font-medium">Recent orders</h2>
                  <OrderTable orders={recentOrders} />
                </div>
              </div>
            )}

            {tab === "products" && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {productList.filter((product) => product.active).map((product) => (
                  <ProductCard key={product.id} product={product} mode="restaurant" />
                ))}
              </div>
            )}

            {tab === "quick" && (
              <div className="ff-card p-6">
                <h2 className="display-serif text-3xl font-medium">Quick Order</h2>
                <div className="mt-6 divide-y divide-[#eee7da]">
                  {productList.filter((product) => product.active).map((product) => (
                    <div key={product.id} className="grid gap-4 py-4 md:grid-cols-[80px_1fr_120px_120px] md:items-center">
                      <div className="relative h-16 overflow-hidden bg-[#f7f2e8]">
                        <Image src={product.image} alt={pick(product.name)} fill sizes="80px" className="object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-950">{pick(product.name)}</p>
                        <p className="text-sm text-slate-500">
                          {formatCurrency(product.restaurantPrice)} · {pick(product.moq)}
                        </p>
                      </div>
                      <input type="number" min={1} value={quantities[product.id] ?? 1} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: Number(event.target.value) }))} className="admin-input" />
                      <button type="button" onClick={() => addQuickOrder(product.id)} className="ff-button ff-button-primary h-11 min-w-0">
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "cart" && (
              <div className="ff-card p-6">
                <h2 className="display-serif text-3xl font-medium">Submit Order</h2>
                <div className="mt-5 space-y-3">
                  {cart.lines.map((line) => (
                    <div key={line.productId} className="flex items-center justify-between border border-[#ddd7cc] p-4">
                      <div>
                        <p className="font-bold">{pick(line.product.name)}</p>
                        <p className="text-sm text-slate-500">Qty {line.quantity}</p>
                      </div>
                      <p className="font-black text-[#07586b]">{formatCurrency(line.lineTotal)}</p>
                    </div>
                  ))}
                  {cart.lines.length === 0 && <p className="border border-dashed border-slate-300 p-8 text-center text-slate-500">No restaurant cart items yet.</p>}
                </div>
                <div className="mt-6 flex flex-col justify-between gap-4 border-t border-[#eee7da] pt-5 sm:flex-row sm:items-center">
                  <p className="text-xl font-black">Total {formatCurrency(cart.total)}</p>
                  <button type="button" onClick={submitRestaurantOrder} disabled={cart.lines.length === 0} className="ff-button ff-button-primary disabled:bg-slate-300">
                    Submit Order
                  </button>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="ff-card p-6">
                <h2 className="display-serif text-3xl font-medium">Order History</h2>
                <OrderTable orders={recentOrders} />
              </div>
            )}

            {tab === "account" && (
              <div className="ff-card p-6">
                <h2 className="display-serif text-3xl font-medium">Account Details</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {Object.entries(customer).map(([key, value]) => (
                    <div key={key} className="border border-[#ddd7cc] p-4">
                      <p className="text-xs font-black uppercase text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-1 font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ff-card p-6">
      <p className="text-sm font-black uppercase text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#07586b]">{value}</p>
    </div>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  const rows = useMemo(() => orders, [orders]);
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="py-3">Order</th>
            <th className="py-3">Date</th>
            <th className="py-3">Items</th>
            <th className="py-3">Total</th>
            <th className="py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee7da]">
          {rows.map((order) => (
            <tr key={order.id}>
              <td className="py-4 font-bold">{order.orderNumber}</td>
              <td className="py-4">{order.createdAt.slice(0, 10)}</td>
              <td className="py-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
              <td className="py-4 font-bold text-[#07586b]">{formatCurrency(order.total)}</td>
              <td className="py-4">
                <StatusBadge value={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-8 text-center text-slate-500">No orders yet.</p>}
    </div>
  );
}
