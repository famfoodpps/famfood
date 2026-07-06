"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, History, KeyRound, LayoutDashboard, LogOut, Plus, Search, ShoppingCart, Trash2, UserRound } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { StatusBadge } from "@/components/StatusBadge";
import { demoOrders, formatCurrency, getProductCategorySlug, products as seedProducts, restaurantCustomers } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/hooks/useLanguage";
import { createBrowserSupabase } from "@/lib/supabase";
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
  const [quickSearch, setQuickSearch] = useState("");
  const [quickCategory, setQuickCategory] = useState("all");
  const [quickStock, setQuickStock] = useState("available");
  const [quickAddedId, setQuickAddedId] = useState("");
  const [quickNotice, setQuickNotice] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [productList, setProductList] = useState<Product[]>(seedProducts);
  const [customer, setCustomer] = useState<RestaurantCustomer>(restaurantCustomers[0]);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

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
  const activeProducts = useMemo(() => productList.filter((product) => product.active), [productList]);
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    activeProducts.forEach((product) => {
      const slug = getProductCategorySlug(product);
      map.set(slug, product.categoryName?.en || slug.replace(/-/g, " "));
    });
    return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
  }, [activeProducts]);
  const quickProducts = useMemo(() => {
    const search = quickSearch.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const categorySlug = getProductCategorySlug(product);
      const effectivePrice = product.restaurantPrice || product.publicPrice;
      const matchesSearch = !search || `${product.sku} ${product.name.en} ${product.name.zh}`.toLowerCase().includes(search);
      const matchesCategory = quickCategory === "all" || categorySlug === quickCategory || product.categorySlug === quickCategory || product.categoryId === quickCategory;
      const matchesStock = quickStock === "all" || (quickStock === "available" ? product.stockStatus !== "Out of Stock" && effectivePrice > 0 : product.stockStatus === quickStock);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [activeProducts, quickCategory, quickSearch, quickStock]);

  useEffect(() => {
    if (!quickAddedId) return;
    const timeout = window.setTimeout(() => setQuickAddedId(""), 1200);
    return () => window.clearTimeout(timeout);
  }, [quickAddedId]);

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
    const product = productList.find((item) => item.id === productId);
    cart.add(productId, quantity);
    setQuantities((current) => ({ ...current, [productId]: 1 }));
    setQuickAddedId(productId);
    setQuickNotice(product ? `Added ${quantity} x ${pick(product.name)} to cart.` : "Added to cart.");
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice("");
    setPasswordError("");
    if (passwordForm.password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }

    const supabase = createBrowserSupabase();
    if (!supabase) {
      setPasswordError("Password changes are available after Supabase login is configured.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: "", confirm: "" });
      setPasswordNotice("Password updated.");
    } catch (caught) {
      setPasswordError(caught instanceof Error ? caught.message : "Unable to update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] pt-[104px]">
      <div className="section-shell py-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="ff-eyebrow">Restaurant portal</p>
            <h1 className="display-serif mt-2 break-words text-4xl font-medium text-slate-950 md:text-5xl">{customer.restaurantName}</h1>
          </div>
          <div className="portal-page-actions">
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem("famfood-session");
                router.push("/restaurant/login");
              }}
              className="portal-logout-button ff-button ff-button-outline h-11 bg-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="portal-layout mt-8 grid gap-6 lg:grid-cols-[250px_1fr] lg:gap-8">
          <nav className="portal-tabs ff-card">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`portal-tab text-sm font-black ${tab === id ? "bg-[#07586b] text-white" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {id === "cart" ? `${label} (${cart.count})` : label}
              </button>
            ))}
          </nav>

          <section className="min-w-0">
            {tab === "dashboard" && (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <Metric label="Open Orders" value={recentOrders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length.toString()} />
                <Metric label="Cart Items" value={cart.count.toString()} />
                <Metric label="Price Tier" value={customer.priceTier} />
                <div className="portal-panel ff-card md:col-span-3">
                  <h2 className="display-serif text-2xl font-medium sm:text-3xl">Recent orders</h2>
                  <OrderTable orders={recentOrders} />
                </div>
              </div>
            )}

            {tab === "products" && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {activeProducts.map((product) => (
                  <ProductCard key={product.id} product={product} mode="restaurant" />
                ))}
              </div>
            )}

            {tab === "quick" && (
              <div className="portal-panel ff-card">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <h2 className="display-serif text-2xl font-medium sm:text-3xl">Quick Order</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Showing {quickProducts.length} of {activeProducts.length} products.</p>
                  </div>
                  {quickNotice && <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">{quickNotice}</p>}
                </div>
                <div className="mt-5 grid gap-3 bg-[#f7f2e8] p-3 lg:grid-cols-[minmax(220px,1fr)_180px_150px]">
                  <label className="flex h-11 min-w-0 items-center border border-[#ddd7cc] bg-white px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                    <input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Search products" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
                  </label>
                  <select value={quickCategory} onChange={(event) => setQuickCategory(event.target.value)} className="admin-input h-11">
                    <option value="all">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category.slug} value={category.slug}>{category.label}</option>
                    ))}
                  </select>
                  <select value={quickStock} onChange={(event) => setQuickStock(event.target.value)} className="admin-input h-11">
                    <option value="available">Available</option>
                    <option value="all">All status</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Limited">Limited</option>
                    <option value="Pre-order">Pre-order</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
                <div className="mt-6 space-y-3">
                  {quickProducts.map((product) => {
                    const effectivePrice = product.restaurantPrice || product.publicPrice;
                    const canAdd = product.stockStatus !== "Out of Stock" && effectivePrice > 0;
                    const added = quickAddedId === product.id;
                    return (
                    <div key={product.id} className="grid gap-3 border border-[#ddd7cc] bg-white p-3 lg:grid-cols-[72px_minmax(0,1fr)_120px_112px_112px] lg:items-center">
                      <div className="relative h-[72px] overflow-hidden bg-[#f7f2e8]">
                        <Image src={product.image} alt={pick(product.name)} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-bold text-slate-950">{pick(product.name)}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {product.sku} · {pick(product.moq)}
                        </p>
                        {product.restaurantPrice <= 0 && product.publicPrice > 0 && <p className="mt-1 text-xs font-black uppercase text-[#c22931]">Using retail price until restaurant price is set</p>}
                      </div>
                      <div className="text-sm font-black text-[#07586b]">
                        {effectivePrice > 0 ? formatCurrency(effectivePrice) : "Ask price"}
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={quantities[product.id] ?? 1}
                        onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: Number(event.target.value) }))}
                        className="admin-input h-11"
                      />
                      <button type="button" onClick={() => addQuickOrder(product.id)} disabled={!canAdd} className={`ff-button h-11 min-w-0 px-3 disabled:bg-slate-300 ${added ? "bg-emerald-600 text-white hover:bg-emerald-700" : "ff-button-primary"}`}>
                        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {added ? "Added" : "Add"}
                      </button>
                    </div>
                    );
                  })}
                  {quickProducts.length === 0 && <p className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">No products match the current filters.</p>}
                </div>
              </div>
            )}

            {tab === "cart" && (
              <div className="portal-panel ff-card">
                <h2 className="display-serif text-2xl font-medium sm:text-3xl">Submit Order</h2>
                <div className="mt-5 space-y-3">
                  {cart.lines.map((line) => (
                    <div key={line.productId} className="grid gap-3 border border-[#ddd7cc] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="break-words font-bold">{pick(line.product.name)}</p>
                        <p className="text-sm text-slate-500">Qty {line.quantity}</p>
                      </div>
                      <p className="font-black text-[#07586b]">{formatCurrency(line.lineTotal)}</p>
                      <button type="button" onClick={() => cart.remove(line.productId)} className="inline-flex h-10 w-10 items-center justify-center border border-red-100 text-red-600 hover:bg-red-50" aria-label={`Remove ${pick(line.product.name)} from cart`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
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
              <div className="portal-panel ff-card">
                <h2 className="display-serif text-2xl font-medium sm:text-3xl">Order History</h2>
                <OrderTable orders={recentOrders} />
              </div>
            )}

            {tab === "account" && (
              <div className="portal-panel ff-card">
                <h2 className="display-serif text-2xl font-medium sm:text-3xl">Account Details</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {Object.entries(customer).map(([key, value]) => (
                    <div key={key} className="border border-[#ddd7cc] p-4">
                      <p className="text-xs font-black uppercase text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={changePassword} className="mt-8 border-t border-[#eee7da] pt-6">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-[#07586b]" />
                    <h3 className="text-lg font-black text-slate-950">Change Password</h3>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="admin-label">New password</span>
                      <input type="password" value={passwordForm.password} onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} className="admin-input" />
                    </label>
                    <label className="block">
                      <span className="admin-label">Confirm password</span>
                      <input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} className="admin-input" />
                    </label>
                  </div>
                  {passwordError && <p className="mt-4 bg-red-50 p-3 text-sm font-bold text-red-700">{passwordError}</p>}
                  {passwordNotice && <p className="mt-4 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{passwordNotice}</p>}
                  <button type="submit" disabled={passwordSaving} className="ff-button ff-button-primary mt-5 h-11 min-w-0 disabled:bg-slate-300">
                    {passwordSaving ? "Saving..." : "Update Password"}
                  </button>
                </form>
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
    <div className="mt-5">
      <div className="portal-order-cards md:hidden">
        {rows.map((order) => (
          <div key={order.id} className="portal-order-card">
            <div className="portal-order-row">
              <div>
                <p className="font-black text-slate-950">{order.orderNumber}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{order.createdAt.slice(0, 10)}</p>
              </div>
              <StatusBadge value={order.status} />
            </div>
            <div className="portal-order-row text-sm">
              <span className="font-bold text-slate-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
              <strong className="text-[#07586b]">{formatCurrency(order.total)}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
      </div>
      {rows.length === 0 && <p className="py-8 text-center text-slate-500">No orders yet.</p>}
    </div>
  );
}
