alter table public.products
  add column if not exists retail_visible boolean not null default true;

comment on column public.products.retail_visible is
  'Controls whether a product is visible in the public retail catalog. B2B-only products remain available in the authenticated restaurant catalog.';

update public.products
set retail_visible = coalesce(source_status, 'formal_catalog') <> 'wholesale_inquiry';

update public.products
set featured = false;

update public.products
set featured = true
where slug in (
  'fish-fillet--salmon-fillet',
  'fish-fillet--chilean-cod-steak',
  'whole-fish--golden-pomfret',
  'whole-fish--seabass',
  'whole-fish--black-pomfret',
  'fish-fillet--grouper-fish-fillet',
  'fish-fillet--halibut-fillet',
  'fish-fillet--seabass-fillet'
)
and retail_visible = true;

create index if not exists products_public_catalog_order_idx
  on public.products (active, retail_visible, public_price nulls last, name_en);

create index if not exists products_featured_retail_idx
  on public.products (featured, retail_visible, active)
  where featured = true and retail_visible = true and active = true;
