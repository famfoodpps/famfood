export type Locale = "en" | "zh";

export type LocalizedText = {
  en: string;
  zh: string;
};

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export type StockStatus = "In Stock" | "Limited" | "Pre-order" | "Out of Stock";

export type Category = {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  image: string;
  group: LocalizedText;
  classificationKeywords: string[];
  sortOrder: number;
  active: boolean;
};

export type Product = {
  id: string;
  slug: string;
  sku: string;
  categoryId: string;
  categorySlug?: string;
  categoryName?: LocalizedText;
  name: LocalizedText;
  description: LocalizedText;
  image: string;
  gallery: string[];
  packing: LocalizedText;
  weight: string;
  moq: LocalizedText;
  publicPrice: number;
  restaurantPrice: number;
  stockStatus: StockStatus;
  featured: boolean;
  active: boolean;
};

export type RestaurantCustomer = {
  id: string;
  userId?: string;
  restaurantName: string;
  legalCompanyName?: string;
  picName: string;
  phone: string;
  email: string;
  temporaryPassword?: string;
  address: string;
  companyRegistrationNo?: string;
  taxIdentificationNo?: string;
  sstRegistrationNo?: string;
  eInvoiceEmail?: string;
  businessType?: string;
  billingAddress?: string;
  billingPostcode?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  paymentTerms?: string;
  loginEnabled?: boolean;
  priceTier: string;
  status: "Active" | "Pending" | "Suspended";
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  channel: "Public" | "Restaurant";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  restaurantCustomerId?: string;
  fulfillment: "Delivery" | "Pickup";
  address?: string;
  preferredDate?: string;
  notes?: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  createdAt: string;
};

export type BusinessSettings = {
  brandName: string;
  businessName: string;
  businessNature: string;
  address: string;
  email: string;
  whatsapp: string;
  whatsappInternational: string;
  mapQuery: string;
  openingHoursWeekday: string;
  openingHoursSunday: string;
  facebookUrl: string;
  instagramUrl: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartLine = CartItem & {
  product: Product;
  unitPrice: number;
  lineTotal: number;
};
