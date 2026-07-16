"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, Check, ChevronDown, ChevronUp, ClipboardList, Download, LayoutDashboard, LogOut, Plus, Save, Search, Settings, Tags, Trash2, Upload, Users, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { businessSettings, formatCurrency, orderStatuses } from "@/data/catalog";
import type { BusinessSettings, Category, Order, OrderStatus, Product, ProductVariant, RestaurantCustomer } from "@/types/catalog";

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
  const [managedProducts, setManagedProducts] = useState<Product[]>([]);
  const [managedCategories, setManagedCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<RestaurantCustomer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(businessSettings);
  const [creatingCustomerId, setCreatingCustomerId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [dirtyProducts, setDirtyProducts] = useState<Set<string>>(new Set());
  const [dirtyCategories, setDirtyCategories] = useState<Set<string>>(new Set());
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productCatalogFilter, setProductCatalogFilter] = useState("all");
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [activeProductTotal, setActiveProductTotal] = useState(0);
  const [featuredProductTotal, setFeaturedProductTotal] = useState(0);

  const toastTimer = useRef<number | null>(null);
  const notify = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const session = window.localStorage.getItem("famfood-session");
      if (!session?.includes("admin")) router.push("/restaurant/login");
    });
  }, [router]);

  const pendingOrders = orders.filter((order) => order.status === "Pending");
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
        (productCatalogFilter === "retail" && product.retailVisible) ||
        (productCatalogFilter === "wholesale" && !product.retailVisible);
      return matchesSearch && matchesCategory && matchesStatus && matchesCatalog;
    });
  }, [categoryLookup, managedProducts, productCatalogFilter, productCategoryFilter, productSearch, productStatusFilter]);

  function updateProduct(productId: string, patch: Partial<Product>, markDirty = true) {
    setManagedProducts((current) => current.map((product) => (product.id === productId ? { ...product, ...patch } : product)));
    if (markDirty) setDirtyProducts((current) => new Set(current).add(productId));
  }

  function markProductClean(productId: string) {
    setDirtyProducts((current) => {
      const next = new Set(current);
      next.delete(productId);
      return next;
    });
  }

  function updateCategory(categoryId: string, patch: Partial<Category>, markDirty = true) {
    setManagedCategories((current) => current.map((category) => (category.id === categoryId ? { ...category, ...patch } : category)));
    if (markDirty) setDirtyCategories((current) => new Set(current).add(categoryId));
  }

  function markCategoryClean(categoryId: string) {
    setDirtyCategories((current) => {
      const next = new Set(current);
      next.delete(categoryId);
      return next;
    });
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= managedCategories.length) return;
    const before = new Map(managedCategories.map((category) => [category.id, category.sortOrder]));
    const next = [...managedCategories];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const renumbered = next.map((category, position) => ({ ...category, sortOrder: position + 1 }));
    setManagedCategories(renumbered);
    const changed = renumbered.filter((category) => !category.id.startsWith("local-") && before.get(category.id) !== category.sortOrder);
    try {
      for (const category of changed) {
        await adminFetch("/api/admin/categories", { method: "PATCH", body: JSON.stringify(category) });
      }
      notify("Category order updated. 分类顺序已更新");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to update order.", "err");
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
    try {
      await adminFetch("/api/admin/orders", { method: "PATCH", body: JSON.stringify({ id: orderId, status }) });
      notify(`Order updated to ${status}.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to update order.", "err");
    }
  }

  function updateCustomer(customerId: string, patch: Partial<RestaurantCustomer>) {
    setCustomers((current) => current.map((customer) => (customer.id === customerId ? { ...customer, ...patch } : customer)));
  }

  function addProduct() {
    const next: Product = {
      id: localId("local"),
      slug: localId("new-product"),
      sku: `NEW-${managedProducts.length + 1}`,
      categoryId: managedCategories[0]?.id || "",
      categorySlug: managedCategories[0]?.slug,
      name: { en: "New Product", zh: "新产品" },
      description: { en: "Product description", zh: "产品描述" },
      image: "/product-placeholder.svg",
      gallery: [],
      packing: { en: "", zh: "" },
      weight: "",
      moq: { en: "", zh: "" },
      publicPrice: null,
      restaurantPrice: null,
      variants: [],
      stockStatus: "In Stock",
      featured: false,
      retailVisible: true,
      active: true,
    };
    setManagedProducts((current) => [next, ...current]);
    setDirtyProducts((current) => new Set(current).add(next.id));
    setDrawerProductId(next.id);
  }

  function toggleSelected(productId: string) {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function addCustomer() {
    setCustomers((current) => [
      {
        id: localId("r"),
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
    try {
      const response = await adminFetch("/api/admin/customers", {
        method: "POST",
        body: JSON.stringify(customer),
      });
      const payload = await response.json();
      updateCustomer(customer.id, { loginEnabled: true, status: "Active", userId: payload.customer?.user_id || payload.customer?.userId });
      notify(`Login account created for ${customer.email}.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to create account.", "err");
    } finally {
      setCreatingCustomerId(null);
    }
  }

  async function loadAdminData() {
    try {
      const [productPayload, categoryPayload, orderPayload, customerPayload, settingsPayload] = await Promise.all([
        adminFetch("/api/admin/products?page=1&pageSize=30").then((response) => response.json()),
        adminFetch("/api/admin/categories").then((response) => response.json()),
        adminFetch("/api/admin/orders").then((response) => response.json()),
        adminFetch("/api/admin/customers").then((response) => response.json()),
        adminFetch("/api/admin/settings").then((response) => response.json()),
      ]);
      if (Array.isArray(productPayload.products)) {
        setManagedProducts(productPayload.products);
        setProductTotalPages(productPayload.totalPages || 1);
        setProductTotal(productPayload.total || 0);
        setActiveProductTotal(productPayload.activeTotal || 0);
        setFeaturedProductTotal(productPayload.featuredTotal || 0);
      }
      if (Array.isArray(categoryPayload.categories)) setManagedCategories(categoryPayload.categories);
      if (Array.isArray(orderPayload.orders)) setOrders(orderPayload.orders);
      if (Array.isArray(customerPayload.customers)) setCustomers(customerPayload.customers);
      if (settingsPayload.settings) setSettings(settingsPayload.settings);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to load admin data.", "err");
    }
  }

  const loadAdminProducts = useCallback(async (page: number) => {
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (productSearch.trim()) params.set("q", productSearch.trim());
    if (productCategoryFilter !== "all") params.set("category", productCategoryFilter);
    if (productStatusFilter === "active" || productStatusFilter === "inactive") params.set("status", productStatusFilter);
    if (productCatalogFilter !== "all") params.set("catalog", productCatalogFilter);
    try {
      const payload = await adminFetch(`/api/admin/products?${params}`).then((response) => response.json());
      setManagedProducts(Array.isArray(payload.products) ? payload.products : []);
      setProductTotalPages(payload.totalPages || 1);
      setProductTotal(payload.total || 0);
      setActiveProductTotal(payload.activeTotal || 0);
      setFeaturedProductTotal(payload.featuredTotal || 0);
      setProductPage(payload.page || page);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to load products.", "err");
    }
  }, [notify, productCatalogFilter, productCategoryFilter, productSearch, productStatusFilter]);

  async function saveProduct(product: Product) {
    try {
      const isSeedId = product.id.startsWith("p-") || product.id.startsWith("local-");
      const response = await adminFetch("/api/admin/products", {
        method: isSeedId ? "POST" : "PATCH",
        body: JSON.stringify(product),
      });
      const payload = await response.json();
      if (payload.product) updateProduct(product.id, payload.product, false);
      markProductClean(product.id);
      notify(`Saved: ${product.name.en}`);
      return true;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to save product.", "err");
      return false;
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
        if (payload.product) updateProduct(product.id, payload.product, false);
        markProductClean(product.id);
        saved += 1;
        setToast({ text: `Saving prices... ${saved}/${filteredProducts.length}`, tone: "ok" });
      }
      notify(`Saved prices for ${saved} filtered products.`);
      return true;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to save filtered prices.", "err");
      return false;
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
    notify(`Downloaded ${filteredProducts.length} filtered products as CSV.`);
  }

  async function saveCategory(category: Category) {
    try {
      const response = await adminFetch("/api/admin/categories", { method: category.id.startsWith("local-") ? "POST" : "PATCH", body: JSON.stringify(category) });
      const payload = await response.json();
      if (payload.category) updateCategory(category.id, payload.category, false);
      markCategoryClean(category.id);
      notify(`Saved category: ${category.name.en}`);
      return true;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to save category.", "err");
      return false;
    }
  }

  function addCategory() {
    setManagedCategories((current) => [{
      id: localId("local"),
      slug: localId("new-category"),
      name: { en: "New Category", zh: "新分类" },
      description: { en: "", zh: "" },
      image: "/product-placeholder.svg",
      group: { en: "Products", zh: "产品" },
      classificationKeywords: [],
      sortOrder: current.length + 1,
      active: true,
    }, ...current]);
  }

  async function deleteCategory(category: Category) {
    if (category.id.startsWith("local-")) {
      setManagedCategories((current) => current.filter((item) => item.id !== category.id));
      return;
    }
    if (!window.confirm(`Delete category "${category.name.en}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, { method: "DELETE" });
      setManagedCategories((current) => current.filter((item) => item.id !== category.id));
      notify(`Deleted category: ${category.name.en}`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to delete category.", "err");
    }
  }

  async function deleteProduct(product: Product) {
    if (product.id.startsWith("local-")) {
      setManagedProducts((current) => current.filter((item) => item.id !== product.id));
      markProductClean(product.id);
      return true;
    }
    if (!window.confirm(`Delete product "${product.name.en}"? This cannot be undone.`)) return false;
    try {
      await adminFetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      setManagedProducts((current) => current.filter((item) => item.id !== product.id));
      markProductClean(product.id);
      notify(`Deleted product: ${product.name.en}`);
      return true;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to delete product.", "err");
      return false;
    }
  }

  async function bulkUpdateProducts(patch: Partial<Product>) {
    const targets = filteredProducts.filter((product) => selectedProducts.has(product.id));
    if (!targets.length) return;
    let done = 0;
    try {
      for (const product of targets) {
        const merged = { ...product, ...patch };
        const isSeedId = product.id.startsWith("p-") || product.id.startsWith("local-");
        const response = await adminFetch("/api/admin/products", { method: isSeedId ? "POST" : "PATCH", body: JSON.stringify(merged) });
        const payload = await response.json();
        updateProduct(product.id, payload.product || patch, false);
        markProductClean(product.id);
        done += 1;
        setToast({ text: `Updating... ${done}/${targets.length}`, tone: "ok" });
      }
      notify(`Updated ${done} products.`);
    } catch (caught) {
      notify(`Updated ${done}/${targets.length}. ${caught instanceof Error ? caught.message : "Request failed."}`, "err");
    }
  }

  async function bulkDeleteProducts() {
    const targets = filteredProducts.filter((product) => selectedProducts.has(product.id));
    if (!targets.length) return;
    if (!window.confirm(`Delete ${targets.length} selected products? This cannot be undone.`)) return;
    let done = 0;
    try {
      for (const product of targets) {
        if (!product.id.startsWith("local-")) {
          await adminFetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
        }
        setManagedProducts((current) => current.filter((item) => item.id !== product.id));
        markProductClean(product.id);
        if (drawerProductId === product.id) setDrawerProductId(null);
        done += 1;
        setToast({ text: `Deleting... ${done}/${targets.length}`, tone: "ok" });
      }
      setSelectedProducts(new Set());
      notify(`Deleted ${done} products.`);
    } catch (caught) {
      notify(`Deleted ${done}/${targets.length}. ${caught instanceof Error ? caught.message : "Request failed."}`, "err");
    }
  }

  async function saveCustomer(customer: RestaurantCustomer) {
    try {
      const response = await adminFetch("/api/admin/customers", { method: "PATCH", body: JSON.stringify(customer) });
      const payload = await response.json();
      if (payload.customer) updateCustomer(customer.id, payload.customer);
      notify(`Saved customer: ${customer.restaurantName}`);
      return true;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to save customer.", "err");
      return false;
    }
  }

  async function saveSettings() {
    try {
      const response = await adminFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      const payload = await response.json();
      if (payload.settings) setSettings(payload.settings);
      notify("Business settings saved.");
      return true;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to save settings.", "err");
      return false;
    }
  }

  async function uploadPriceCsv(file: File | undefined) {
    if (!file) return;
    setUploadingCsv(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await adminFetch("/api/admin/products/prices", { method: "POST", body: formData });
      const payload = await response.json();
      await loadAdminData();
      notify(`Price CSV processed. Updated ${payload.updated || 0}${payload.unmatched ? `, unmatched ${payload.unmatched}` : ""}.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Unable to update prices.", "err");
    } finally {
      setUploadingCsv(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => loadAdminData());
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadAdminProducts(1), 300);
    return () => window.clearTimeout(timeout);
  }, [loadAdminProducts]);

  useEffect(() => {
    if (!drawerProductId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerProductId(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerProductId]);

  const drawerProduct = drawerProductId ? managedProducts.find((product) => product.id === drawerProductId) : undefined;
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedProducts.has(product.id));

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
            {tab === "dashboard" && (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Metric label="Active Products" value={activeProductTotal.toString()} />
                <Metric label="Pending Orders" value={pendingOrders.length.toString()} />
                <Metric label="Restaurants" value={customers.length.toString()} />
                <Metric label="Featured" value={featuredProductTotal.toString()} />
                <Panel title="Latest orders" description="The most recent orders from retail and restaurant customers. 最近的零售与餐厅订单。">
                  <OrdersTable orders={orders.slice(0, 6)} onStatusChange={updateOrderStatus} />
                </Panel>
              </div>
            )}

            {tab === "products" && (
              <Panel
                title="Manage products"
                description={`${productTotal} products total. Click a row to edit, or tick rows for bulk actions. 点一行进入编辑，勾选多行可批量操作。`}
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

                {selectedProducts.size > 0 && (
                  <div className="sticky top-2 z-20 mt-4 flex flex-wrap items-center gap-2 bg-[#07586b] p-3 text-white shadow-lg">
                    <span className="text-sm font-black">{selectedProducts.size} selected</span>
                    <button type="button" onClick={() => setSelectedProducts(new Set())} className="inline-flex h-8 items-center gap-1 px-2 text-xs font-bold text-white/70 hover:text-white" aria-label="Clear selection">
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                    <div className="ml-auto flex flex-wrap gap-2">
                      <button type="button" onClick={() => bulkUpdateProducts({ active: true })} className="h-9 border border-white/40 bg-white/10 px-3 text-xs font-black hover:bg-white/20">Set Active</button>
                      <button type="button" onClick={() => bulkUpdateProducts({ active: false })} className="h-9 border border-white/40 bg-white/10 px-3 text-xs font-black hover:bg-white/20">Set Inactive</button>
                      <button type="button" onClick={() => bulkUpdateProducts({ featured: true })} className="h-9 border border-white/40 bg-white/10 px-3 text-xs font-black hover:bg-white/20">Feature</button>
                      <button type="button" onClick={() => bulkUpdateProducts({ featured: false })} className="h-9 border border-white/40 bg-white/10 px-3 text-xs font-black hover:bg-white/20">Unfeature</button>
                      <button type="button" onClick={() => bulkUpdateProducts({ retailVisible: true })} className="h-9 border border-white/40 bg-white/10 px-3 text-xs font-black hover:bg-white/20">Show in Retail</button>
                      <button type="button" onClick={() => bulkUpdateProducts({ retailVisible: false })} className="h-9 border border-white/40 bg-white/10 px-3 text-xs font-black hover:bg-white/20">B2B Only</button>
                      <button type="button" onClick={bulkDeleteProducts} className="h-9 border border-red-400 bg-red-600 px-3 text-xs font-black hover:bg-red-700">Delete</button>
                    </div>
                  </div>
                )}

                <div className="mt-4 overflow-x-auto border border-[#ddd7cc] bg-white">
                  <table className="w-full text-left text-sm md:min-w-[900px]">
                    <thead className="bg-[#f7f2e8] text-xs uppercase text-slate-400">
                      <tr>
                        <th className="w-10 p-3">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={() => setSelectedProducts(allFilteredSelected ? new Set() : new Set(filteredProducts.map((product) => product.id)))}
                            aria-label="Select all products on this page"
                          />
                        </th>
                        <th className="w-16 p-3">Image</th>
                        <th className="p-3">Product</th>
                        <th className="hidden p-3 lg:table-cell">Category</th>
                        <th className="p-3">Public</th>
                        <th className="hidden p-3 md:table-cell">Restaurant</th>
                        <th className="hidden p-3 md:table-cell">Stock</th>
                        <th className="hidden p-3 md:table-cell">Visibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const category = categoryLookup.get(product.categorySlug || product.categoryId);
                        return (
                          <tr key={product.id} onClick={() => setDrawerProductId(product.id)} className="cursor-pointer border-t border-[#eee7da] transition hover:bg-[#faf7f0]">
                            <td className="p-3" onClick={(event) => event.stopPropagation()}>
                              <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelected(product.id)} aria-label={`Select ${product.name.en}`} />
                            </td>
                            <td className="p-3">
                              <div className="h-12 w-12 overflow-hidden bg-[#f7f2e8]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={product.image} alt={product.name.en} className="h-full w-full object-cover" />
                              </div>
                            </td>
                            <td className="max-w-[280px] p-3">
                              <p className="truncate font-black text-slate-950">
                                {product.name.en}
                                {dirtyProducts.has(product.id) && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" title="Unsaved changes" />}
                              </p>
                              <p className="truncate text-xs font-bold text-slate-500">{product.sku ? `${product.sku} · ` : ""}{product.name.zh}</p>
                            </td>
                            <td className="hidden p-3 text-xs font-bold text-slate-500 lg:table-cell">{category?.name.en || product.categoryName?.en || "—"}</td>
                            <td className="p-3 font-black text-[#07586b]">{product.publicPrice ? formatCurrency(product.publicPrice) : "Ask"}</td>
                            <td className="hidden p-3 font-black text-slate-700 md:table-cell">{product.restaurantPrice ? formatCurrency(product.restaurantPrice) : "Ask"}</td>
                            <td className="hidden p-3 md:table-cell"><StatusBadge value={product.stockStatus} /></td>
                            <td className="hidden p-3 md:table-cell">
                              <div className="flex flex-wrap gap-1">
                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{product.active ? "Active" : "Off"}</span>
                                {product.featured && <span className="bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">Featured</span>}
                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${product.retailVisible ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"}`}>{product.retailVisible ? "Retail" : "B2B"}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && <div className="border-t border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500">No products match the current filters.</div>}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eee7da] pt-4">
                  <button type="button" disabled={productPage <= 1} onClick={() => loadAdminProducts(productPage - 1)} className="ff-button ff-button-outline h-10 bg-white disabled:opacity-40">Previous</button>
                  <span className="text-sm font-black text-slate-600">Page {productPage} of {productTotalPages}</span>
                  <button type="button" disabled={productPage >= productTotalPages} onClick={() => loadAdminProducts(productPage + 1)} className="ff-button ff-button-outline h-10 bg-white disabled:opacity-40">Next</button>
                </div>
              </Panel>
            )}

            {tab === "categories" && (
              <Panel title="Manage categories" description="Use the arrows to reorder — the website shows categories in this order. 用箭头调整顺序，网站按此排序。" action={<button type="button" onClick={addCategory} className="ff-button ff-button-primary h-11"><Plus className="h-4 w-4" />Add Category</button>}>
                <div className="grid gap-4 md:grid-cols-2">
                  {managedCategories.map((category, index) => (
                    <div key={category.id} className="border border-[#ddd7cc] bg-white p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">#{index + 1}</span>
                        <div className="flex gap-1">
                          <button type="button" disabled={index === 0} onClick={() => moveCategory(index, -1)} className="inline-flex h-9 w-9 items-center justify-center border border-[#ddd7cc] bg-white hover:bg-[#f7f2e8] disabled:opacity-30" aria-label={`Move ${category.name.en} up`}>
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button type="button" disabled={index === managedCategories.length - 1} onClick={() => moveCategory(index, 1)} className="inline-flex h-9 w-9 items-center justify-center border border-[#ddd7cc] bg-white hover:bg-[#f7f2e8] disabled:opacity-30" aria-label={`Move ${category.name.en} down`}>
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-[110px_1fr]">
                        <div className="min-w-0">
                          <div className="relative aspect-square overflow-hidden bg-[#f7f2e8]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={category.image} alt={category.name.en} className="h-full w-full object-cover" />
                          </div>
                          <label className="mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center border border-[#ddd7cc] text-xs font-black text-[#07586b] hover:bg-[#f7f2e8]">
                            <Upload className="mr-1.5 h-4 w-4" />
                            Upload 上传
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleImageFile(event.currentTarget.files?.[0], (image, imageStoragePath) => updateCategory(category.id, { image, imageStoragePath }), "categories")}
                            />
                          </label>
                        </div>
                        <div className="grid content-start gap-3">
                          <ProductField label="Name (English)" value={category.name.en} onChange={(value) => updateCategory(category.id, { name: { ...category.name, en: value } })} />
                          <ProductField label="名称 (中文)" value={category.name.zh} onChange={(value) => updateCategory(category.id, { name: { ...category.name, zh: value } })} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <Toggle
                          checked={category.active}
                          label="Active 显示"
                          hint="Show this category on the website 在网站显示这个分类"
                          onChange={(checked) => updateCategory(category.id, { active: checked })}
                        />
                      </div>
                      <details className="group mt-3 border border-dashed border-[#ddd7cc]">
                        <summary className="cursor-pointer p-3 text-xs font-black text-slate-500">Advanced 高级设置 (slug, group, keywords)</summary>
                        <div className="grid gap-3 border-t border-[#eee7da] p-3">
                          <ProductField label="Slug" value={category.slug} onChange={(value) => updateCategory(category.id, { slug: value })} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <ProductField label="Group (English)" value={category.group?.en || ""} onChange={(value) => updateCategory(category.id, { group: { en: value, zh: category.group?.zh || "" } })} />
                            <ProductField label="Group (中文)" value={category.group?.zh || ""} onChange={(value) => updateCategory(category.id, { group: { en: category.group?.en || "", zh: value } })} />
                          </div>
                          <label className="block">
                            <span className="admin-label">Auto-classify keywords 自动归类关键词 (comma separated)</span>
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
                              className="admin-input h-24 resize-none py-3 text-xs"
                            />
                          </label>
                          <ProductField label="Image URL" value={category.image} onChange={(value) => updateCategory(category.id, { image: value })} />
                        </div>
                      </details>
                      <div className="mt-4 flex gap-2">
                        <AsyncButton onRun={() => saveCategory(category)} dirty={dirtyCategories.has(category.id)} className="ff-button ff-button-primary h-11 min-w-0 flex-1 px-4">Save 保存</AsyncButton>
                        <button type="button" onClick={() => deleteCategory(category)} className="ff-button ff-button-outline h-11 min-w-0 bg-white px-4 text-red-700" aria-label={`Delete ${category.name.en}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "orders" && (
              <Panel title="Orders" description="Change the status as you process each order. 处理订单时在这里更改状态。">
                <OrdersTable orders={orders} onStatusChange={updateOrderStatus} />
              </Panel>
            )}

            {tab === "customers" && (
              <Panel
                title="Restaurant customers"
                description="Create login accounts for your restaurant buyers. Company & tax details are inside each card. 为餐厅客户创建登录账号，公司税务资料收在每张卡片里。"
                action={
                  <button type="button" onClick={addCustomer} className="ff-button ff-button-primary h-11">
                    <Plus className="h-4 w-4" />
                    Add Restaurant
                  </button>
                }
              >
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
                          <AsyncButton onRun={() => saveCustomer(customer)} className="ff-button ff-button-outline h-11 bg-white">
                            Save Details
                          </AsyncButton>
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

                      <details className="group mt-5 border border-dashed border-[#ddd7cc]">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-black text-slate-600">
                          <span>Company & tax details 公司与税务资料</span>
                          <span className="text-xs font-bold text-slate-400 group-open:hidden">SSM · TIN · SST · E-invoice · Billing</span>
                        </summary>
                        <div className="grid gap-4 border-t border-[#eee7da] p-4 md:grid-cols-3">
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
                        <div className="grid gap-4 p-4 pt-0 md:grid-cols-2">
                          <CustomerField label="Delivery address" value={customer.address} onChange={(value) => updateCustomer(customer.id, { address: value })} multiline />
                          <CustomerField label="Billing address" value={customer.billingAddress || ""} onChange={(value) => updateCustomer(customer.id, { billingAddress: value })} multiline />
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "pricing" && (
              <Panel
                title="Pricing"
                description={`Quick price editor 快速改价 (${filteredProducts.length} products). CSV upload needs: sku or name, publicPrice, restaurantPrice.`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={downloadFilteredPriceCsv} className="ff-button ff-button-outline h-11 bg-white">
                      <Download className="h-4 w-4" />
                      Download CSV
                    </button>
                    <AsyncButton onRun={saveFilteredPrices} busyLabel="Saving..." className="ff-button ff-button-outline h-11 bg-white">
                      <Save className="h-4 w-4" />
                      Save Filtered Prices
                    </AsyncButton>
                    <label className={`ff-button ff-button-primary h-11 cursor-pointer ${uploadingCsv ? "pointer-events-none opacity-60" : ""}`}>
                      <Upload className="h-4 w-4" />
                      {uploadingCsv ? "Uploading..." : "Upload CSV"}
                      <input type="file" accept=".csv,text/csv" className="hidden" disabled={uploadingCsv} onChange={(event) => uploadPriceCsv(event.target.files?.[0])} />
                    </label>
                  </div>
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
                        <AsyncButton onRun={() => saveProduct(product)} dirty={dirtyProducts.has(product.id)} className="ff-button ff-button-outline h-10 min-w-0 bg-white px-3 text-xs">
                          Save Row
                        </AsyncButton>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">No products match the current filters.</div>}
                    </div>
              </Panel>
            )}

            {tab === "settings" && (
              <Panel title="Business settings" description="Contact info shown on the website and in WhatsApp checkout messages. 网站和 WhatsApp 下单信息里显示的联系资料。">
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(settings).map(([key, value]) => (
                    <label key={key} className="block">
                      <span className="admin-label">{key.replace(/([A-Z])/g, " $1")}</span>
                      <input value={value} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="admin-input" />
                    </label>
                  ))}
                </div>
                <AsyncButton onRun={saveSettings} className="ff-button ff-button-primary mt-6">
                  <Save className="h-4 w-4" />
                  Save Settings
                </AsyncButton>
              </Panel>
            )}
          </section>
        </div>
      </div>
      {drawerProduct && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerProductId(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-[#ddd7cc] bg-[#f7f2e8] px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{drawerProduct.sku || "Product"}</p>
                <h2 className="display-serif truncate text-2xl font-medium text-slate-950">{drawerProduct.name.en}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {dirtyProducts.has(drawerProduct.id) && <span className="bg-amber-100 px-2 py-1 text-xs font-black uppercase text-amber-700">Unsaved</span>}
                <button
                  type="button"
                  onClick={async () => {
                    const deleted = await deleteProduct(drawerProduct);
                    if (deleted) setDrawerProductId(null);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center border border-red-200 bg-white text-red-700 hover:bg-red-50"
                  aria-label={`Delete ${drawerProduct.name.en}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setDrawerProductId(null)} className="inline-flex h-10 w-10 items-center justify-center border border-[#ddd7cc] bg-white hover:bg-[#f7f2e8]" aria-label="Close editor">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ProductEditor
                categories={managedCategories}
                product={drawerProduct}
                productCategory={categoryLookup.get(drawerProduct.categorySlug || drawerProduct.categoryId)}
                onProductChange={(patch) => updateProduct(drawerProduct.id, patch)}
                onSave={() => saveProduct(drawerProduct)}
                dirty={dirtyProducts.has(drawerProduct.id)}
              />
            </div>
          </aside>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[100] max-w-sm border p-4 text-sm font-bold shadow-2xl ${
            toast.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {toast.text}
        </div>
      )}
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
        <option value="retail">Visible in retail</option>
        <option value="wholesale">B2B only</option>
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

function ProductQuickPrice({ label, onChange, value }: { label: string; onChange: (value: number | null) => void; value: number | null }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input value={value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} type="number" min="0" step="0.01" placeholder="Ask Price" className="admin-input h-10" />
    </label>
  );
}

function ProductEditor({
  categories,
  dirty = false,
  onProductChange,
  onSave,
  product,
  productCategory,
}: {
  categories: Category[];
  dirty?: boolean;
  onProductChange: (patch: Partial<Product>) => void;
  onSave: () => Promise<boolean>;
  product: Product;
  productCategory?: Category;
}) {
  const selectedCategory = productCategory?.slug || product.categorySlug || product.categoryId;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-6 p-4 pb-6 sm:p-6">
        <section className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div className="min-w-0">
            <div className="relative mx-auto aspect-square max-w-[200px] overflow-hidden bg-[#f7f2e8] sm:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.name.en} className="h-full w-full object-cover" />
            </div>
            <label className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center border border-[#ddd7cc] text-xs font-black text-[#07586b] hover:bg-[#f7f2e8]">
              <Upload className="mr-2 h-4 w-4" />
              Upload photo 上传图片
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  handleImageFile(event.currentTarget.files?.[0], (image, path) =>
                    onProductChange({ image, imageStoragePath: path, gallery: [image] }),
                    "products",
                  )
                }
              />
            </label>
          </div>
          <div className="grid content-start gap-4">
            <ProductField label="Product name (English)" value={product.name.en} onChange={(value) => onProductChange({ name: { ...product.name, en: value } })} />
            <ProductField label="产品名 (中文)" value={product.name.zh} onChange={(value) => onProductChange({ name: { ...product.name, zh: value } })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="admin-label">Category 分类</span>
                <select value={selectedCategory} onChange={(event) => onProductChange({ categoryId: event.target.value, categorySlug: event.target.value })} className="admin-input">
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="admin-label">Stock 库存</span>
                <select value={product.stockStatus} onChange={(event) => onProductChange({ stockStatus: event.target.value as Product["stockStatus"] })} className="admin-input">
                  {stockStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="border border-[#ddd7cc] bg-[#faf7f0] p-4">
          <h4 className="text-sm font-black uppercase tracking-[0.1em] text-slate-500">Pricing 价格</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <ProductField label="Retail price 零售价 (RM)" type="number" value={product.publicPrice === null ? "" : String(product.publicPrice)} onChange={(value) => onProductChange({ publicPrice: value === "" ? null : Number(value) })} />
            <ProductField label="Restaurant price 餐厅价 (RM)" type="number" value={product.restaurantPrice === null ? "" : String(product.restaurantPrice)} onChange={(value) => onProductChange({ restaurantPrice: value === "" ? null : Number(value) })} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Leave blank to show &quot;WhatsApp Ask Price&quot; 留空则显示 WhatsApp 询价</p>
        </section>

        <section className="grid gap-2">
          <Toggle
            checked={product.active}
            label="Active 上架"
            hint="Show this product on the website 在网站上显示这个产品"
            onChange={(checked) => onProductChange({ active: checked })}
          />
          <Toggle
            checked={product.retailVisible}
            label="Retail shop 零售商店"
            hint="Public customers can see and buy it 散客可以看到并购买"
            onChange={(checked) => onProductChange({ retailVisible: checked })}
          />
          <Toggle
            checked={product.featured}
            label="Featured 主打推荐"
            hint="Show in the homepage featured section 显示在首页推荐区"
            onChange={(checked) => onProductChange({ featured: checked })}
          />
        </section>

        <details className="group border border-[#ddd7cc]" open={product.variants.length > 0}>
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-black text-slate-950">
            <span>Specifications & prices 规格与价格 {product.variants.length > 0 ? `(${product.variants.length})` : ""}</span>
            <span className="text-xs font-bold text-slate-400 group-open:hidden">Show 展开</span>
          </summary>
          <div className="space-y-3 border-t border-[#eee7da] p-4">
            {product.variants.map((variant, index) => {
              const updateVariant = (patch: Partial<ProductVariant>) => onProductChange({ variants: product.variants.map((item) => item.id === variant.id ? { ...item, ...patch } : item) });
              return <div key={variant.id} className="grid gap-3 border border-[#ddd7cc] bg-[#f7f2e8] p-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] md:items-end">
                <ProductField label={`Specification ${index + 1}`} value={variant.specification} onChange={(value) => updateVariant({ specification: value })} />
                <ProductField label="Retail" type="number" value={variant.retailPrice === null ? "" : String(variant.retailPrice)} onChange={(value) => updateVariant({ retailPrice: value === "" ? null : Number(value) })} />
                <ProductField label="Promotion" type="number" value={variant.promotionPrice === null ? "" : String(variant.promotionPrice)} onChange={(value) => updateVariant({ promotionPrice: value === "" ? null : Number(value) })} />
                <ProductField label="Restaurant" type="number" value={variant.restaurantPrice === null ? "" : String(variant.restaurantPrice)} onChange={(value) => updateVariant({ restaurantPrice: value === "" ? null : Number(value) })} />
                <button type="button" onClick={() => onProductChange({ variants: product.variants.filter((item) => item.id !== variant.id) })} className="inline-flex h-11 w-11 items-center justify-center border border-red-200 bg-white text-red-700" aria-label={`Delete specification ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
              </div>;
            })}
            {product.variants.length === 0 && <p className="border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">No specifications. The main prices above are used. 没有规格时使用上面的价格。</p>}
            <button type="button" onClick={() => {
              const next: ProductVariant = { id: localId("local"), productId: product.id, variantKey: localId("admin"), code: "", specification: "New specification", priceUnit: "", retailPrice: null, promotionPrice: null, restaurantPrice: null, effectiveDate: "", source: "Admin", sourceRow: "", brandOrSection: "", active: true, sortOrder: product.variants.length };
              onProductChange({ variants: [...product.variants, next] });
            }} className="ff-button ff-button-outline h-10 w-full bg-white sm:w-auto"><Plus className="h-4 w-4" />Add specification 加规格</button>
          </div>
        </details>

        <details className="group border border-[#ddd7cc]">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-black text-slate-950">
            <span>More details 更多资料</span>
            <span className="text-xs font-bold text-slate-400 group-open:hidden">SKU · Packing · MOQ · Description</span>
          </summary>
          <div className="grid gap-4 border-t border-[#eee7da] p-4 sm:grid-cols-2">
            <ProductField label="SKU 编号" value={product.sku} onChange={(value) => onProductChange({ sku: value })} />
            <ProductField label="Weight 重量" value={product.weight} onChange={(value) => onProductChange({ weight: value })} />
            <ProductField label="Packing (English)" value={product.packing.en} onChange={(value) => onProductChange({ packing: { ...product.packing, en: value } })} />
            <ProductField label="包装 (中文)" value={product.packing.zh} onChange={(value) => onProductChange({ packing: { ...product.packing, zh: value } })} />
            <ProductField label="MOQ (English)" value={product.moq.en} onChange={(value) => onProductChange({ moq: { ...product.moq, en: value } })} />
            <ProductField label="最低订购量 (中文)" value={product.moq.zh} onChange={(value) => onProductChange({ moq: { ...product.moq, zh: value } })} />
            <ProductField label="Description (English)" value={product.description.en} onChange={(value) => onProductChange({ description: { ...product.description, en: value } })} multiline />
            <ProductField label="描述 (中文)" value={product.description.zh} onChange={(value) => onProductChange({ description: { ...product.description, zh: value } })} multiline />
          </div>
        </details>

        <details className="group border border-dashed border-[#ddd7cc]">
          <summary className="cursor-pointer p-4 text-sm font-black text-slate-500">Advanced (slug, image URL)</summary>
          <div className="grid gap-4 border-t border-[#eee7da] p-4 sm:grid-cols-2">
            <ProductField label="Slug" value={product.slug} onChange={(value) => onProductChange({ slug: value })} />
            <ProductField label="Image URL" value={product.image} onChange={(value) => onProductChange({ image: value })} />
          </div>
        </details>
      </div>

      <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-[#ddd7cc] bg-white p-4">
        <span className={`text-xs font-bold ${dirty ? "text-amber-600" : "text-slate-400"}`}>{dirty ? "Unsaved changes 有未保存的改动" : "All changes saved 已保存"}</span>
        <AsyncButton onRun={onSave} dirty={dirty} className="ff-button ff-button-primary h-12 min-w-0 px-6">
          Save 保存
        </AsyncButton>
      </footer>
    </div>
  );
}

function Toggle({ checked, hint, label, onChange }: { checked: boolean; hint?: string; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border border-[#ddd7cc] bg-white p-4">
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">{label}</span>
        {hint && <span className="mt-0.5 block text-xs font-semibold text-slate-500">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-emerald-500 peer-checked:after:translate-x-5" />
    </label>
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

function AsyncButton({
  busyLabel = "Saving...",
  children,
  className = "",
  dirty = false,
  doneLabel = "Saved",
  onRun,
}: {
  busyLabel?: string;
  children: React.ReactNode;
  className?: string;
  dirty?: boolean;
  doneLabel?: string;
  onRun: () => Promise<boolean>;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function handleClick() {
    if (state === "busy") return;
    setState("busy");
    const ok = await onRun();
    if (ok) {
      setState("done");
      window.setTimeout(() => setState("idle"), 1600);
    } else {
      setState("idle");
    }
  }

  const stateClass =
    state === "done"
      ? "!border-emerald-600 !bg-emerald-600 !text-white"
      : dirty && state === "idle"
        ? "!border-amber-500 !bg-amber-500 !text-white"
        : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "busy"}
      title={dirty && state === "idle" ? "Unsaved changes" : undefined}
      className={`${className} ${stateClass} disabled:cursor-wait disabled:opacity-60`}
    >
      {state === "busy" ? busyLabel : state === "done" ? (<><Check className="h-4 w-4" />{doneLabel}</>) : children}
    </button>
  );
}

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

async function handleImageFile(file: File | undefined, onImage: (image: string, path?: string) => void, folder: "products" | "categories" = "products") {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    window.alert("Please upload a JPG, PNG or WebP image.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    window.alert("Image must be 5 MB or smaller.");
    return;
  }
  const formData = new FormData();
  formData.set("file", file);
  formData.set("folder", folder);
  try {
    const response = await adminFetch("/api/admin/upload", { method: "POST", body: formData });
    const payload = await response.json();
    if (payload.url) {
      onImage(payload.url, payload.path);
      return;
    }
  } catch (caught) {
    window.alert(caught instanceof Error ? caught.message : "Unable to upload image.");
  }
}
