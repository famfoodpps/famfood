create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('admin', 'restaurant');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum (
    'Pending',
    'Confirmed',
    'Preparing',
    'Ready',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.stock_status as enum ('In Stock', 'Limited', 'Pre-order', 'Out of Stock');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_zh text not null,
  description_en text,
  description_zh text,
  image_url text,
  group_en text,
  group_zh text,
  classification_keywords text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories add column if not exists group_en text;
alter table public.categories add column if not exists group_zh text;
alter table public.categories add column if not exists classification_keywords text[] not null default '{}';

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  sku text,
  name_en text not null,
  name_zh text not null,
  description_en text,
  description_zh text,
  image_url text,
  packing_en text,
  packing_zh text,
  weight text,
  moq_en text,
  moq_zh text,
  public_price numeric(10, 2) not null default 0,
  restaurant_price numeric(10, 2) not null default 0,
  stock_status public.stock_status not null default 'In Stock',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurant_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  restaurant_name text not null,
  legal_company_name text,
  pic_name text not null,
  phone text,
  email text,
  address text,
  company_registration_no text,
  tax_identification_no text,
  sst_registration_no text,
  e_invoice_email text,
  business_type text,
  billing_address text,
  billing_postcode text,
  billing_city text,
  billing_state text,
  billing_country text not null default 'Malaysia',
  payment_terms text not null default 'COD',
  login_enabled boolean not null default false,
  price_tier text not null default 'Standard Restaurant',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

alter table public.restaurant_customers add column if not exists legal_company_name text;
alter table public.restaurant_customers add column if not exists company_registration_no text;
alter table public.restaurant_customers add column if not exists tax_identification_no text;
alter table public.restaurant_customers add column if not exists sst_registration_no text;
alter table public.restaurant_customers add column if not exists e_invoice_email text;
alter table public.restaurant_customers add column if not exists business_type text;
alter table public.restaurant_customers add column if not exists billing_address text;
alter table public.restaurant_customers add column if not exists billing_postcode text;
alter table public.restaurant_customers add column if not exists billing_city text;
alter table public.restaurant_customers add column if not exists billing_state text;
alter table public.restaurant_customers add column if not exists billing_country text not null default 'Malaysia';
alter table public.restaurant_customers add column if not exists payment_terms text not null default 'COD';
alter table public.restaurant_customers add column if not exists login_enabled boolean not null default false;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('FO-' || floor(random() * 1000000)::text),
  restaurant_customer_id uuid references public.restaurant_customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  channel text not null check (channel in ('Public', 'Restaurant')),
  fulfillment text not null default 'Delivery',
  address text,
  preferred_date date,
  notes text,
  status public.order_status not null default 'Pending',
  total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null
);

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null default 'FAMFOOD',
  business_name text not null default 'FAMFOOD Enterprise',
  business_nature text,
  address text,
  email text,
  whatsapp text,
  whatsapp_international text,
  map_query text,
  opening_hours_weekday text,
  opening_hours_sunday text,
  facebook_url text,
  instagram_url text,
  updated_at timestamptz not null default now()
);

alter table public.business_settings add column if not exists business_nature text;
alter table public.business_settings add column if not exists opening_hours_weekday text;
alter table public.business_settings add column if not exists opening_hours_sunday text;
alter table public.business_settings add column if not exists facebook_url text;
alter table public.business_settings add column if not exists instagram_url text;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.restaurant_customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.business_settings enable row level security;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories for select
using (active = true or public.current_app_role() = 'admin');

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (active = true or public.current_app_role() in ('admin', 'restaurant'));

drop policy if exists "Public can read product images" on public.product_images;
create policy "Public can read product images"
on public.product_images for select
using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images"
on public.product_images for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "Admins manage restaurant customers" on public.restaurant_customers;
create policy "Admins manage restaurant customers"
on public.restaurant_customers for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "Restaurants read own customer row" on public.restaurant_customers;
create policy "Restaurants read own customer row"
on public.restaurant_customers for select
using (user_id = auth.uid());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "Restaurants read own orders" on public.orders;
create policy "Restaurants read own orders"
on public.orders for select
using (
  restaurant_customer_id in (
    select id from public.restaurant_customers where user_id = auth.uid()
  )
);

drop policy if exists "Restaurants create own orders" on public.orders;
create policy "Restaurants create own orders"
on public.orders for insert
with check (
  public.current_app_role() = 'restaurant'
  and restaurant_customer_id in (
    select id from public.restaurant_customers where user_id = auth.uid()
  )
);

drop policy if exists "Order items visible with visible orders" on public.order_items;
create policy "Order items visible with visible orders"
on public.order_items for select
using (
  order_id in (
    select id from public.orders
    where public.current_app_role() = 'admin'
      or restaurant_customer_id in (
        select id from public.restaurant_customers where user_id = auth.uid()
      )
  )
);

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
on public.order_items for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "Restaurants create order items for own orders" on public.order_items;
create policy "Restaurants create order items for own orders"
on public.order_items for insert
with check (
  order_id in (
    select id from public.orders
    where restaurant_customer_id in (
      select id from public.restaurant_customers where user_id = auth.uid()
    )
  )
);

drop policy if exists "Public can read business settings" on public.business_settings;
create policy "Public can read business settings"
on public.business_settings for select
using (true);

drop policy if exists "Admins manage business settings" on public.business_settings;
create policy "Admins manage business settings"
on public.business_settings for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public reads product images" on storage.objects;
create policy "Public reads product images"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
on storage.objects for insert
with check (bucket_id = 'product-images' and public.current_app_role() = 'admin');

insert into public.business_settings (
  brand_name,
  business_name,
  business_nature,
  address,
  email,
  whatsapp,
  whatsapp_international,
  map_query,
  opening_hours_weekday,
  opening_hours_sunday,
  facebook_url,
  instagram_url
)
select
  'FAMFOOD',
  'FAMFOOD Enterprise',
  'Seafoods and Juice Retails & Supplies',
  '15, Jalan Ensing Timur, Kuching, Malaysia, 93250 Kuching, Sarawak, Malaysia',
  'famfpe@gmail.com',
  '011-1246 0284',
  '601112460284',
  '15, Jalan Ensing Timur, Kuching, Malaysia, 93250 Kuching, Sarawak, Malaysia',
  'Monday - Saturday: 9:00 AM - 6:00 PM',
  'Sunday: 9:00 AM - 2:00 PM',
  'https://www.facebook.com/famfpe',
  'https://www.instagram.com/fppe9878/'
where not exists (select 1 from public.business_settings);

update public.business_settings
set
  brand_name = 'FAMFOOD',
  business_name = 'FAMFOOD Enterprise',
  business_nature = 'Seafoods and Juice Retails & Supplies',
  address = '15, Jalan Ensing Timur, Kuching, Malaysia, 93250 Kuching, Sarawak, Malaysia',
  email = 'famfpe@gmail.com',
  whatsapp = '011-1246 0284',
  whatsapp_international = '601112460284',
  map_query = '15, Jalan Ensing Timur, Kuching, Malaysia, 93250 Kuching, Sarawak, Malaysia',
  opening_hours_weekday = 'Monday - Saturday: 9:00 AM - 6:00 PM',
  opening_hours_sunday = 'Sunday: 9:00 AM - 2:00 PM',
  facebook_url = 'https://www.facebook.com/famfpe',
  instagram_url = 'https://www.instagram.com/fppe9878/',
  updated_at = now();

insert into public.categories (slug, name_en, name_zh, description_en, description_zh, image_url, group_en, group_zh, classification_keywords, sort_order, active)
values
  ('special-promotion-sales', 'Special Promotion Sales', '特别促销', 'Retail promotion products from the July 2026 catalog.', '来自 2026 年 7 月零售目录的促销产品。', '/famfood-assets/categories/generated/special-promotion-sales.webp', 'Retail Catalog', '零售目录', array['promotion', 'special promotion', 'offer'], 1, true),
  ('whole-fish', 'Whole Fish', '鱼', 'Whole fish and fish-head selections from the FAMFOOD catalogs.', 'FAMFOOD 目录里的整鱼与鱼头产品。', '/famfood-assets/categories/generated/whole-fish.webp', 'Seafood', '海鲜类', array['whole fish', 'fish head', 'pomfret', 'tilapia', 'salmon', 'seabass'], 2, true),
  ('fish-fillet', 'Fish Fillet', '鱼片', 'Fish fillet, fish slice, steak cut and prepared fish meat.', '鱼片、鱼切片、鱼扒与处理好的鱼肉。', '/famfood-assets/categories/generated/fish-fillet.webp', 'Seafood', '海鲜类', array['fillet', 'fish slice', 'fish meat', 'steak cut', 'fish paste'], 3, true),
  ('sea-cucumber', 'Sea Cucumber', '海参', 'Sea cucumber, fish lips, jellyfish and related soup ingredients.', '海参、鱼唇、海蜇与汤料相关食材。', '/famfood-assets/categories/generated/sea-cucumber.webp', 'Seafood', '海鲜类', array['sea cucumber', 'fish lips', 'jellyfish', 'shark fin'], 4, true),
  ('prawn', 'Prawn', '虾', 'Prawn, shrimp, lobster, crayfish and prawn meat.', '虾、虾仁、龙虾、小龙虾与虾肉。', '/famfood-assets/categories/generated/prawn.webp', 'Seafood', '海鲜类', array['prawn', 'shrimp', 'lobster', 'crayfish'], 5, true),
  ('squid', 'Squid', '鱿鱼', 'Squid, cuttlefish, octopus and squid cut products.', '鱿鱼、墨鱼、章鱼与鱿鱼切割产品。', '/famfood-assets/categories/generated/squid.webp', 'Seafood', '海鲜类', array['squid', 'cuttlefish', 'octopus', 'tentacle'], 6, true),
  ('prawn-squid', 'Prawn & Squid', '虾 & 鱿鱼', 'Retail prawn and squid products from the July 2026 catalog.', '2026 年 7 月零售目录中的虾与鱿鱼产品。', '/famfood-assets/categories/generated/prawn-squid.webp', 'Retail Catalog', '零售目录', array['prawn', 'shrimp', 'squid'], 7, true),
  ('shell', 'Shell', '贝壳类', 'Oyster, clam, mussel, abalone and shell seafood.', '生蚝、蛤、青口、鲍鱼与贝壳类海鲜。', '/famfood-assets/categories/generated/shell.webp', 'Seafood', '海鲜类', array['oyster', 'clam', 'mussel', 'abalone', 'shell'], 8, true),
  ('crab', 'Crab', '蟹', 'Crab, crab meat, crab claw and crab sticks.', '蟹、蟹肉、蟹钳与蟹柳产品。', '/famfood-assets/categories/generated/crab.webp', 'Seafood', '海鲜类', array['crab', 'crab meat', 'crab claw', 'crab stick'], 9, true),
  ('scallop', 'Scallop', '带子', 'Scallop, hotate and shell scallop products.', '带子、帆立贝与半壳带子产品。', '/famfood-assets/categories/generated/scallop.webp', 'Seafood', '海鲜类', array['scallop', 'hotate'], 10, true),
  ('meat-series', 'Meat Series', '肉类', 'Retail meat products including beef, lamb, chicken and duck items.', '零售目录中的牛肉、羊肉、鸡肉与鸭肉产品。', '/famfood-assets/categories/generated/meat-series.webp', 'Meat & Poultry', '肉类', array['meat', 'beef', 'lamb', 'chicken', 'duck'], 11, true),
  ('chicken', 'Chicken', '鸡肉', 'Chicken cuts and poultry products.', '鸡肉切割与家禽产品。', '/famfood-assets/categories/generated/chicken.webp', 'Meat & Poultry', '肉类', array['chicken'], 12, true),
  ('beef', 'Beef', '牛肉', 'Beef cuts, brisket, tenderloin, minced beef and beef rolls.', '牛肉切割、牛腩、牛柳、牛肉碎与牛肉卷。', '/famfood-assets/categories/generated/beef.webp', 'Meat & Poultry', '肉类', array['beef', 'steak', 'brisket', 'tenderloin'], 13, true),
  ('buffalo', 'Buffalo (Allana)', '水牛肉', 'Allana buffalo meat cuts from the wholesale catalog.', '批发目录中的 Allana 水牛肉切割。', '/famfood-assets/categories/generated/buffalo.webp', 'Meat & Poultry', '肉类', array['buffalo', 'allana'], 14, true),
  ('lamb', 'Lamb', '羊肉', 'Lamb slice, lamb chop and other lamb products.', '羊肉片、羊排与其他羊肉产品。', '/famfood-assets/categories/generated/lamb.webp', 'Meat & Poultry', '肉类', array['lamb slice', 'lamb chop', 'lamb'], 15, true),
  ('duck', 'Duck', '鸭肉', 'Duck cuts, smoked duck and prepared duck products.', '鸭肉切割、烟熏鸭与预制鸭肉产品。', '/famfood-assets/categories/generated/duck.webp', 'Meat & Poultry', '肉类', array['duck', 'smoked duck'], 16, true),
  ('soup', 'Soup', '汤', 'Soup ingredients from the retail catalog.', '零售目录中的汤类食材。', '/famfood-assets/categories/generated/soup.webp', 'Frozen & Ready Food', '冷冻 / 即食类', array['soup', 'fish lips', 'sea cucumber'], 17, true),
  ('japanese', 'Japanese', '日式', 'Japanese seafood, noodles, sauces and restaurant ingredients.', '日式海鲜、面类、酱料与餐厅食材。', '/famfood-assets/categories/generated/japanese.webp', 'Japanese', '日式', array['japanese', 'unagi', 'miso', 'sushi', 'wakame', 'ebi'], 18, true),
  ('steamboat', 'Steamboat', '火锅', 'Hotpot items, oden items, fish balls and soup-ready ingredients.', '火锅料、关东煮、鱼丸与汤品食材。', '/famfood-assets/categories/generated/steamboat.webp', 'Frozen & Ready Food', '冷冻 / 即食类', array['hotpot', 'oden', 'fish balls', 'steamboat'], 19, true),
  ('others', 'Others', '其他', 'Frozen ready food, snacks, dim sum, fries, buns and miscellaneous catalog items.', '冷冻即食、炸物、点心、薯条、包点与其他目录产品。', '/famfood-assets/categories/generated/others.webp', 'Frozen & Ready Food', '冷冻 / 即食类', array['others', 'fries', 'bun', 'dumpling', 'snack', 'sausage', 'mochi'], 20, true),
  ('seasonings-sauces', 'Seasonings & Sauces', '调味料 / 酱料', 'Sauce, seasoning, soup base and cooking support items.', '酱料、调味料、汤底与烹饪辅助产品。', '/famfood-assets/categories/generated/seasonings-sauces.webp', 'Cooking & Dry Items', '烹饪 / 干货类', array['sauce', 'seasoning', 'paste', 'pepper', 'miso'], 21, true),
  ('vegetarian', 'Vegetarian', '素食', 'Vegetarian products and meat-free food selections.', '素食产品与无肉食品选择。', '/famfood-assets/categories/generated/vegetarian.webp', 'Special Categories', '特别分类', array['vegetarian', 'meat-free', 'plant based'], 22, true),
  ('fruits', 'Fruits', '水果', 'Frozen fruits and berries from the wholesale catalog.', '批发目录中的冷冻水果与莓果。', '/famfood-assets/categories/generated/fruits.webp', 'Special Categories', '特别分类', array['fruits', 'berries', 'strawberry', 'blueberry'], 23, true),
  ('ice-cream', 'Ice-Cream', '冰淇淋', 'Ice-cream, sorbet and frozen dessert items.', '冰淇淋、雪葩与冷冻甜品。', '/famfood-assets/categories/generated/ice-cream.webp', 'Special Categories', '特别分类', array['ice cream', 'sorbet'], 24, true),
  ('fresh-juice', 'Fresh Juice', '鲜榨果汁', 'Fresh juice, smoothies and milkshake drinks.', '鲜榨果汁、冰沙与奶昔饮品。', '/famfood-assets/categories/generated/fresh-juice.webp', 'Special Categories', '特别分类', array['juice', 'smoothie', 'milkshake'], 25, true)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  description_en = excluded.description_en,
  description_zh = excluded.description_zh,
  image_url = excluded.image_url,
  group_en = excluded.group_en,
  group_zh = excluded.group_zh,
  classification_keywords = excluded.classification_keywords,
  sort_order = excluded.sort_order,
  active = excluded.active;

update public.categories
set active = false
where slug in (
  'japanese-products',
  'seafood',
  'juice-drinks',
  'sauces-seasoning',
  'promotion',
  'fish',
  'fillet',
  'oyster',
  'meat-poultry',
  'frozen-food',
  'finger-food',
  'steamboat-oden',
  'dim-sum-bun',
  'japanese-ingredients',
  'bbq',
  'cooking-essentials',
  'dessert',
  'halal-certified',
  'vegetable-fruits',
  'bundle-offer',
  'juice',
  'dry-item'
);
