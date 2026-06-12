-- C'EST COINCHÉ ! — schéma Supabase
-- À exécuter une seule fois dans Supabase → SQL Editor → New query → Run.

-- ============================================================
-- Équipes (1 ligne = 1 doublette = 1 compte)
-- ============================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  team_name text not null,
  player1_name text not null,
  player2_name text not null,
  email text not null,
  email2 text,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid')),
  created_at timestamptz not null default now()
);

alter table teams enable row level security;

create policy "select own team" on teams
  for select using (auth.uid() = user_id);

create policy "insert own team" on teams
  for insert with check (auth.uid() = user_id);

create policy "update own team" on teams
  for update using (auth.uid() = user_id);

-- ============================================================
-- Vue publique : juste les noms d'équipe (page "équipes inscrites")
-- ============================================================
create view teams_public as
  select team_name, created_at from teams order by created_at;

grant select on teams_public to anon, authenticated;

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
