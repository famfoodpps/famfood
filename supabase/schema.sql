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
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

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
  business_name text not null default 'FAMFOOD Product Enterprise',
  address text,
  email text,
  whatsapp text,
  whatsapp_international text,
  map_query text,
  updated_at timestamptz not null default now()
);

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
  address,
  email,
  whatsapp,
  whatsapp_international,
  map_query
) values (
  'FAMFOOD',
  'FAMFOOD Product Enterprise',
  '15, Jalan Ensing Timur, 93250 Kuching, Sarawak, Malaysia',
  'famfpe@gmail.com',
  '011-1246 0284',
  '601112460284',
  '15, Jalan Ensing Timur, 93250 Kuching, Sarawak, Malaysia'
) on conflict do nothing;

insert into public.categories (slug, name_en, name_zh, description_en, description_zh, image_url, sort_order)
values
  ('japanese-products', 'Japanese Products', '日式产品', 'Unagi, sushi toppings, sashimi ingredients and Japanese restaurant essentials.', '蒲烧鳗鱼、寿司配料、刺身食材与日式餐厅常备品。', '/famfood-assets/497638812_18059586122513729_3570255470813858596_n.webp', 1),
  ('seafood', 'Seafood', '海鲜', 'Frozen prawns, scallop, squid, crab, fish and premium seafood supply.', '冷冻虾、带子、鱿鱼、蟹肉、鱼类与高级海鲜供应。', '/famfood-assets/497812300_18059587145513729_7460572064932794637_n.webp', 2),
  ('frozen-food', 'Frozen Food', '冷冻食品', 'Convenient frozen meats and kitchen staples for homes and food businesses.', '适合家庭与餐饮业的冷冻肉类及厨房常备食品。', '/famfood-assets/476398550_18048900926513729_1554981993386280179_n.webp', 3)
on conflict (slug) do nothing;
