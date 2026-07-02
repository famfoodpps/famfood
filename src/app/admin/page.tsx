"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, ClipboardList, LayoutDashboard, LogOut, Plus, Save, Settings, Tags, Upload, Users } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { businessSettings, categories, demoOrders, formatCurrency, orderStatuses, products, restaurantCustomers } from "@/data/catalog";
import type { BusinessSettings, Category, Order, OrderStatus, Product, RestaurantCustomer } from "@/types/catalog";

type AdminTab = "dashboard" | "products" | "categories" | "orders" | "customers" | "pricing" | "settings";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Boxes },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "customers", label: "Restaurant Customers", icon: Users },
  { id: "pricing", label: "Pricing", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
] satisfies { id: AdminTab; label: string; icon: typeof LayoutDashboard }[];

const stockStatuses = ["In Stock", "Limited", "Pre-order", "Out of Stock"] satisfies Product["stockStatus"][];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [managedProducts, setManagedProducts] = useState<Product[]>(products);
  const [managedCategories, setManagedCategories] = useState<Category[]>(categories);
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [customers, setCustomers] = useState<RestaurantCustomer[]>(restaurantCustomers);
  const [settings, setSettings] = useState<BusinessSettings>(businessSettings);
  const [creatingCustomerId, setCreatingCustomerId] = useState<string | null>(null);
  const [customerNotice, setCustomerNotice] = useState("");
  const [adminNotice, setAdminNotice] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const session = window.localStorage.getItem("famfood-session");
      if (!session?.includes("admin")) router.push("/restaurant/login");
      setManagedProducts(readStore("famfood-admin-products", products));
      setManagedCategories(readStore("famfood-admin-categories", categories));
      setOrders(readStore("famfood-admin-orders", demoOrders));
      setCustomers(readStore("famfood-admin-customers", restaurantCustomers));
      setSettings(readStore("famfood-admin-settings", businessSettings));
    });
  }, [router]);

  useEffect(() => saveStore("famfood-admin-products", managedProducts), [managedProducts]);
  useEffect(() => saveStore("famfood-admin-categories", managedCategories), [managedCategories]);
  useEffect(() => saveStore("famfood-admin-orders", orders), [orders]);
  useEffect(() => saveStore("famfood-admin-customers", customers), [customers]);
  useEffect(() => saveStore("famfood-admin-settings", settings), [settings]);

  const activeProducts = managedProducts.filter((product) => product.active);
  const pendingOrders = orders.filter((order) => order.status === "Pending");
  const featured = managedProducts.filter((product) => product.featured);

  function updateProduct(productId: string, patch: Partial<Product>) {
    setManagedProducts((current) => current.map((product) => (product.id === productId ? { ...product, ...patch } : product)));
  }

  function updateCategory(categoryId: string, patch: Partial<Category>) {
    setManagedCategories((current) => current.map((category) => (category.id === categoryId ? { ...category, ...patch } : category)));
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
    await adminFetch("/api/admin/orders", { method: "PATCH", body: JSON.stringify({ id: orderId, status }) }).catch((error) => setAdminNotice(error.message));
  }

  function updateCustomer(customerId: string, patch: Partial<RestaurantCustomer>) {
    setCustomers((current) => current.map((customer) => (customer.id === customerId ? { ...customer, ...patch } : customer)));
  }

  function addProduct() {
    const base = managedProducts[0];
    const next: Product = {
      ...base,
      id: `p-${Date.now()}`,
      slug: `new-product-${Date.now()}`,
      sku: `NEW-${managedProducts.length + 1}`,
      name: { en: "New Product", zh: "新产品" },
      description: { en: "Product description", zh: "产品描述" },
      publicPrice: 0,
      restaurantPrice: 0,
      featured: false,
      active: true,
    };
    setManagedProducts((current) => [next, ...current]);
  }

  function addCustomer() {
    setCustomers((current) => [
      {
        id: `r-${Date.now()}`,
        restaurantName: "New Restaurant",
        legalCompanyName: "New Restaurant Sdn. Bhd.",
        picName: "PIC Name",
        phone: "",
        email: "",
        temporaryPassword: "TempPass123!",
        address: "",
        companyRegistrationNo: "",
        taxIdentificationNo: "",
        sstRegistrationNo: "",
        eInvoiceEmail: "",
        businessType: "Restaurant",
        billingAddress: "",
        billingPostcode: "",
        billingCity: "",
        billingState: "Sarawak",
        billingCountry: "Malaysia",
        paymentTerms: "COD",
        loginEnabled: false,
        priceTier: "Standard Restaurant",
        status: "Pending",
      },
      ...current,
    ]);
  }

  async function createCustomerAccount(customer: RestaurantCustomer) {
    setCreatingCustomerId(customer.id);
    setCustomerNotice("");
    try {
      const response = await adminFetch("/api/admin/customers", {
        method: "POST",
        body: JSON.stringify(customer),
      });
      const payload = await response.json();
      updateCustomer(customer.id, { loginEnabled: true, status: "Active", userId: payload.customer?.user_id || payload.customer?.userId });
      setCustomerNotice(`Login account created for ${customer.email}.`);
    } catch (caught) {
      setCustomerNotice(caught instanceof Error ? caught.message : "Unable to create account.");
    } finally {
      setCreatingCustomerId(null);
    }
  }

  async function loadAdminData() {
    try {
      const [productPayload, categoryPayload, orderPayload, customerPayload, settingsPayload] = await Promise.all([
        adminFetch("/api/admin/products").then((response) => response.json()),
        adminFetch("/api/admin/categories").then((response) => response.json()),
        adminFetch("/api/admin/orders").then((response) => response.json()),
        adminFetch("/api/admin/customers").then((response) => response.json()),
        adminFetch("/api/admin/settings").then((response) => response.json()),
      ]);
      if (Array.isArray(productPayload.products)) setManagedProducts(productPayload.products);
      if (Array.isArray(categoryPayload.categories)) setManagedCategories(categoryPayload.categories);
      if (Array.isArray(orderPayload.orders)) setOrders(orderPayload.orders);
      if (Array.isArray(customerPayload.customers)) setCustomers(customerPayload.customers);
      if (settingsPayload.settings) setSettings(settingsPayload.settings);
    } catch (caught) {
      setAdminNotice(caught instanceof Error ? caught.message : "Unable to load admin data.");
    }
  }

  async function saveProduct(product: Product) {
    try {
      const isSeedId = product.id.startsWith("p-") || product.id.startsWith("local-");
      const response = await adminFetch("/api/admin/products", {
        method: isSeedId ? "POST" : "PATCH",
        body: JSON.stringify(product),
      });
      const payload = await response.json();
      if (payload.product) updateProduct(product.id, payload.product);
      setAdminNotice(`Saved product: ${product.name.en}`);
    } catch (caught) {
      setAdminNotice(caught instanceof Error ? caught.message : "Unable to save product.");
    }
  }

  async function saveCategory(category: Category) {
    try {
      const response = await adminFetch("/api/admin/categories", { method: "PATCH", body: JSON.stringify(category) });
      const payload = await response.json();
      if (payload.category) updateCategory(category.id, payload.category);
      setAdminNotice(`Saved category: ${category.name.en}`);
    } catch (caught) {
      setAdminNotice(caught instanceof Error ? caught.message : "Unable to save category.");
    }
  }

  async function saveCustomer(customer: RestaurantCustomer) {
    try {
      const response = await adminFetch("/api/admin/customers", { method: "PATCH", body: JSON.stringify(customer) });
      const payload = await response.json();
      if (payload.customer) updateCustomer(customer.id, payload.customer);
      setCustomerNotice(`Saved customer: ${customer.restaurantName}`);
    } catch (caught) {
      setCustomerNotice(caught instanceof Error ? caught.message : "Unable to save customer.");
    }
  }

  async function saveSettings() {
    try {
      const response = await adminFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      const payload = await response.json();
      if (payload.settings) setSettings(payload.settings);
      setAdminNotice("Business settings saved.");
    } catch (caught) {
      setAdminNotice(caught instanceof Error ? caught.message : "Unable to save settings.");
    }
  }

  async function seedCatalog() {
    try {
      const response = await adminFetch("/api/admin/seed", { method: "POST" });
      const payload = await response.json();
      if (payload.seeded) {
        setAdminNotice(`Seeded ${payload.categories} categories and ${payload.products} products.`);
        await loadAdminData();
      } else {
        setAdminNotice(payload.message || "Seed endpoint is ready.");
      }
    } catch (caught) {
      setAdminNotice(caught instanceof Error ? caught.message : "Unable to seed catalog.");
    }
  }

  useEffect(() => {
    queueMicrotask(() => loadAdminData());
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f2e8] pt-[104px]">
      <div className="section-shell py-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="ff-eyebrow">Admin system</p>
            <h1 className="display-serif mt-2 break-words text-4xl font-medium text-slate-950 md:text-5xl">FAMFOOD Dashboard</h1>
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
          <button type="button" onClick={seedCatalog} className="ff-button ff-button-primary bg-white text-[#07586b]">
            Seed Catalog
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[270px_1fr]">
          <nav className="ff-card p-3">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`mb-1 flex w-full items-center px-4 py-3 text-left text-sm font-black ${tab === id ? "bg-[#07586b] text-white" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <section>
            {adminNotice && <p className="mb-4 border border-[#ddd7cc] bg-white p-3 text-sm font-bold text-[#07586b]">{adminNotice}</p>}

            {tab === "dashboard" && (
              <div className="grid gap-6 md:grid-cols-4">
                <Metric label="Active Products" value={activeProducts.length.toString()} />
                <Metric label="Pending Orders" value={pendingOrders.length.toString()} />
                <Metric label="Restaurants" value={customers.length.toString()} />
                <Metric label="Featured" value={featured.length.toString()} />
                <Panel title="Latest orders" description="Status updates are reflected in restaurant order history when connected to Supabase.">
                  <OrdersTable orders={orders.slice(0, 6)} onStatusChange={updateOrderStatus} />
                </Panel>
              </div>
            )}

            {tab === "products" && (
              <Panel
                title="Manage products"
                description="Create products, edit bilingual content, prices, active/featured states and product image URLs or uploads."
                action={
                  <button type="button" onClick={addProduct} className="ff-button ff-button-primary h-11">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
                }
              >
                <div className="space-y-4">
                  {managedProducts.map((product) => (
                    <div key={product.id} className="border border-[#ddd7cc] bg-white p-5">
                      <div className="grid gap-5 xl:grid-cols-[170px_1fr]">
                        <div className="min-w-0">
                          <div className="relative aspect-square overflow-hidden bg-[#f7f2e8]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.image} alt={product.name.en} className="h-full w-full object-cover" />
                          </div>
                          <label className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center border border-[#ddd7cc] text-xs font-black text-[#07586b] hover:bg-[#f7f2e8]">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) =>
                                handleImageFile(event.currentTarget.files?.[0], (image) =>
                                  updateProduct(product.id, { image, gallery: [image, ...(product.gallery || [])] }),
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="min-w-0 space-y-5">
                          <div className="flex flex-col justify-between gap-4 border-b border-[#eee7da] pb-4 md:flex-row md:items-start">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{product.sku}</p>
                              <h3 className="display-serif mt-1 break-words text-2xl font-medium text-slate-950">{product.name.en}</h3>
                            </div>
                            <button type="button" onClick={() => saveProduct(product)} className="ff-button ff-button-primary h-11 min-w-0 px-5">
                              Save Product
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <ProductField label="English name" value={product.name.en} onChange={(value) => updateProduct(product.id, { name: { ...product.name, en: value } })} />
                            <ProductField label="Chinese name" value={product.name.zh} onChange={(value) => updateProduct(product.id, { name: { ...product.name, zh: value } })} />
                            <ProductField label="SKU" value={product.sku} onChange={(value) => updateProduct(product.id, { sku: value })} />
                            <ProductField label="Slug" value={product.slug} onChange={(value) => updateProduct(product.id, { slug: value })} />
                            <label className="block">
                              <span className="admin-label">Category</span>
                              <select value={product.categoryId} onChange={(event) => updateProduct(product.id, { categoryId: event.target.value })} className="admin-input">
                                {managedCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name.en}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="admin-label">Stock status</span>
                              <select value={product.stockStatus} onChange={(event) => updateProduct(product.id, { stockStatus: event.target.value as Product["stockStatus"] })} className="admin-input">
                                {stockStatuses.map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                            </label>
                            <ProductField label="Public price" type="number" value={String(product.publicPrice)} onChange={(value) => updateProduct(product.id, { publicPrice: Number(value) })} />
                            <ProductField label="Restaurant price" type="number" value={String(product.restaurantPrice)} onChange={(value) => updateProduct(product.id, { restaurantPrice: Number(value) })} />
                            <ProductField label="Weight" value={product.weight} onChange={(value) => updateProduct(product.id, { weight: value })} />
                            <ProductField label="Packing EN" value={product.packing.en} onChange={(value) => updateProduct(product.id, { packing: { ...product.packing, en: value } })} />
                            <ProductField label="Packing 中文" value={product.packing.zh} onChange={(value) => updateProduct(product.id, { packing: { ...product.packing, zh: value } })} />
                            <ProductField label="MOQ EN" value={product.moq.en} onChange={(value) => updateProduct(product.id, { moq: { ...product.moq, en: value } })} />
                            <ProductField label="MOQ 中文" value={product.moq.zh} onChange={(value) => updateProduct(product.id, { moq: { ...product.moq, zh: value } })} />
                            <ProductField label="Image URL" value={product.image} onChange={(value) => updateProduct(product.id, { image: value })} className="md:col-span-2" />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <ProductField label="Description EN" value={product.description.en} onChange={(value) => updateProduct(product.id, { description: { ...product.description, en: value } })} multiline />
                            <ProductField label="Description 中文" value={product.description.zh} onChange={(value) => updateProduct(product.id, { description: { ...product.description, zh: value } })} multiline />
                          </div>

                          <div className="flex flex-wrap items-center gap-5 border-t border-[#eee7da] pt-4">
                            <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                              <input type="checkbox" checked={product.featured} onChange={(event) => updateProduct(product.id, { featured: event.target.checked })} />
                              Featured product
                            </label>
                            <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                              <input type="checkbox" checked={product.active} onChange={(event) => updateProduct(product.id, { active: event.target.checked })} />
                              Active on website
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "categories" && (
              <Panel title="Manage categories" description="Edit category names, descriptions, active states and catalog images.">
                <div className="grid gap-4 md:grid-cols-2">
                  {managedCategories.map((category) => (
                    <div key={category.id} className="border border-[#ddd7cc] p-5">
                      <div className="grid gap-2">
                        <input value={category.name.en} onChange={(event) => updateCategory(category.id, { name: { ...category.name, en: event.target.value } })} className="admin-input font-black" />
                        <input value={category.name.zh} onChange={(event) => updateCategory(category.id, { name: { ...category.name, zh: event.target.value } })} className="admin-input" />
                        <input value={category.image} onChange={(event) => updateCategory(category.id, { image: event.target.value })} className="admin-input text-xs" />
                      </div>
                      <label className="mt-4 flex items-center gap-2 text-sm font-black text-slate-700">
                        <input type="checkbox" checked={category.active} onChange={(event) => updateCategory(category.id, { active: event.target.checked })} />
                        Active
                      </label>
                      <button type="button" onClick={() => saveCategory(category)} className="ff-button ff-button-outline mt-4 h-11 min-w-0 bg-white px-4">
                        Save Category
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "orders" && (
              <Panel title="View restaurant orders" description="Update order status from pending through delivered or cancelled.">
                <OrdersTable orders={orders} onStatusChange={updateOrderStatus} />
              </Panel>
            )}

            {tab === "customers" && (
              <Panel
                title="Restaurant customers"
                description="Owner creates restaurant login accounts and stores Malaysia company, tax and e-invoice details."
                action={
                  <button type="button" onClick={addCustomer} className="ff-button ff-button-primary h-11">
                    <Plus className="h-4 w-4" />
                    Add Restaurant
                  </button>
                }
              >
                {customerNotice && <p className="mb-4 border border-[#ddd7cc] bg-[#f7f2e8] p-3 text-sm font-bold text-[#07586b]">{customerNotice}</p>}
                <div className="grid gap-4">
                  {customers.map((customer) => (
                    <div key={customer.id} className="border border-[#ddd7cc] bg-white p-5">
                      <div className="flex flex-col justify-between gap-4 border-b border-[#eee7da] pb-4 md:flex-row md:items-center">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Restaurant account</p>
                          <h3 className="display-serif mt-1 text-2xl font-medium text-slate-950">{customer.restaurantName}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => createCustomerAccount(customer)}
                          disabled={creatingCustomerId === customer.id || customer.loginEnabled}
                          className="ff-button ff-button-primary h-11 disabled:border-slate-300 disabled:bg-slate-300"
                        >
                          {customer.loginEnabled ? "Account Active" : creatingCustomerId === customer.id ? "Creating..." : "Create Login Account"}
                        </button>
                        <button type="button" onClick={() => saveCustomer(customer)} className="ff-button ff-button-outline h-11 bg-white">
                          Save Details
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <CustomerField label="Restaurant display name" value={customer.restaurantName} onChange={(value) => updateCustomer(customer.id, { restaurantName: value })} />
                        <CustomerField label="Legal company name" value={customer.legalCompanyName || ""} onChange={(value) => updateCustomer(customer.id, { legalCompanyName: value })} />
                        <CustomerField label="Business type" value={customer.businessType || ""} onChange={(value) => updateCustomer(customer.id, { businessType: value })} />
                        <CustomerField label="PIC name" value={customer.picName} onChange={(value) => updateCustomer(customer.id, { picName: value })} />
                        <CustomerField label="Phone" value={customer.phone} onChange={(value) => updateCustomer(customer.id, { phone: value })} />
                        <CustomerField label="Login email" type="email" value={customer.email} onChange={(value) => updateCustomer(customer.id, { email: value })} />
                        <CustomerField label="Temporary password" type="password" value={customer.temporaryPassword || ""} onChange={(value) => updateCustomer(customer.id, { temporaryPassword: value })} />
                        <CustomerField label="Price tier" value={customer.priceTier} onChange={(value) => updateCustomer(customer.id, { priceTier: value })} />
                        <label className="block">
                          <span className="admin-label">Status</span>
                          <select value={customer.status} onChange={(event) => updateCustomer(customer.id, { status: event.target.value as RestaurantCustomer["status"] })} className="admin-input">
                            <option>Active</option>
                            <option>Pending</option>
                            <option>Suspended</option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-6 border-t border-[#eee7da] pt-5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Malaysia company & tax details</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <CustomerField label="SSM / Company No." value={customer.companyRegistrationNo || ""} onChange={(value) => updateCustomer(customer.id, { companyRegistrationNo: value })} />
                          <CustomerField label="TIN / Tax code" value={customer.taxIdentificationNo || ""} onChange={(value) => updateCustomer(customer.id, { taxIdentificationNo: value })} />
                          <CustomerField label="SST Registration No." value={customer.sstRegistrationNo || ""} onChange={(value) => updateCustomer(customer.id, { sstRegistrationNo: value })} />
                          <CustomerField label="E-invoice email" type="email" value={customer.eInvoiceEmail || ""} onChange={(value) => updateCustomer(customer.id, { eInvoiceEmail: value })} />
                          <CustomerField label="Payment terms" value={customer.paymentTerms || ""} onChange={(value) => updateCustomer(customer.id, { paymentTerms: value })} />
                          <CustomerField label="Billing postcode" value={customer.billingPostcode || ""} onChange={(value) => updateCustomer(customer.id, { billingPostcode: value })} />
                          <CustomerField label="Billing city" value={customer.billingCity || ""} onChange={(value) => updateCustomer(customer.id, { billingCity: value })} />
                          <CustomerField label="Billing state" value={customer.billingState || ""} onChange={(value) => updateCustomer(customer.id, { billingState: value })} />
                          <CustomerField label="Billing country" value={customer.billingCountry || "Malaysia"} onChange={(value) => updateCustomer(customer.id, { billingCountry: value })} />
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <CustomerField label="Delivery address" value={customer.address} onChange={(value) => updateCustomer(customer.id, { address: value })} multiline />
                          <CustomerField label="Billing address" value={customer.billingAddress || ""} onChange={(value) => updateCustomer(customer.id, { billingAddress: value })} multiline />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "pricing" && (
              <Panel title="Pricing" description="Public and restaurant pricing side by side.">
                <div className="grid gap-4">
                  {managedProducts.map((product) => (
                    <div key={product.id} className="grid gap-3 border border-[#ddd7cc] p-4 md:grid-cols-[1fr_160px_180px] md:items-center">
                      <p className="font-bold text-slate-950">{product.name.en}</p>
                      <p className="text-sm">
                        Public: <strong>{formatCurrency(product.publicPrice)}</strong>
                      </p>
                      <p className="text-sm">
                        Restaurant: <strong className="text-[#07586b]">{formatCurrency(product.restaurantPrice)}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "settings" && (
              <Panel title="Contact and business settings" description="Business settings used across the public site and checkout messages.">
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(settings).map(([key, value]) => (
                    <label key={key} className="block">
                      <span className="admin-label">{key.replace(/([A-Z])/g, " $1")}</span>
                      <input value={value} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="admin-input" />
                    </label>
                  ))}
                </div>
                <button type="button" onClick={saveSettings} className="ff-button ff-button-primary mt-6">
                  <Save className="h-4 w-4" />
                  Save Settings
                </button>
              </Panel>
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

function Panel({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ff-card p-6 md:col-span-4">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="display-serif text-3xl font-medium text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function OrdersTable({ orders, onStatusChange }: { orders: Order[]; onStatusChange: (orderId: string, status: OrderStatus) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="py-3">Order</th>
            <th className="py-3">Customer</th>
            <th className="py-3">Channel</th>
            <th className="py-3">Total</th>
            <th className="py-3">Status</th>
            <th className="py-3">Update</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee7da]">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="py-4 font-bold">{order.orderNumber}</td>
              <td className="py-4">{order.customerName}</td>
              <td className="py-4">{order.channel}</td>
              <td className="py-4 font-bold text-[#07586b]">{formatCurrency(order.total)}</td>
              <td className="py-4">
                <StatusBadge value={order.status} />
              </td>
              <td className="py-4">
                <select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)} className="h-10 border border-slate-200 px-3 text-sm">
                  {orderStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductField({
  className = "",
  label,
  multiline = false,
  onChange,
  type = "text",
  value,
}: {
  className?: string;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="admin-label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} className="admin-input h-28 resize-none py-3" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="admin-input" />
      )}
    </label>
  );
}

function CustomerField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} className="admin-input h-24 resize-none py-3" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="admin-input" />
      )}
    </label>
  );
}

function readStore<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function adminFetch(input: string, init: RequestInit = {}) {
  const session = JSON.parse(window.localStorage.getItem("famfood-session") || "{}") as { token?: string };
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) headers.set("content-type", "application/json");
  if (session.token) headers.set("authorization", `Bearer ${session.token}`);

  return fetch(input, { ...init, headers }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Request failed.");
    }
    return response;
  });
}

async function handleImageFile(file: File | undefined, onImage: (image: string) => void) {
  if (!file) return;
  const formData = new FormData();
  formData.set("file", file);
  try {
    const response = await adminFetch("/api/admin/upload", { method: "POST", body: formData });
    const payload = await response.json();
    if (payload.url) {
      onImage(payload.url);
      return;
    }
  } catch {
    // Fall back to inline preview when Supabase Storage is not configured yet.
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onImage(reader.result);
  };
  reader.readAsDataURL(file);
}
