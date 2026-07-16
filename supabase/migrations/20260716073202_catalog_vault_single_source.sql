-- FAMFOOD vault catalog migration.
-- Keeps the existing tables compatible while adding nullable Ask Price fields,
-- normalized product variants, and the indexes required by server pagination.

alter table public.products
  alter column public_price drop not null,
  alter column public_price drop default,
  alter column restaurant_price drop not null,
  alter column restaurant_price drop default;

alter table public.products add column if not exists source_status text not null default 'formal_catalog';
alter table public.products add column if not exists source_category text;
alter table public.products add column if not exists image_storage_path text;
alter table public.categories add column if not exists image_storage_path text;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_key text not null,
  code text,
  specification text not null,
  price_unit text,
  retail_price numeric(10, 2),
  promotion_price numeric(10, 2),
  restaurant_price numeric(10, 2),
  effective_date text,
  source text,
  source_page integer,
  source_row text,
  brand_or_section text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, variant_key)
);

alter table public.order_items add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists product_specification text;

create index if not exists products_active_created_at_idx on public.products (active, created_at desc);
create index if not exists products_category_active_idx on public.products (category_id, active);
create index if not exists products_name_en_search_idx on public.products using gin (to_tsvector('simple', coalesce(name_en, '')));
create index if not exists product_variants_product_active_idx on public.product_variants (product_id, active, sort_order);

alter table public.product_variants enable row level security;

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants for select
to anon, authenticated
using (
  active = true
  and exists (
    select 1 from public.products
    where products.id = product_variants.product_id
      and products.active = true
  )
);

drop policy if exists "Admins manage product variants" on public.product_variants;
create policy "Admins manage product variants"
on public.product_variants for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

grant select on public.categories, public.products, public.product_variants, public.business_settings to anon;
grant select on public.categories, public.products, public.product_variants, public.business_settings to authenticated;
grant all on public.categories, public.products, public.product_variants, public.product_images to service_role;

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.current_app_role() = 'admin')
with check (bucket_id = 'product-images' and public.current_app_role() = 'admin');

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.current_app_role() = 'admin');
