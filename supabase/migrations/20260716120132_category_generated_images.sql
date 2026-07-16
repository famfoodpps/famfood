update public.categories as category
set image_url = generated.image_url
from (
  values
    ('special-promotion-sales', '/famfood-assets/categories/generated/special-promotion-sales.webp'),
    ('whole-fish', '/famfood-assets/categories/generated/whole-fish.webp'),
    ('fish-fillet', '/famfood-assets/categories/generated/fish-fillet.webp'),
    ('sea-cucumber', '/famfood-assets/categories/generated/sea-cucumber.webp'),
    ('prawn', '/famfood-assets/categories/generated/prawn.webp'),
    ('squid', '/famfood-assets/categories/generated/squid.webp'),
    ('prawn-squid', '/famfood-assets/categories/generated/prawn-squid.webp'),
    ('shell', '/famfood-assets/categories/generated/shell.webp'),
    ('crab', '/famfood-assets/categories/generated/crab.webp'),
    ('scallop', '/famfood-assets/categories/generated/scallop.webp'),
    ('meat-series', '/famfood-assets/categories/generated/meat-series.webp'),
    ('chicken', '/famfood-assets/categories/generated/chicken.webp'),
    ('beef', '/famfood-assets/categories/generated/beef.webp'),
    ('buffalo', '/famfood-assets/categories/generated/buffalo.webp'),
    ('lamb', '/famfood-assets/categories/generated/lamb.webp'),
    ('duck', '/famfood-assets/categories/generated/duck.webp'),
    ('soup', '/famfood-assets/categories/generated/soup.webp'),
    ('japanese', '/famfood-assets/categories/generated/japanese.webp'),
    ('steamboat', '/famfood-assets/categories/generated/steamboat.webp'),
    ('others', '/famfood-assets/categories/generated/others.webp'),
    ('seasonings-sauces', '/famfood-assets/categories/generated/seasonings-sauces.webp'),
    ('vegetarian', '/famfood-assets/categories/generated/vegetarian.webp'),
    ('fruits', '/famfood-assets/categories/generated/fruits.webp'),
    ('ice-cream', '/famfood-assets/categories/generated/ice-cream.webp'),
    ('fresh-juice', '/famfood-assets/categories/generated/fresh-juice.webp')
) as generated(slug, image_url)
where category.slug = generated.slug;
