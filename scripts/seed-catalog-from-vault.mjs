import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const vaultRoot = process.env.FAMFOOD_VAULT_DIR || "/Users/oscar/Documents/Obsidian/Codex Knowledge Vault/30 Resources/FAMFOOD Catalog";
const replaceStorage = process.argv.includes("--replace-storage");
const priceFile = path.join(vaultRoot, "price-records.csv");
const imageDirectory = path.join(vaultRoot, "images");
const reportDirectory = path.resolve("supabase/reports");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const categories = [
  ["fish-seafood", "Fish & Seafood", "鱼类与海鲜", "Whole fish, fillets and specialty seafood.", 1],
  ["prawn-squid", "Prawn & Squid", "虾与鱿鱼", "Prawn, shrimp, squid and octopus.", 2],
  ["shellfish", "Shellfish", "贝类与蟹", "Shellfish, crab, scallop, oyster and clam.", 3],
  ["meat", "Meat", "肉类", "Beef, buffalo, lamb, chicken and duck.", 4],
  ["hotpot-oden", "Hotpot & Oden", "火锅与关东煮", "Balls, tofu, fish cakes and hotpot ingredients.", 5],
  ["finger-food-dim-sum", "Finger Food & Dim Sum", "小食与点心", "Snacks, buns, dumplings, fries and ready-to-cook bites.", 6],
  ["japanese-ingredients", "Japanese Ingredients", "日式食材", "Japanese seafood, noodles, condiments and pantry items.", 7],
  ["cooking-essentials", "Cooking Essentials", "烹饪必备", "Sauces, seasonings, soup bases and dry ingredients.", 8],
  ["dessert-drinks", "Dessert & Drinks", "甜品与饮品", "Ice cream, smoothies, milkshakes and sweet treats.", 9],
  ["vegetables-fruits", "Vegetables & Fruits", "蔬菜与水果", "Frozen fruit, berries, corn and vegetables.", 10],
  ["frozen-food", "Frozen Food", "冷冻食品", "Other frozen staples and restaurant supply items.", 11],
].map(([slug, name_en, name_zh, description_en, sort_order]) => ({
  slug,
  name_en,
  name_zh,
  description_en,
  description_zh: description_en,
  group_en: "Products",
  group_zh: "产品",
  classification_keywords: [],
  sort_order,
  active: true,
}));

const featuredSeafoodFamilies = new Set([
  "fish-fillet--salmon-fillet",
  "fish-fillet--chilean-cod-steak",
  "whole-fish--golden-pomfret",
  "whole-fish--seabass",
  "whole-fish--black-pomfret",
  "fish-fillet--grouper-fish-fillet",
  "fish-fillet--halibut-fillet",
  "fish-fillet--seabass-fillet",
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  const [rawHeader = [], ...body] = rows;
  const header = rawHeader.map((value) => value.replace(/^\uFEFF/, ""));
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] || ""])));
}

const money = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalized = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hasAny = (value, words) => words.some((word) => value.includes(word));

function categoryFor(record) {
  const direct = {
    "Whole Fish": "fish-seafood",
    "Fish Fillet": "fish-seafood",
    "Sea Cucumber": "fish-seafood",
    Prawn: "prawn-squid",
    Squid: "prawn-squid",
    Shell: "shellfish",
    Crab: "shellfish",
    Scallop: "shellfish",
    Beef: "meat",
    Buffalo: "meat",
    Lamb: "meat",
    Chicken: "meat",
    Duck: "meat",
    Japanese: "japanese-ingredients",
    "Seasonings & Sauces": "cooking-essentials",
    "Fresh Juice": "dessert-drinks",
    "Ice Cream": "dessert-drinks",
    Fruits: "vegetables-fruits",
  };
  if (direct[record.category]) return direct[record.category];

  const target = normalized(`${record.name_en} ${record.name_zh} ${record.specification}`);
  if (record.category === "Others" && hasAny(target, ["scallop", "sacllop", "hokkigai", "clam", "mussel", "oyster"])) return "shellfish";
  if (record.category === "Others" && hasAny(target, ["ebi", "prawn", "shrimp", "squid", "cuttlefish", "calamari", "octopus", "tako"])) return "prawn-squid";
  if (record.category === "Others" && hasAny(target, ["pollock", "cod fish", "fish fillet", "fish maw"])) return "fish-seafood";
  if (record.category === "Others" && hasAny(target, ["beef", "chicken", "turkey", "duck", "mutton", "lamb"])) return "meat";
  if (hasAny(target, ["ball", "fishcake", "fish cake", "fishmaw", "fish maw", "fish strip", "fish rainbow", "tofu", "bean curd", "beancurd", "soy fish", "fish soy", "hotpot", "hot pot", "steamboat", "oden", "konnyaku", "fish paste", "crab stick", "crabstick", "seafood stick", "chikuwa", "yong tau", "fish roe", "seafood product", "fisro"])) return "hotpot-oden";
  if (hasAny(target, ["bun", "mantou", "steamed bread", "dumpling", "wonton", "spring roll", "popiah", "samosa", "puff", "fries", "chips", "wedges", "nugget", "croquette", "mochi", "rice cake", "donut", "dough stick", "yu tiao", "hash brown", "hashbrown", "tater tot", "sausage", "frankfurter", "cocktail", "finger", "patty", "burger", "sandwich", "loaf", "ham", "satay", "pie", "croissant", "danish", "garlic bread", "egg tart", "onion ring", "money bag", "seafood dates", "lucky bag", "cheese stick", "imitation crab", "imitation super snow", "radish stick", "puchok goreng", "keropok", "otak otak", "pratha", "drumstick", "roll"])) return "finger-food-dim-sum";
  if (hasAny(target, ["sauce", "paste", "seasoning", "powder", "soup base", "soup stock", "soup", "noodle", "ramen", "udon", "spaghetti", "pepper", "salt", "flour", "oil"])) return "cooking-essentials";
  if (hasAny(target, ["corn", "whole kernel", "vegetable", "vege", "broccoli", "spinach", "edamame", "mukimame", "berry", "fruit", "potato", "taro", "yam", "pumpkin"])) return "vegetables-fruits";
  if (hasAny(target, ["ice cream", "milkshake", "smoothie", "coconut shake", "dessert", "cake", "custard", "chocolate", "mango", "strawberry", "sesame ball", "glutinous", "glutinuos"])) return "dessert-drinks";
  if (hasAny(target, ["fried rice", "party combo"])) return "frozen-food";
  return "frozen-food";
}

function variantKey(record, index) {
  const base = [record.code, record.specification, record.price_unit, record.brand_or_section, record.source_page, record.source_row]
    .map(normalized)
    .filter(Boolean)
    .join("-");
  return (base || `variant-${index + 1}`).slice(0, 240);
}

async function inBatches(items, size, action) {
  for (let index = 0; index < items.length; index += size) await action(items.slice(index, index + size), index);
}

async function listStoragePaths(prefix = "") {
  const collected = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from("product-images").list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const entry of data) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) collected.push(objectPath);
      else collected.push(...(await listStoragePaths(objectPath)));
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return collected;
}

async function uploadImage(filename, familyId) {
  if (!filename) return null;
  const sourcePath = path.join(imageDirectory, filename);
  try {
    const bytes = await fs.readFile(sourcePath);
    const extension = path.extname(filename).toLowerCase() || ".jpg";
    const storagePath = `products/${familyId}${extension}`;
    const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    const { error } = await supabase.storage.from("product-images").upload(storagePath, bytes, { contentType, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
    return { url: data.publicUrl, path: storagePath };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

const records = parseCsv(await fs.readFile(priceFile, "utf8"));
const familyGroups = new Map();
for (const record of records) {
  if (!record.family_id) continue;
  const current = familyGroups.get(record.family_id) || [];
  current.push(record);
  familyGroups.set(record.family_id, current);
}

await fs.mkdir(reportDirectory, { recursive: true });
// Snapshot existing objects first, but keep them available until every Vault
// product and price row has been written successfully.
const oldStoragePaths = replaceStorage ? await listStoragePaths() : [];

const { error: categoryError } = await supabase.from("categories").upsert(categories, { onConflict: "slug" });
if (categoryError) throw categoryError;
const { data: categoryRows, error: categoryReadError } = await supabase.from("categories").select("id, slug");
if (categoryReadError) throw categoryReadError;
const categoryIdBySlug = new Map(categoryRows.map((category) => [category.slug, category.id]));

const productRows = [];
const missingImages = [];
const categoryReview = [];
const categoryImages = new Map();
let uploadedImages = 0;
for (const [familyId, familyRecords] of familyGroups) {
  const preferred = familyRecords.find((record) => record.sales_status === "formal_catalog") || familyRecords[0];
  const categorySlug = categoryFor(preferred);
  if (preferred.category === "Others" && categorySlug === "frozen-food") {
    categoryReview.push({ family_id: familyId, name_en: preferred.name_en, source_category: preferred.category, proposed_category: categorySlug });
  }
  const publicPrices = familyRecords.map((record) => money(record.promotion_price_rm) ?? money(record.retail_price_rm)).filter((value) => value !== null);
  const restaurantPrices = familyRecords.map((record) => money(record.restaurant_price_rm)).filter((value) => value !== null);
  const retailVisible = familyRecords.some((record) => record.sales_status === "formal_catalog");
  const imageFilename = familyRecords.find((record) => record.image_filename)?.image_filename || "";
  const uploaded = await uploadImage(imageFilename, familyId);
  if (uploaded) {
    uploadedImages += 1;
    if (!categoryImages.has(categorySlug)) categoryImages.set(categorySlug, uploaded.url);
  } else {
    missingImages.push({ family_id: familyId, name_en: preferred.name_en, source_category: preferred.category, image_filename: imageFilename });
  }
  productRows.push({
    slug: familyId,
    sku: preferred.code || "",
    category_id: categoryIdBySlug.get(categorySlug),
    name_en: preferred.name_en,
    name_zh: preferred.name_zh || preferred.name_en,
    description_en: `${preferred.name_en} from the FAMFOOD catalog.`,
    description_zh: preferred.name_zh ? `${preferred.name_zh}，来自 FAMFOOD 产品目录。` : `${preferred.name_en}，来自 FAMFOOD 产品目录。`,
    image_url: uploaded?.url || "/product-placeholder.svg",
    image_storage_path: uploaded?.path || null,
    packing_en: preferred.specification || "Ask for details",
    packing_zh: preferred.specification || "请询问详情",
    weight: preferred.specification || "Ask for details",
    moq_en: "Ask FAMFOOD",
    moq_zh: "请向 FAMFOOD 查询",
    public_price: publicPrices.length ? Math.min(...publicPrices) : null,
    restaurant_price: restaurantPrices.length ? Math.min(...restaurantPrices) : null,
    stock_status: "In Stock",
    featured: retailVisible && featuredSeafoodFamilies.has(familyId),
    retail_visible: retailVisible,
    active: true,
    source_status: familyRecords.some((record) => record.sales_status === "formal_catalog") ? "formal_catalog" : "wholesale_inquiry",
    source_category: preferred.category,
  });
}

await inBatches(productRows, 100, async (batch) => {
  const { error } = await supabase.from("products").upsert(batch, { onConflict: "slug" });
  if (error) throw error;
});

const { data: savedProducts, error: productReadError } = await supabase.from("products").select("id, slug");
if (productReadError) throw productReadError;
const productIdBySlug = new Map(savedProducts.map((product) => [product.slug, product.id]));
const seededIds = new Set(productRows.map((product) => product.slug));
const staleProductIds = savedProducts.filter((product) => !seededIds.has(product.slug)).map((product) => product.id);
await inBatches(staleProductIds, 100, async (batch) => {
  if (!batch.length) return;
  const { error } = await supabase.from("products").delete().in("id", batch);
  if (error) throw error;
});

const variantRows = [];
for (const [familyId, familyRecords] of familyGroups) {
  const productId = productIdBySlug.get(familyId);
  if (!productId) throw new Error(`Product was not created for Vault family ${familyId}.`);
  familyRecords.forEach((record, index) => {
    variantRows.push({
      product_id: productId,
      variant_key: variantKey(record, index),
      code: record.code || null,
      specification: record.specification || "Ask for details",
      price_unit: record.price_unit || null,
      retail_price: money(record.retail_price_rm),
      promotion_price: money(record.promotion_price_rm),
      restaurant_price: money(record.restaurant_price_rm),
      effective_date: record.effective_date || null,
      source: record.source || null,
      source_page: record.source_page ? Number(record.source_page) : null,
      source_row: record.source_row || null,
      brand_or_section: record.brand_or_section || null,
      active: true,
      sort_order: index,
    });
  });
}

await inBatches([...productIdBySlug.values()], 100, async (batch) => {
  const { error } = await supabase.from("product_variants").delete().in("product_id", batch);
  if (error) throw error;
});
await inBatches(variantRows, 100, async (batch) => {
  const { error } = await supabase.from("product_variants").insert(batch);
  if (error) throw error;
});

for (const [slug, image_url] of categoryImages) {
  const { error } = await supabase.from("categories").update({ image_url }).eq("slug", slug);
  if (error) throw error;
}
const activeSlugs = categories.map((category) => category.slug);
const { error: oldCategoryError } = await supabase.from("categories").update({ active: false }).not("slug", "in", `(${activeSlugs.map((slug) => `"${slug}"`).join(",")})`);
if (oldCategoryError) throw oldCategoryError;

let removedStorageObjects = 0;
if (replaceStorage) {
  const currentPaths = new Set(productRows.map((product) => product.image_storage_path).filter(Boolean));
  const obsoletePaths = oldStoragePaths.filter((objectPath) => !currentPaths.has(objectPath));
  await inBatches(obsoletePaths, 1000, async (batch) => {
    if (!batch.length) return;
    const { error } = await supabase.storage.from("product-images").remove(batch);
    if (error) throw error;
    removedStorageObjects += batch.length;
  });
}

const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const missingCsv = ["family_id,name_en,source_category,image_filename", ...missingImages.map((row) => [row.family_id, row.name_en, row.source_category, row.image_filename].map(escapeCsv).join(","))].join("\n");
await fs.writeFile(path.join(reportDirectory, "vault-missing-images.csv"), missingCsv);
const reviewCsv = ["family_id,name_en,source_category,proposed_category", ...categoryReview.map((row) => [row.family_id, row.name_en, row.source_category, row.proposed_category].map(escapeCsv).join(","))].join("\n");
await fs.writeFile(path.join(reportDirectory, "vault-category-review.csv"), reviewCsv);

console.log(JSON.stringify({ categories: categories.length, products: productRows.length, variants: variantRows.length, uploadedImages, missingImages: missingImages.length, categoryReview: categoryReview.length, deletedStaleProducts: staleProductIds.length, removedStorageObjects }, null, 2));
