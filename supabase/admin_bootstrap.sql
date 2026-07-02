-- 1. Create the first owner in Supabase Dashboard > Authentication > Users.
-- 2. Copy that user's UUID and replace the value below.
-- 3. Run this once in Supabase SQL Editor.

insert into public.profiles (id, role, display_name, phone)
values (
  'REPLACE_WITH_SUPABASE_AUTH_USER_UUID',
  'admin',
  'FAMFOOD Owner',
  null
)
on conflict (id) do update
set role = 'admin',
    display_name = excluded.display_name,
    phone = excluded.phone;
