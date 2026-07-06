"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, ChevronDown, ClipboardList, Download, LayoutDashboard, LogOut, Plus, Save, Search, Settings, Tags, Upload, Users } from "lucide-react";
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
  const [priceNotice, setPriceNotice] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productCatalogFilter, setProductCatalogFilter] = useState("all");

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
  const categoryLookup = useMemo(() => {
    const map = new Map<string, Category>();
    managedCategories.forEach((category) => {
      map.set(category.id, category);
      map.set(category.slug, category);
    });
    return map;
  }, [managedCategories]);
  const filteredProducts = useMemo(() => {
    const target = productSearch.trim().toLowerCase();
    return managedProducts.filter((product) => {
      const category = categoryLookup.get(product.categorySlug || product.categoryId);
      const categoryKey = category?.slug || product.categorySlug || product.categoryId;
      const matchesSearch =
        !target ||
        `${product.sku} ${product.slug} ${product.name.en} ${product.name.zh} ${product.description.en} ${product.description.zh}`.toLowerCase().includes(target);
      const matchesCategory = productCategoryFilter === "all" || categoryKey === productCategoryFilter || product.categoryId === productCategoryFilter;
      const matchesStatus =
        productStatusFilter === "all" ||
        (productStatusFilter === "active" && product.active) ||
        (productStatusFilter === "inactive" && !product.active) ||
        product.stockStatus === productStatusFilter;
      const matchesCatalog =
        productCatalogFilter === "all" ||
        (productCatalogFilter === "retail" && !product.sku.startsWith("W")) ||
        (productCatalogFilter === "wholesale" && product.sku.startsWith("W"));
      return matchesSearch && matchesCategory && matchesStatus && matchesCatalog;
    });
  }, [categoryLookup, managedProducts, productCatalogFilter, productCategoryFilter, productSearch, productStatusFilter]);

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

  async function saveFilteredPrices() {
    try {
      let saved = 0;
      for (const product of filteredProducts) {
        const isSeedId = product.id.startsWith("p-") || product.id.startsWith("local-");
        const response = await adminFetch("/api/admin/products", {
          method: isSeedId ? "POST" : "PATCH",
          body: JSON.stringify(product),
        });
        const payload = await response.json();
        if (payload.product) updateProduct(product.id, payload.product);
        saved += 1;
      }
      setPriceNotice(`Saved prices for ${saved} filtered products.`);
    } catch (caught) {
      setPriceNotice(caught instanceof Error ? caught.message : "Unable to save filtered prices.");
    }
  }

  function downloadFilteredPriceCsv() {
    const rows = filteredProducts.map((product) => {
      const category = categoryLookup.get(product.categorySlug || product.categoryId);
      return [
        product.sku,
        product.slug,
        product.name.en,
        product.publicPrice,
        product.restaurantPrice,
        category?.slug || product.categorySlug || product.categoryId,
        product.stockStatus,
        product.active ? "TRUE" : "FALSE",
      ];
    });
    const csv = [
      ["sku", "slug", "name", "publicPrice", "restaurantPrice", "category", "stockStatus", "active"],
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `famfood-price-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setPriceNotice(`Downloaded ${filteredProducts.length} filtered products as CSV.`);
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

  async function uploadPriceCsv(file: File | undefined) {
    if (!file) return;
    setPriceNotice("");
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await adminFetch("/api/admin/products/prices", { method: "POST", body: formData });
      const payload = await response.json();
      if (Array.isArray(payload.updates) && payload.source === "seed") {
        setManagedProducts((current) =>
          current.map((product) => {
            const update = payload.updates.find(
              (item: { sku?: string; slug?: string; name?: string }) =>
                item.sku?.toLowerCase() === product.sku.toLowerCase() ||
                item.slug?.toLowerCase() === product.slug.toLowerCase() ||
                item.name?.toLowerCase() === product.name.en.toLowerCase(),
            );
            if (!update) return product;
            return {
              ...product,
              publicPrice: typeof update.publicPrice === "number" ? update.publicPrice : product.publicPrice,
              restaurantPrice: typeof update.restaurantPrice === "number" ? update.restaurantPrice : product.restaurantPrice,
            };
          }),
        );
      } else {
        await loadAdminData();
      }
      setPriceNotice(`Price CSV processed. Updated ${payload.updated || 0}${payload.unmatched ? `, unmatched ${payload.unmatched}` : ""}.`);
    } catch (caught) {
      setPriceNotice(caught instanceof Error ? caught.message : "Unable to update prices.");
    }
  }

  useEffect(() => {
    queueMicrotask(() => loadAdminData());
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f2e8] pt-[104px]">
      <div className="section-shell py-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="ff-eyebrow">Admin system</p>
            <h1 className="display-serif mt-2 break-words text-4xl font-medium text-slate-950 md:text-5xl">FAMFOOD Dashboard</h1>
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

        <div className="portal-layout mt-8 grid gap-6 lg:grid-cols-[270px_1fr] lg:gap-8">
          <nav className="portal-tabs ff-card">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`portal-tab text-sm font-black ${tab === id ? "bg-[#07586b] text-white" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <section className="min-w-0">
            {adminNotice && <p className="mb-4 border border-[#ddd7cc] bg-white p-3 text-sm font-bold text-[#07586b]">{adminNotice}</p>}

            {tab === "dashboard" && (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
                description={`Showing ${filteredProducts.length} of ${managedProducts.length} products. Search, filter, quick edit prices, then expand only the product you need.`}
                action={
                  <button type="button" onClick={addProduct} className="ff-button ff-button-primary h-11">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
                }
              >
                <ProductFilters
                  categories={managedCategories}
                  categoryFilter={productCategoryFilter}
                  catalogFilter={productCatalogFilter}
                  search={productSearch}
                  statusFilter={productStatusFilter}
                  onCategoryFilter={setProductCategoryFilter}
                  onCatalogFilter={setProductCatalogFilter}
                  onSearch={setProductSearch}
                  onStatusFilter={setProductStatusFilter}
                />

                <div className="mt-5 space-y-3">
                  {filteredProducts.map((product) => {
                    const category = categoryLookup.get(product.categorySlug || product.categoryId);
                    const isExpanded = expandedProductId === product.id;
                    return (
                      <div key={product.id} className="border border-[#ddd7cc] bg-white">
                        <div className="grid gap-3 p-3 md:grid-cols-[72px_minmax(0,1fr)] md:p-4">
                          <div className="h-[72px] w-[72px] overflow-hidden bg-[#f7f2e8]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.image} alt={product.name.en} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 space-y-3">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{product.sku}</p>
                                <h3 className="mt-1 break-words text-base font-black leading-snug text-slate-950">{product.name.en}</h3>
                                <p className="mt-1 break-words text-xs font-bold text-slate-500">{category?.name.en || product.categoryName?.en || product.categoryId}</p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                                <label className="inline-flex h-10 items-center gap-2 border border-[#ddd7cc] px-3 text-xs font-black text-slate-700">
                                  <input type="checkbox" checked={product.active} onChange={(event) => updateProduct(product.id, { active: event.target.checked })} />
                                  Active
                                </label>
                                <button type="button" onClick={() => saveProduct(product)} className="ff-button ff-button-primary h-10 min-w-0 px-4 text-xs">
                                  Save
                                </button>
                                <button type="button" onClick={() => setExpandedProductId(isExpanded ? null : product.id)} className="ff-button ff-button-outline h-10 min-w-0 bg-white px-4 text-xs">
                                  {isExpanded ? "Close" : "Edit"}
                                  <ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(110px,150px)_minmax(120px,170px)_minmax(140px,180px)]">
                              <ProductQuickPrice label="Public" value={product.publicPrice} onChange={(value) => updateProduct(product.id, { publicPrice: value })} />
                              <ProductQuickPrice label="Restaurant" value={product.restaurantPrice} onChange={(value) => updateProduct(product.id, { restaurantPrice: value })} />
                              <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
                                <span className="admin-label">Stock</span>
                                <select value={product.stockStatus} onChange={(event) => updateProduct(product.id, { stockStatus: event.target.value as Product["stockStatus"] })} className="admin-input h-10">
                                  {stockStatuses.map((status) => (
                                    <option key={status}>{status}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <ProductEditor
                            categories={managedCategories}
                            product={product}
                            productCategory={category}
                            onProductChange={(patch) => updateProduct(product.id, patch)}
                            onSave={() => saveProduct(product)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">No products match the current filters.</div>}
                </div>
              </Panel>
            )}

            {tab === "categories" && (
              <Panel title="Manage categories" description="Edit category names, groups, descriptions, active states and catalog images.">
                <div className="grid gap-4 md:grid-cols-2">
                  {managedCategories.map((category) => (
                    <div key={category.id} className="border border-[#ddd7cc] p-4 sm:p-5">
                      <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
                        <div className="min-w-0">
                          <div className="relative aspect-square overflow-hidden bg-[#f7f2e8]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={category.image} alt={category.name.en} className="h-full w-full object-cover" />
                          </div>
                          <label className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center border border-[#ddd7cc] text-xs font-black text-[#07586b] hover:bg-[#f7f2e8]">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleImageFile(event.currentTarget.files?.[0], (image) => updateCategory(category.id, { image }), "categories")}
                            />
                          </label>
                        </div>
                        <div className="grid gap-2">
                        <input value={category.name.en} onChange={(event) => updateCategory(category.id, { name: { ...category.name, en: event.target.value } })} className="admin-input font-black" />
                        <input value={category.name.zh} onChange={(event) => updateCategory(category.id, { name: { ...category.name, zh: event.target.value } })} className="admin-input" />
                        <input value={category.slug} onChange={(event) => updateCategory(category.id, { slug: event.target.value })} className="admin-input text-xs" />
                        <input value={category.group?.en || ""} onChange={(event) => updateCategory(category.id, { group: { en: event.target.value, zh: category.group?.zh || "" } })} className="admin-input" />
                        <input value={category.group?.zh || ""} onChange={(event) => updateCategory(category.id, { group: { en: category.group?.en || "", zh: event.target.value } })} className="admin-input" />
                        <input value={category.image} onChange={(event) => updateCategory(category.id, { image: event.target.value })} className="admin-input text-xs" />
                        <textarea
                          value={(category.classificationKeywords || []).join(", ")}
                          onChange={(event) =>
                            updateCategory(category.id, {
                              classificationKeywords: event.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          className="admin-input py-3 text-xs"
                          rows={4}
                          style={{ height: "auto" }}
                        />
                        </div>
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
                    <div key={customer.id} className="border border-[#ddd7cc] bg-white p-4 sm:p-5">
                      <div className="flex flex-col justify-between gap-4 border-b border-[#eee7da] pb-4 xl:flex-row xl:items-center">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Restaurant account</p>
                          <h3 className="display-serif mt-1 break-words text-2xl font-medium text-slate-950">{customer.restaurantName}</h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[390px]">
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
              <Panel
                title="Pricing"
                description={`Quick price editor for ${filteredProducts.length} filtered products. Upload CSV columns: sku, slug or name, plus publicPrice and restaurantPrice.`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={downloadFilteredPriceCsv} className="ff-button ff-button-outline h-11 bg-white">
                      <Download className="h-4 w-4" />
                      Download CSV
                    </button>
                    <button type="button" onClick={saveFilteredPrices} className="ff-button ff-button-outline h-11 bg-white">
                      <Save className="h-4 w-4" />
                      Save Filtered Prices
                    </button>
                    <label className="ff-button ff-button-primary h-11 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload CSV
                      <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => uploadPriceCsv(event.target.files?.[0])} />
                    </label>
                  </div>
                }
              >
                {priceNotice && <p className="mb-4 border border-[#ddd7cc] bg-[#f7f2e8] p-3 text-sm font-bold text-[#07586b]">{priceNotice}</p>}
                <ProductFilters
                  categories={managedCategories}
                  categoryFilter={productCategoryFilter}
                  catalogFilter={productCatalogFilter}
                  search={productSearch}
                  statusFilter={productStatusFilter}
                  onCategoryFilter={setProductCategoryFilter}
                  onCatalogFilter={setProductCatalogFilter}
                  onSearch={setProductSearch}
                  onStatusFilter={setProductStatusFilter}
                />
                <div className="mt-5 grid gap-3">
                  {filteredProducts.map((product) => {
                    const category = categoryLookup.get(product.categorySlug || product.categoryId);
                    return (
                      <div key={product.id} className="grid gap-3 border border-[#ddd7cc] bg-white p-4 lg:grid-cols-[minmax(300px,1fr)_minmax(250px,320px)_auto] lg:items-center">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{product.sku}</p>
                          <p className="mt-1 break-words font-bold leading-snug text-slate-950">{product.name.en}</p>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500">{category?.name.en || product.categoryName?.en || product.categoryId}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <ProductQuickPrice label="Public" value={product.publicPrice} onChange={(value) => updateProduct(product.id, { publicPrice: value })} />
                          <ProductQuickPrice label="Restaurant" value={product.restaurantPrice} onChange={(value) => updateProduct(product.id, { restaurantPrice: value })} />
                        </div>
                        <button type="button" onClick={() => saveProduct(product)} className="ff-button ff-button-outline h-10 min-w-0 bg-white px-3 text-xs">
                          Save Row
                        </button>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">No products match the current filters.</div>}
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
    <div className="portal-panel ff-card md:col-span-4">
      <div className="portal-panel-header flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <h2 className="display-serif break-words text-2xl font-medium text-slate-950 sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProductFilters({
  categories,
  categoryFilter,
  catalogFilter,
  onCatalogFilter,
  onCategoryFilter,
  onSearch,
  onStatusFilter,
  search,
  statusFilter,
}: {
  categories: Category[];
  categoryFilter: string;
  catalogFilter: string;
  onCatalogFilter: (value: string) => void;
  onCategoryFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  search: string;
  statusFilter: string;
}) {
  return (
    <div className="mt-5 grid gap-3 border border-[#ddd7cc] bg-[#f7f2e8] p-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_minmax(180px,240px)_160px_150px]">
      <label className="flex h-11 min-w-0 items-center border border-[#d9dee2] bg-white">
        <span className="flex h-full w-11 shrink-0 items-center justify-center text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search products" className="h-full min-w-0 flex-1 border-0 bg-transparent pr-3 text-sm outline-none" />
      </label>
      <select value={categoryFilter} onChange={(event) => onCategoryFilter(event.target.value)} className="admin-input h-11">
        <option value="all">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.group?.en ? `${category.group.en} - ${category.name.en}` : category.name.en}
          </option>
        ))}
      </select>
      <select value={catalogFilter} onChange={(event) => onCatalogFilter(event.target.value)} className="admin-input h-11">
        <option value="all">Retail + wholesale</option>
        <option value="retail">Retail only</option>
        <option value="wholesale">Wholesale only</option>
      </select>
      <select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)} className="admin-input h-11">
        <option value="all">All status</option>
        <option value="active">Active only</option>
        <option value="inactive">Inactive only</option>
        {stockStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProductQuickPrice({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input value={String(value)} onChange={(event) => onChange(Number(event.target.value))} type="number" className="admin-input h-10" />
    </label>
  );
}

function ProductEditor({
  categories,
  onProductChange,
  onSave,
  product,
  productCategory,
}: {
  categories: Category[];
  onProductChange: (patch: Partial<Product>) => void;
  onSave: () => void;
  product: Product;
  productCategory?: Category;
}) {
  const selectedCategory = productCategory?.slug || product.categorySlug || product.categoryId;

  return (
    <div className="border-t border-[#eee7da] bg-white p-4 sm:p-5">
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
                  onProductChange({ image, gallery: [image, ...(product.gallery || [])] }),
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
            <button type="button" onClick={onSave} className="ff-button ff-button-primary h-11 min-w-0 px-5">
              Save Product
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ProductField label="English name" value={product.name.en} onChange={(value) => onProductChange({ name: { ...product.name, en: value } })} />
            <ProductField label="Chinese name" value={product.name.zh} onChange={(value) => onProductChange({ name: { ...product.name, zh: value } })} />
            <ProductField label="SKU" value={product.sku} onChange={(value) => onProductChange({ sku: value })} />
            <ProductField label="Slug" value={product.slug} onChange={(value) => onProductChange({ slug: value })} />
            <label className="block">
              <span className="admin-label">Category</span>
              <select value={selectedCategory} onChange={(event) => onProductChange({ categoryId: event.target.value, categorySlug: event.target.value })} className="admin-input">
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.group?.en ? `${category.group.en} - ${category.name.en}` : category.name.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="admin-label">Stock status</span>
              <select value={product.stockStatus} onChange={(event) => onProductChange({ stockStatus: event.target.value as Product["stockStatus"] })} className="admin-input">
                {stockStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <ProductField label="Public price" type="number" value={String(product.publicPrice)} onChange={(value) => onProductChange({ publicPrice: Number(value) })} />
            <ProductField label="Restaurant price" type="number" value={String(product.restaurantPrice)} onChange={(value) => onProductChange({ restaurantPrice: Number(value) })} />
            <ProductField label="Weight" value={product.weight} onChange={(value) => onProductChange({ weight: value })} />
            <ProductField label="Packing EN" value={product.packing.en} onChange={(value) => onProductChange({ packing: { ...product.packing, en: value } })} />
            <ProductField label="Packing 中文" value={product.packing.zh} onChange={(value) => onProductChange({ packing: { ...product.packing, zh: value } })} />
            <ProductField label="MOQ EN" value={product.moq.en} onChange={(value) => onProductChange({ moq: { ...product.moq, en: value } })} />
            <ProductField label="MOQ 中文" value={product.moq.zh} onChange={(value) => onProductChange({ moq: { ...product.moq, zh: value } })} />
            <ProductField label="Image URL" value={product.image} onChange={(value) => onProductChange({ image: value })} className="md:col-span-2" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProductField label="Description EN" value={product.description.en} onChange={(value) => onProductChange({ description: { ...product.description, en: value } })} multiline />
            <ProductField label="Description 中文" value={product.description.zh} onChange={(value) => onProductChange({ description: { ...product.description, zh: value } })} multiline />
          </div>

          <div className="flex flex-wrap items-center gap-5 border-t border-[#eee7da] pt-4">
            <label className="flex items-center gap-2 text-sm font-black text-slate-700">
              <input type="checkbox" checked={product.featured} onChange={(event) => onProductChange({ featured: event.target.checked })} />
              Featured product
            </label>
            <label className="flex items-center gap-2 text-sm font-black text-slate-700">
              <input type="checkbox" checked={product.active} onChange={(event) => onProductChange({ active: event.target.checked })} />
              Active on website
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTable({ orders, onStatusChange }: { orders: Order[]; onStatusChange: (orderId: string, status: OrderStatus) => void }) {
  return (
    <>
      <div className="portal-order-cards md:hidden">
        {orders.map((order) => (
          <div key={order.id} className="portal-order-card">
            <div className="portal-order-row">
              <div className="min-w-0">
                <p className="break-words font-black text-slate-950">{order.orderNumber}</p>
                <p className="mt-1 break-words text-xs font-bold text-slate-500">{order.customerName}</p>
              </div>
              <StatusBadge value={order.status} />
            </div>
            <div className="portal-order-row text-sm">
              <span className="font-bold text-slate-500">{order.channel}</span>
              <strong className="text-[#07586b]">{formatCurrency(order.total)}</strong>
            </div>
            <label className="mt-3 block">
              <span className="admin-label">Update status</span>
              <select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)} className="admin-input">
                {orderStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
    </>
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

function csvCell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
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

async function handleImageFile(file: File | undefined, onImage: (image: string) => void, folder: "products" | "categories" = "products") {
  if (!file) return;
  const formData = new FormData();
  formData.set("file", file);
  formData.set("folder", folder);
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
