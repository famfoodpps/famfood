# FAMFOOD New Webapp

Fresh Next.js full-stack webapp for FAMFOOD Enterprise.

## Included

- Premium public catalog website inspired by the provided sample website.
- GSAP scroll reveals, Swiper hero slider, rolling brand text, animated category tabs, product hover motion.
- English / Chinese language toggle.
- Public product browsing, detail pages, cart, database order submission and WhatsApp handoff.
- Restaurant portal with product list, quick order, cart submission, order history and account details.
- Admin dashboard for products, categories, orders, restaurant customers, pricing, settings and image edit/upload preview.
- Supabase schema with Auth roles, RLS policies, storage bucket and starter rows.

## Run Locally

```bash
npm install
npm run dev
```

Demo admin:

```text
admin@famfood.local
admin123
```

Demo restaurant:

```text
restaurant@demo.com
restaurant123
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Create Supabase Auth users for admin and restaurant accounts.
6. Insert matching rows into `profiles` with role `admin` or `restaurant`.
7. Link restaurant auth users to `restaurant_customers.user_id`.

Without Supabase keys, the app stays usable in local demo mode using seed data and localStorage.
