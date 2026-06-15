-- C'EST COINCHÉ ! — schéma Supabase
-- À exécuter une seule fois dans Supabase → SQL Editor → New query → Run.

-- ============================================================
-- Équipes (1 ligne = 1 doublette, ou 1 joueur solo en recherche de binôme)
-- user_id est optionnel : permet de s'inscrire sans créer de compte
-- (guest checkout), uniquement pour les doublettes déjà complètes.
-- ============================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  team_name text not null,
  player1_name text not null,
  player2_name text,
  email text not null,
  email2 text,
  registration_type text not null default 'doublette' check (registration_type in ('solo','doublette')),
  looking_for_partner boolean not null default false,
  notify_binome_requests boolean not null default true,
  partner_bio text,
  partner_level text check (partner_level in ('debutant','intermediaire','avance')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid')),
  partner_team_id uuid references teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table teams enable row level security;

create policy "select own team" on teams
  for select using (auth.uid() = user_id);

-- Fonction security definer pour éviter la récursion RLS (une policy sur
-- `teams` ne doit pas faire de sous-requête directe sur `teams`).
create or replace function my_partner_team_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select partner_team_id from teams where user_id = auth.uid()
$$;

-- Permet à chacun des deux membres d'une doublette associée de voir la fiche de son binôme
create policy "select partner team" on teams
  for select using (id = my_partner_team_id());

create policy "insert own team" on teams
  for insert with check (auth.uid() = user_id);

create policy "insert guest team" on teams
  for insert to anon with check (user_id is null and registration_type = 'doublette');

create policy "update own team" on teams
  for update using (auth.uid() = user_id);

-- ============================================================
-- Vue publique : noms d'équipe + type d'inscription (page "équipes inscrites")
-- ============================================================
create view teams_public as
  select id, team_name, created_at, registration_type, looking_for_partner, partner_team_id from teams order by created_at;

grant select on teams_public to anon, authenticated;

-- ============================================================
-- Espace binôme : joueurs solo en recherche de binôme
-- ============================================================
create view solo_seekers as
  select id, team_name, player1_name, partner_bio, partner_level, created_at from teams
  where registration_type = 'solo' and looking_for_partner = true;

grant select on solo_seekers to authenticated;

-- ============================================================
-- Admins (gérée manuellement par l'organisateur via le Table Editor)
-- ============================================================
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table admins enable row level security;

create policy "anyone can check admin" on admins
  for select using (true);

-- Permet à un admin de marquer un paiement reçu, même sur l'équipe d'un autre
create policy "admins can update any team" on teams
  for update using (exists (select 1 from admins a where a.user_id = auth.uid()));

-- Permet à un admin de voir la liste complète des équipes (page admin)
create policy "admins can select all teams" on teams
  for select using (exists (select 1 from admins a where a.user_id = auth.uid()));

-- ============================================================
-- Arbre du tournoi
-- ============================================================
create table matches (
  id uuid primary key default gen_random_uuid(),
  round_name text not null,
  round_order int not null,
  match_order int not null,
  team1_name text default '',
  team2_name text default '',
  score1 int,
  score2 int
);

alter table matches enable row level security;

create policy "anyone can view matches" on matches
  for select using (true);

create policy "admins can write matches" on matches
  for all using (exists (select 1 from admins a where a.user_id = auth.uid()));

-- Tableau initial (4 tours / 8 équipes max). Ajuste/duplique les lignes
-- "8èmes de finale" si tu as plus de 8 équipes le jour J.
insert into matches (round_name, round_order, match_order) values
  ('8èmes de finale', 1, 1),
  ('8èmes de finale', 1, 2),
  ('8èmes de finale', 1, 3),
  ('8èmes de finale', 1, 4),
  ('Quarts de finale', 2, 1),
  ('Quarts de finale', 2, 2),
  ('Demi-finale', 3, 1),
  ('Finale', 4, 1);

-- ============================================================
-- Demandes d'association entre joueurs solo (espace binôme)
-- ============================================================
create table partner_requests (
  id uuid primary key default gen_random_uuid(),
  from_team_id uuid not null references teams(id) on delete cascade,
  to_team_id uuid not null references teams(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now()
);

-- Une seule demande "pending" à la fois entre deux équipes données — mais on
-- peut en proposer une nouvelle après une séparation, un refus ou une annulation.
create unique index partner_requests_pending_unique on partner_requests(from_team_id, to_team_id) where status = 'pending';

alter table partner_requests enable row level security;

create policy "select own requests" on partner_requests
  for select using (
    exists (select 1 from teams t where t.id = from_team_id and t.user_id = auth.uid())
    or exists (select 1 from teams t where t.id = to_team_id and t.user_id = auth.uid())
  );

create policy "insert own request" on partner_requests
  for insert with check (
    exists (
      select 1 from teams t
      where t.id = from_team_id and t.user_id = auth.uid()
        and t.registration_type = 'solo' and t.looking_for_partner = true
    )
  );

create policy "update own or received request" on partner_requests
  for update using (
    exists (select 1 from teams t where t.id = from_team_id and t.user_id = auth.uid())
    or exists (select 1 from teams t where t.id = to_team_id and t.user_id = auth.uid())
  );

-- Permet à l'admin de voir toutes les demandes de binôme
create policy "admins can select all partner requests" on partner_requests
  for select using (exists (select 1 from admins a where a.user_id = auth.uid()));

-- ============================================================
-- Acceptation d'une demande : associe les deux fiches solo en une doublette
-- (les deux fiches sont conservées et restent liées via partner_team_id,
-- chacun gardant son propre compte/paiement)
-- ============================================================
create or replace function accept_partner_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req partner_requests%rowtype;
  to_team teams%rowtype;
  from_team teams%rowtype;
  new_name text;
  n int := 1;
begin
  select * into req from partner_requests where id = request_id and status = 'pending';
  if req is null then
    raise exception 'Demande introuvable ou déjà traitée';
  end if;

  select * into to_team from teams where id = req.to_team_id;
  if to_team.user_id is distinct from auth.uid() then
    raise exception 'Non autorisé';
  end if;

  select * into from_team from teams where id = req.from_team_id;

  loop
    new_name := 'MIX ' || n;
    exit when not exists (select 1 from teams where team_name = new_name);
    n := n + 1;
  end loop;

  update teams set
    registration_type = 'doublette',
    looking_for_partner = false,
    partner_team_id = from_team.id,
    team_name = new_name
  where id = to_team.id;

  update teams set
    registration_type = 'doublette',
    looking_for_partner = false,
    partner_team_id = to_team.id,
    team_name = new_name
  where id = from_team.id;

  update partner_requests set status = 'accepted' where id = request_id;
  update partner_requests set status = 'cancelled'
    where status = 'pending' and id <> request_id
    and (from_team_id in (to_team.id, from_team.id) or to_team_id in (to_team.id, from_team.id));
end;
$$;

grant execute on function accept_partner_request(uuid) to authenticated;

-- ============================================================
-- Séparation d'une doublette associée : chacun redevient solo
-- et repart en recherche de binôme (les deux fiches sont conservées)
-- ============================================================
create or replace function split_partner_team()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid;
  partner_id uuid;
begin
  select id, partner_team_id into my_id, partner_id from teams where user_id = auth.uid();
  if my_id is null or partner_id is null then
    raise exception 'Pas de binôme à séparer';
  end if;

  update teams set
    registration_type = 'solo',
    looking_for_partner = true,
    partner_team_id = null,
    team_name = ''
  where id in (my_id, partner_id);

  update partner_requests set status = 'cancelled'
    where status = 'pending'
    and (from_team_id in (my_id, partner_id) or to_team_id in (my_id, partner_id));
end;
$$;

grant execute on function split_partner_team() to authenticated;

-- ============================================================
-- Renomme l'équipe : propage le nom à la fiche du binôme associé
-- (pour que les deux fiches gardent le même nom d'équipe)
-- ============================================================
create or replace function rename_team(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_team teams%rowtype;
begin
  select * into my_team from teams where user_id = auth.uid();
  if my_team is null then
    raise exception 'Équipe introuvable';
  end if;

  update teams set team_name = new_name where id = my_team.id;

  if my_team.partner_team_id is not null then
    update teams set team_name = new_name where id = my_team.partner_team_id;
  end if;
end;
$$;

grant execute on function rename_team(text) to authenticated;

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

-- Bucket de stockage pour les visuels produits (images uploadées par l'admin)
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
