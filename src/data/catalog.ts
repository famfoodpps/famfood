import type {
  BusinessSettings,
  Category,
  Locale,
  Order,
  OrderStatus,
  Product,
  RestaurantCustomer,
} from "@/types/catalog";

export const orderStatuses: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export const businessSettings: BusinessSettings = {
  brandName: "FAMFOOD",
  businessName: "FAMFOOD Product Enterprise",
  address: "15, Jalan Ensing Timur, 93250 Kuching, Sarawak, Malaysia",
  email: "famfpe@gmail.com",
  whatsapp: "011-1246 0284",
  whatsappInternational: "601112460284",
  mapQuery: "15, Jalan Ensing Timur, 93250 Kuching, Sarawak, Malaysia",
};

export const categories: Category[] = [
  {
    id: "japanese-products",
    slug: "japanese-products",
    name: { en: "Japanese Products", zh: "日式产品" },
    description: {
      en: "Unagi, sushi toppings, sashimi ingredients and Japanese restaurant essentials.",
      zh: "蒲烧鳗鱼、寿司配料、刺身食材与日式餐厅常备品。",
    },
    image: "/famfood-assets/497638812_18059586122513729_3570255470813858596_n.webp",
    sortOrder: 1,
    active: true,
  },
  {
    id: "seafood",
    slug: "seafood",
    name: { en: "Seafood Selection", zh: "海鲜精选" },
    description: {
      en: "Frozen prawns, scallop, squid, crab, fish and premium seafood supply.",
      zh: "冷冻虾、带子、鱿鱼、蟹肉、鱼类与高级海鲜供应。",
    },
    image: "/famfood-assets/497812300_18059587145513729_7460572064932794637_n.webp",
    sortOrder: 2,
    active: true,
  },
  {
    id: "frozen-food",
    slug: "frozen-food",
    name: { en: "Frozen Food", zh: "冷冻食品" },
    description: {
      en: "Convenient frozen meats and kitchen staples for homes and food businesses.",
      zh: "适合家庭与餐饮业的冷冻肉类及厨房常备食品。",
    },
    image: "/famfood-assets/476398550_18048900926513729_1554981993386280179_n.webp",
    sortOrder: 3,
    active: true,
  },
  {
    id: "juice-drinks",
    slug: "juice-drinks",
    name: { en: "Juice & Drinks", zh: "果汁饮品" },
    description: {
      en: "Cafe, restaurant and retail drink selections for chilled display and service.",
      zh: "适合咖啡馆、餐厅与零售陈列的饮品选择。",
    },
    image: "/famfood-assets/480731739_18051246170513729_761803223076223467_n.webp",
    sortOrder: 4,
    active: true,
  },
  {
    id: "sauces-seasoning",
    slug: "sauces-seasoning",
    name: { en: "Kitchen Staples", zh: "厨房常备" },
    description: {
      en: "Sauces, condiments and pantry support items for daily food service.",
      zh: "餐饮日常使用的酱料、调味品与厨房辅助产品。",
    },
    image: "/famfood-assets/480948550_18051054464513729_7959440296760754443_n.webp",
    sortOrder: 5,
    active: true,
  },
  {
    id: "promotion",
    slug: "promotion",
    name: { en: "Promotion", zh: "优惠促销" },
    description: {
      en: "Seasonal bundles and highlighted stock for retail and restaurant buyers.",
      zh: "季节优惠组合与餐厅、零售客户精选产品。",
    },
    image: "/famfood-assets/498229194_18059587295513729_8115505645771456012_n.webp",
    sortOrder: 6,
    active: true,
  },
];

export const products: Product[] = [
  {
    id: "p-teriyaki-unagi",
    slug: "teriyaki-unagi",
    sku: "JP-UNA-001",
    categoryId: "japanese-products",
    name: { en: "Teriyaki Unagi", zh: "蒲烧鳗鱼" },
    description: {
      en: "Japanese-style grilled eel for rice bowls, sushi counters, bento menus and home meals.",
      zh: "适合鳗鱼饭、寿司柜台、便当菜单与家庭料理的日式蒲烧鳗鱼。",
    },
    image: "/famfood-assets/497638812_18059586122513729_3570255470813858596_n.webp",
    gallery: ["/famfood-assets/497638812_18059586122513729_3570255470813858596_n.webp"],
    packing: { en: "Vacuum pack", zh: "真空包装" },
    weight: "Approx. 250g",
    moq: { en: "1 pack", zh: "1包" },
    publicPrice: 38,
    restaurantPrice: 32,
    stockStatus: "In Stock",
    featured: true,
    active: true,
  },
  {
    id: "p-maguro-saku",
    slug: "maguro-saku",
    sku: "JP-MAG-002",
    categoryId: "japanese-products",
    name: { en: "Maguro Saku", zh: "金枪鱼刺身块" },
    description: {
      en: "Frozen tuna block suitable for slicing, sushi preparation and premium Japanese menus.",
      zh: "适合切片、寿司制作与日式高级菜单的冷冻金枪鱼块。",
    },
    image: "/famfood-assets/497702097_18059586662513729_9196365769528778275_n.webp",
    gallery: ["/famfood-assets/497702097_18059586662513729_9196365769528778275_n.webp"],
    packing: { en: "Frozen block", zh: "冷冻块装" },
    weight: "Approx. 500g",
    moq: { en: "1 block", zh: "1块" },
    publicPrice: 56,
    restaurantPrice: 49,
    stockStatus: "Limited",
    featured: true,
    active: true,
  },
  {
    id: "p-nobashi-ebi",
    slug: "nobashi-ebi",
    sku: "SF-EBI-003",
    categoryId: "seafood",
    name: { en: "Nobashi Ebi", zh: "天妇罗虾" },
    description: {
      en: "Stretched prawns prepared for tempura, sushi toppings and efficient restaurant prep.",
      zh: "适合天妇罗、寿司配料与餐厅快速备餐的拉长虾。",
    },
    image: "/famfood-assets/497717865_18059585498513729_4696495382169906542_n.webp",
    gallery: ["/famfood-assets/497717865_18059585498513729_4696495382169906542_n.webp"],
    packing: { en: "Tray pack", zh: "托盘包装" },
    weight: "20 pcs",
    moq: { en: "1 tray", zh: "1盘" },
    publicPrice: 35,
    restaurantPrice: 29,
    stockStatus: "In Stock",
    featured: true,
    active: true,
  },
  {
    id: "p-hotate-scallop",
    slug: "hotate-scallop",
    sku: "SF-SCA-004",
    categoryId: "seafood",
    name: { en: "Hotate Scallop", zh: "帆立贝柱" },
    description: {
      en: "Frozen scallop for hotpot, seafood platters, Japanese dishes and premium menus.",
      zh: "适合火锅、海鲜拼盘、日式料理与高级菜单的冷冻帆立贝。",
    },
    image: "/famfood-assets/497812300_18059587145513729_7460572064932794637_n.webp",
    gallery: ["/famfood-assets/497812300_18059587145513729_7460572064932794637_n.webp"],
    packing: { en: "Frozen pack", zh: "冷冻包装" },
    weight: "1 kg",
    moq: { en: "1 kg", zh: "1公斤" },
    publicPrice: 68,
    restaurantPrice: 59,
    stockStatus: "In Stock",
    featured: true,
    active: true,
  },
  {
    id: "p-snow-crab-leg",
    slug: "snow-crab-leg-meat",
    sku: "SF-CRB-005",
    categoryId: "seafood",
    name: { en: "Snow Crab Leg Meat", zh: "雪蟹腿肉" },
    description: {
      en: "Convenient crab leg meat for premium seafood dishes, buffets and prepared menus.",
      zh: "适合高级海鲜料理、自助餐与预制菜单的便捷雪蟹腿肉。",
    },
    image: "/famfood-assets/497878694_18059585810513729_7210555604544583685_n.webp",
    gallery: ["/famfood-assets/497878694_18059585810513729_7210555604544583685_n.webp"],
    packing: { en: "Frozen pack", zh: "冷冻包装" },
    weight: "500g",
    moq: { en: "1 pack", zh: "1包" },
    publicPrice: 78,
    restaurantPrice: 69,
    stockStatus: "Pre-order",
    featured: true,
    active: true,
  },
  {
    id: "p-ribeye-steak",
    slug: "ribeye-steak",
    sku: "FZ-BEF-006",
    categoryId: "frozen-food",
    name: { en: "Ribeye Steak", zh: "牛肋眼排" },
    description: {
      en: "Vacuum-packed frozen ribeye steak for restaurants, cafes and home cooking.",
      zh: "适合餐厅、咖啡馆与家庭料理的真空冷冻牛肋眼排。",
    },
    image: "/famfood-assets/476398550_18048900926513729_1554981993386280179_n.webp",
    gallery: ["/famfood-assets/476398550_18048900926513729_1554981993386280179_n.webp"],
    packing: { en: "Vacuum pack", zh: "真空包装" },
    weight: "300g-350g",
    moq: { en: "1 piece", zh: "1片" },
    publicPrice: 45,
    restaurantPrice: 39,
    stockStatus: "In Stock",
    featured: true,
    active: true,
  },
  {
    id: "p-whole-salmon",
    slug: "whole-salmon",
    sku: "SF-SAL-007",
    categoryId: "seafood",
    name: { en: "Whole Salmon", zh: "三文鱼" },
    description: {
      en: "Whole frozen salmon for restaurant preparation, cutting and retail supply.",
      zh: "适合餐厅备料、分切与零售供应的整条冷冻三文鱼。",
    },
    image: "/famfood-assets/497881184_18059585963513729_3837265609795932587_n.webp",
    gallery: ["/famfood-assets/497881184_18059585963513729_3837265609795932587_n.webp"],
    packing: { en: "Whole fish", zh: "整鱼" },
    weight: "By kg",
    moq: { en: "1 fish", zh: "1条" },
    publicPrice: 42,
    restaurantPrice: 36,
    stockStatus: "Limited",
    featured: false,
    active: true,
  },
  {
    id: "p-shishamo",
    slug: "shishamo",
    sku: "JP-SHI-008",
    categoryId: "japanese-products",
    name: { en: "Shishamo", zh: "多春鱼" },
    description: {
      en: "Frozen shishamo fish for grilling, izakaya menus and family meals.",
      zh: "适合烧烤、居酒屋菜单与家庭餐桌的冷冻多春鱼。",
    },
    image: "/famfood-assets/497923510_18059585615513729_4772843047552118314_n.webp",
    gallery: ["/famfood-assets/497923510_18059585615513729_4772843047552118314_n.webp"],
    packing: { en: "Frozen pack", zh: "冷冻包装" },
    weight: "500g",
    moq: { en: "1 pack", zh: "1包" },
    publicPrice: 24,
    restaurantPrice: 20,
    stockStatus: "In Stock",
    featured: false,
    active: true,
  },
  {
    id: "p-premium-juice",
    slug: "premium-juice-selection",
    sku: "DR-JUI-009",
    categoryId: "juice-drinks",
    name: { en: "Premium Juice Selection", zh: "精选果汁饮品" },
    description: {
      en: "Juice products for cafes, restaurants, retailers and home customers.",
      zh: "适合咖啡馆、餐厅、零售商与家庭客户的果汁饮品。",
    },
    image: "/famfood-assets/480731739_18051246170513729_761803223076223467_n.webp",
    gallery: ["/famfood-assets/480731739_18051246170513729_761803223076223467_n.webp"],
    packing: { en: "Carton / bottle", zh: "箱装或瓶装" },
    weight: "Assorted",
    moq: { en: "1 carton", zh: "1箱" },
    publicPrice: 18,
    restaurantPrice: 15,
    stockStatus: "In Stock",
    featured: true,
    active: true,
  },
  {
    id: "p-promotion-pack",
    slug: "famfood-promotion-pack",
    sku: "PR-BDL-010",
    categoryId: "promotion",
    name: { en: "FAMFOOD Promotion Pack", zh: "FAMFOOD优惠组合" },
    description: {
      en: "Seasonal bundled product promotion for retail customers and food businesses.",
      zh: "面向零售客户与餐饮业者的季节性产品优惠组合。",
    },
    image: "/famfood-assets/498229194_18059587295513729_8115505645771456012_n.webp",
    gallery: ["/famfood-assets/498229194_18059587295513729_8115505645771456012_n.webp"],
    packing: { en: "Bundle", zh: "组合装" },
    weight: "Assorted",
    moq: { en: "1 bundle", zh: "1组" },
    publicPrice: 88,
    restaurantPrice: 78,
    stockStatus: "Limited",
    featured: true,
    active: true,
  },
];

export const restaurantCustomers: RestaurantCustomer[] = [
  {
    id: "r-demo",
    restaurantName: "Kuching Bistro Supply Account",
    legalCompanyName: "Kuching Bistro Sdn. Bhd.",
    picName: "Restaurant Buyer",
    phone: "011-1246 0284",
    email: "restaurant@demo.com",
    temporaryPassword: "restaurant123",
    address: "Kuching, Sarawak",
    companyRegistrationNo: "202401012345",
    taxIdentificationNo: "C1234567890",
    sstRegistrationNo: "",
    eInvoiceEmail: "accounts@kuchingbistro.example",
    businessType: "Restaurant",
    billingAddress: "Kuching, Sarawak",
    billingPostcode: "93000",
    billingCity: "Kuching",
    billingState: "Sarawak",
    billingCountry: "Malaysia",
    paymentTerms: "COD",
    loginEnabled: true,
    priceTier: "Standard Restaurant",
    status: "Active",
  },
];

export const demoOrders: Order[] = [
  {
    id: "demo-order-1",
    orderNumber: "FO-240701",
    channel: "Restaurant",
    customerName: "Kuching Bistro Supply Account",
    customerPhone: "011-1246 0284",
    restaurantCustomerId: "r-demo",
    fulfillment: "Delivery",
    address: "Kuching, Sarawak",
    preferredDate: "2026-07-05",
    notes: "Deliver before lunch service.",
    status: "Preparing",
    total: 241,
    createdAt: "2026-07-01",
    items: [
      { productId: "p-teriyaki-unagi", productName: "Teriyaki Unagi", quantity: 4, unitPrice: 32, lineTotal: 128 },
      { productId: "p-hotate-scallop", productName: "Hotate Scallop", quantity: 1, unitPrice: 59, lineTotal: 59 },
      { productId: "p-nobashi-ebi", productName: "Nobashi Ebi", quantity: 2, unitPrice: 27, lineTotal: 54 },
    ],
  },
  {
    id: "demo-order-2",
    orderNumber: "FO-240702",
    channel: "Public",
    customerName: "Walk-in WhatsApp Customer",
    customerPhone: "012-000 0000",
    fulfillment: "Pickup",
    preferredDate: "2026-07-03",
    status: "Pending",
    total: 126,
    createdAt: "2026-07-02",
    items: [
      { productId: "p-ribeye-steak", productName: "Ribeye Steak", quantity: 2, unitPrice: 45, lineTotal: 90 },
      { productId: "p-premium-juice", productName: "Premium Juice Selection", quantity: 2, unitPrice: 18, lineTotal: 36 },
    ],
  },
];

export const heroSlides = [
  {
    image: "/sample-assets/seafood1.jpg",
    eyebrow: { en: "Seedlings - Selection - Supply", zh: "选品 - 冷链 - 供应" },
    title: { en: "FAMFOOD", zh: "FAMFOOD" },
    subtitle: {
      en: "Premium frozen seafood and food supply for every family and restaurant.",
      zh: "为家庭与餐饮业供应优质冷冻海鲜与食品。",
    },
  },
  {
    image: "/sample-assets/seafood2.jpg",
    eyebrow: { en: "Restaurant Supply Partner", zh: "餐饮供应伙伴" },
    title: { en: "From Ocean Selection To Kitchen Service", zh: "从海味选品到厨房供应" },
    subtitle: {
      en: "Stable product access, restaurant pricing and fast repeat ordering.",
      zh: "稳定货源、餐厅价格与高效复购流程。",
    },
  },
  {
    image: "/sample-assets/seafood-table.jpg",
    eyebrow: { en: "Product Center", zh: "产品中心" },
    title: { en: "Seafood, Japanese Goods, Frozen Staples", zh: "海鲜 日式 冷冻食品" },
    subtitle: {
      en: "A practical catalog for retailers, restaurants, cafes and homes.",
      zh: "面向零售、餐厅、咖啡馆与家庭的实用产品目录。",
    },
  },
];

export function text(value: { en: string; zh: string }, locale: Locale) {
  return value[locale] || value.en;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id);
}

export function getCategoryName(id: string, locale: Locale) {
  const category = getCategory(id);
  return category ? text(category.name, locale) : id;
}

export function activeProducts() {
  return products.filter((product) => product.active);
}

export function featuredProducts() {
  return activeProducts().filter((product) => product.featured);
}
