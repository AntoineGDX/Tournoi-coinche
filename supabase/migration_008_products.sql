-- C'EST COINCHÉ ! — migration 008 : table produits du shop + stockage des visuels
-- À exécuter dans Supabase → SQL Editor → New query → Run.

-- ============================================================
-- Produits du shop
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price numeric not null,
  description text,
  sizes text[] not null default '{}',
  image_url text,
  visual_bg text default 'y',      -- fallback si pas d'image : 'y' jaune / 'n' noir / 'w' blanc
  visual_text text,                -- fallback : texte stylisé (ex: "C'est<br>coinché.")
  visual_subtitle text,            -- fallback : sous-titre (ex: "Nice · 109 · 1ère édition")
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "anyone can view products" on products
  for select using (true);

create policy "admins can manage products" on products
  for all using (exists (select 1 from admins a where a.user_id = auth.uid()));

-- ============================================================
-- Bucket de stockage pour les visuels produits (images uploadées par l'admin)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "anyone can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "admins can manage product images" on storage.objects
  for all using (
    bucket_id = 'product-images'
    and exists (select 1 from admins a where a.user_id = auth.uid())
  );
