-- C'EST COINCHÉ ! — migration 002
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- Ajoute : inscription "solo" (recherche de binôme), inscription sans compte
-- (guest checkout), et l'espace de recherche de binôme.

-- ============================================================
-- Équipes : compte optionnel, joueur 2 optionnel, type d'inscription
-- ============================================================
alter table teams alter column user_id drop not null;
alter table teams alter column player2_name drop not null;

alter table teams add column registration_type text not null default 'doublette'
  check (registration_type in ('solo','doublette'));

alter table teams add column looking_for_partner boolean not null default false;

-- Inscription sans compte (guest checkout) : uniquement pour les doublettes
-- déjà complètes (le solo nécessite un compte pour la recherche de binôme).
create policy "insert guest team" on teams
  for insert to anon with check (user_id is null and registration_type = 'doublette');

-- ============================================================
-- Vue publique : ajoute le type d'inscription (badge "cherche un binôme")
-- ============================================================
drop view if exists teams_public;

create view teams_public as
  select team_name, created_at, registration_type, looking_for_partner from teams order by created_at;

grant select on teams_public to anon, authenticated;

-- ============================================================
-- Espace binôme : liste des joueurs solo en recherche
-- ============================================================
create view solo_seekers as
  select id, team_name, player1_name, created_at from teams
  where registration_type = 'solo' and looking_for_partner = true;

grant select on solo_seekers to authenticated;

-- ============================================================
-- Demandes d'association entre joueurs solo
-- ============================================================
create table partner_requests (
  id uuid primary key default gen_random_uuid(),
  from_team_id uuid not null references teams(id) on delete cascade,
  to_team_id uuid not null references teams(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  unique(from_team_id, to_team_id)
);

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

-- ============================================================
-- Acceptation d'une demande : fusionne les deux solos en une doublette
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

  update teams set
    player2_name = from_team.player1_name,
    email2 = coalesce(to_team.email2, from_team.email),
    registration_type = 'doublette',
    looking_for_partner = false,
    payment_status = case
      when to_team.payment_status = 'paid' and from_team.payment_status = 'paid' then 'paid'
      else 'pending'
    end
  where id = to_team.id;

  delete from teams where id = from_team.id;

  update partner_requests set status = 'accepted' where id = request_id;
  update partner_requests set status = 'cancelled'
    where status = 'pending' and id <> request_id
    and (from_team_id in (to_team.id, from_team.id) or to_team_id in (to_team.id, from_team.id));
end;
$$;

grant execute on function accept_partner_request(uuid) to authenticated;
