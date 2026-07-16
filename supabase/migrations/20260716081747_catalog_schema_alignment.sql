-- Align older production category tables with the current admin/catalog model.
alter table public.categories add column if not exists group_en text;
alter table public.categories add column if not exists group_zh text;
alter table public.categories add column if not exists classification_keywords text[] not null default '{}';

notify pgrst, 'reload schema';
