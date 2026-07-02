# FAMFOOD Production Deployment

## 1. Supabase

Create a Supabase project, then run:

1. `supabase/schema.sql` in Supabase SQL Editor.
2. Create the first owner user in Supabase Dashboard > Authentication > Users.
3. Copy that user's UUID.
4. Open `supabase/admin_bootstrap.sql`, replace `REPLACE_WITH_SUPABASE_AUTH_USER_UUID`, then run it in SQL Editor.

After deployment, login as the owner and click `Seed Catalog` once in Admin Dashboard to import the FAMFOOD starter categories/products.

Required values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Do not expose it in client-side code.

## 2. Vercel

Login with the correct Vercel account:

```bash
npx vercel logout
npx vercel login
npx vercel whoami
```

Deploy:

```bash
npx vercel --prod
```

Add the Supabase environment variables in Vercel Project Settings > Environment Variables before the final production deploy.

## 3. First Production Test

- Public product browse loads products.
- Public cart saves order to Supabase and opens WhatsApp.
- Owner login routes to `/admin`.
- `Seed Catalog` imports starter catalog.
- Admin creates a restaurant account.
- Restaurant login routes to `/restaurant`.
- Restaurant submits order.
- Admin sees and updates order status.
