import type { BusinessSettings, Category, Order, Product, ProductVariant, RestaurantCustomer } from "@/types/catalog";

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const bool = (value: unknown, fallback = false) => (typeof value === "boolean" ? value : fallback);
const num = (value: unknown, fallback = 0) => (typeof value === "number" ? value : Number(value ?? fallback) || fallback);
const nullableNum = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const strArray = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export function categoryFromRow(row: Row): Category {
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: { en: str(row.name_en), zh: str(row.name_zh) },
    description: { en: str(row.description_en), zh: str(row.description_zh) },
    image: str(row.image_url),
    imageStoragePath: str(row.image_storage_path),
    group: { en: str(row.group_en), zh: str(row.group_zh) },
    classificationKeywords: strArray(row.classification_keywords),
    sortOrder: num(row.sort_order),
    active: bool(row.active, true),
  };
}

export function categoryToRow(category: Category) {
  return {
    slug: category.slug,
    name_en: category.name.en,
    name_zh: category.name.zh,
    description_en: category.description.en,
    description_zh: category.description.zh,
    image_url: category.image,
    image_storage_path: category.imageStoragePath || null,
    group_en: category.group?.en || "",
    group_zh: category.group?.zh || "",
    classification_keywords: category.classificationKeywords || [],
    sort_order: category.sortOrder,
    active: category.active,
  };
}

export function productFromRow(row: Row): Product {
  const category = row.categories as Row | null | undefined;
  const variants = Array.isArray(row.product_variants) ? (row.product_variants as Row[]).map(productVariantFromRow) : [];
  return {
    id: str(row.id),
    slug: str(row.slug),
    sku: str(row.sku),
    categoryId: str(row.category_id),
    categorySlug: category ? str(category.slug) : undefined,
    categoryName: category ? { en: str(category.name_en), zh: str(category.name_zh) } : undefined,
    name: { en: str(row.name_en), zh: str(row.name_zh) },
    description: { en: str(row.description_en), zh: str(row.description_zh) },
    image: str(row.image_url),
    gallery: row.image_url ? [str(row.image_url)] : [],
    packing: { en: str(row.packing_en), zh: str(row.packing_zh) },
    weight: str(row.weight),
    moq: { en: str(row.moq_en), zh: str(row.moq_zh) },
    publicPrice: nullableNum(row.public_price),
    restaurantPrice: nullableNum(row.restaurant_price),
    variants,
    sourceStatus: str(row.source_status),
    sourceCategory: str(row.source_category),
    imageStoragePath: str(row.image_storage_path),
    stockStatus: str(row.stock_status, "In Stock") as Product["stockStatus"],
    featured: bool(row.featured),
    retailVisible: bool(row.retail_visible, true),
    active: bool(row.active, true),
  };
}

export function productToRow(product: Product) {
  return {
    category_id: product.categoryId || null,
    slug: product.slug,
    sku: product.sku,
    name_en: product.name.en,
    name_zh: product.name.zh,
    description_en: product.description.en,
    description_zh: product.description.zh,
    image_url: product.image,
    packing_en: product.packing.en,
    packing_zh: product.packing.zh,
    weight: product.weight,
    moq_en: product.moq.en,
    moq_zh: product.moq.zh,
    public_price: product.publicPrice ?? null,
    restaurant_price: product.restaurantPrice ?? null,
    source_status: product.sourceStatus || "formal_catalog",
    source_category: product.sourceCategory || null,
    image_storage_path: product.imageStoragePath || null,
    stock_status: product.stockStatus,
    featured: product.featured,
    retail_visible: product.retailVisible,
    active: product.active,
  };
}

export function productVariantFromRow(row: Row): ProductVariant {
  return {
    id: str(row.id),
    productId: str(row.product_id),
    variantKey: str(row.variant_key),
    code: str(row.code),
    specification: str(row.specification),
    priceUnit: str(row.price_unit),
    retailPrice: nullableNum(row.retail_price),
    promotionPrice: nullableNum(row.promotion_price),
    restaurantPrice: nullableNum(row.restaurant_price),
    effectiveDate: str(row.effective_date),
    source: str(row.source),
    sourcePage: nullableNum(row.source_page) ?? undefined,
    sourceRow: str(row.source_row),
    brandOrSection: str(row.brand_or_section),
    active: bool(row.active, true),
    sortOrder: num(row.sort_order),
  };
}

export function productVariantToRow(variant: ProductVariant, productId: string) {
  return {
    product_id: productId,
    variant_key: variant.variantKey,
    code: variant.code || null,
    specification: variant.specification,
    price_unit: variant.priceUnit || null,
    retail_price: variant.retailPrice ?? null,
    promotion_price: variant.promotionPrice ?? null,
    restaurant_price: variant.restaurantPrice ?? null,
    effective_date: variant.effectiveDate || null,
    source: variant.source || null,
    source_page: variant.sourcePage ?? null,
    source_row: variant.sourceRow || null,
    brand_or_section: variant.brandOrSection || null,
    active: variant.active,
    sort_order: variant.sortOrder,
  };
}

export function customerFromRow(row: Row): RestaurantCustomer {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    restaurantName: str(row.restaurant_name),
    legalCompanyName: str(row.legal_company_name),
    picName: str(row.pic_name),
    phone: str(row.phone),
    email: str(row.email),
    address: str(row.address),
    companyRegistrationNo: str(row.company_registration_no),
    taxIdentificationNo: str(row.tax_identification_no),
    sstRegistrationNo: str(row.sst_registration_no),
    eInvoiceEmail: str(row.e_invoice_email),
    businessType: str(row.business_type),
    billingAddress: str(row.billing_address),
    billingPostcode: str(row.billing_postcode),
    billingCity: str(row.billing_city),
    billingState: str(row.billing_state),
    billingCountry: str(row.billing_country, "Malaysia"),
    paymentTerms: str(row.payment_terms, "COD"),
    loginEnabled: bool(row.login_enabled),
    priceTier: str(row.price_tier, "Standard Restaurant"),
    status: str(row.status, "Active") as RestaurantCustomer["status"],
  };
}

export function customerToRow(customer: RestaurantCustomer) {
  return {
    user_id: customer.userId || null,
    restaurant_name: customer.restaurantName,
    legal_company_name: customer.legalCompanyName || null,
    pic_name: customer.picName,
    phone: customer.phone || null,
    email: customer.email || null,
    address: customer.address || null,
    company_registration_no: customer.companyRegistrationNo || null,
    tax_identification_no: customer.taxIdentificationNo || null,
    sst_registration_no: customer.sstRegistrationNo || null,
    e_invoice_email: customer.eInvoiceEmail || null,
    business_type: customer.businessType || null,
    billing_address: customer.billingAddress || null,
    billing_postcode: customer.billingPostcode || null,
    billing_city: customer.billingCity || null,
    billing_state: customer.billingState || null,
    billing_country: customer.billingCountry || "Malaysia",
    payment_terms: customer.paymentTerms || "COD",
    login_enabled: Boolean(customer.loginEnabled),
    price_tier: customer.priceTier,
    status: customer.status,
  };
}

export function orderFromRow(row: Row): Order {
  const items = Array.isArray(row.order_items) ? (row.order_items as Row[]) : [];
  return {
    id: str(row.id),
    orderNumber: str(row.order_number),
    channel: str(row.channel, "Public") as Order["channel"],
    customerName: str(row.customer_name),
    customerPhone: str(row.customer_phone),
    customerEmail: str(row.customer_email),
    restaurantCustomerId: str(row.restaurant_customer_id),
    fulfillment: str(row.fulfillment, "Delivery") as Order["fulfillment"],
    address: str(row.address),
    preferredDate: str(row.preferred_date),
    notes: str(row.notes),
    status: str(row.status, "Pending") as Order["status"],
    total: num(row.total),
    createdAt: str(row.created_at),
    items: items.map((item) => ({
      productId: str(item.product_id || item.product_slug),
      productName: str(item.product_name),
      quantity: num(item.quantity, 1),
      unitPrice: num(item.unit_price),
      lineTotal: num(item.line_total),
    })),
  };
}

export function settingsFromRow(row: Row | null | undefined, fallback: BusinessSettings): BusinessSettings {
  if (!row) return fallback;
  return {
    brandName: str(row.brand_name, fallback.brandName),
    businessName: str(row.business_name, fallback.businessName),
    businessNature: str(row.business_nature, fallback.businessNature),
    address: str(row.address, fallback.address),
    email: str(row.email, fallback.email),
    whatsapp: str(row.whatsapp, fallback.whatsapp),
    whatsappInternational: str(row.whatsapp_international, fallback.whatsappInternational),
    mapQuery: str(row.map_query, fallback.mapQuery),
    openingHoursWeekday: str(row.opening_hours_weekday, fallback.openingHoursWeekday),
    openingHoursSunday: str(row.opening_hours_sunday, fallback.openingHoursSunday),
    facebookUrl: str(row.facebook_url, fallback.facebookUrl),
    instagramUrl: str(row.instagram_url, fallback.instagramUrl),
  };
}

export function settingsToRow(settings: BusinessSettings) {
  return {
    brand_name: settings.brandName,
    business_name: settings.businessName,
    business_nature: settings.businessNature,
    address: settings.address,
    email: settings.email,
    whatsapp: settings.whatsapp,
    whatsapp_international: settings.whatsappInternational,
    map_query: settings.mapQuery,
    opening_hours_weekday: settings.openingHoursWeekday,
    opening_hours_sunday: settings.openingHoursSunday,
    facebook_url: settings.facebookUrl,
    instagram_url: settings.instagramUrl,
  };
}
