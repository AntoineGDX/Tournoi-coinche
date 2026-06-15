-- C'EST COINCHÉ ! — migration 004 : doublettes associées (deux fiches liées)
-- À exécuter dans Supabase → SQL Editor → New query → Run.
--
-- Change de modèle : quand deux comptes solo s'associent, on ne fusionne plus
-- les deux fiches (l'une d'elles n'était alors supprimée). On les lie via
-- partner_team_id, chacun gardant son propre compte/paiement, et chacun peut
-- ensuite se "séparer" pour redevenir solo et chercher un nouveau binôme.

alter table teams add column if not exists partner_team_id uuid references teams(id) on delete set null;

-- Permet à chacun des deux membres d'une doublette associée de voir la fiche de son binôme
drop policy if exists "select partner team" on teams;
create policy "select partner team" on teams
  for select using (
    exists (select 1 from teams mine where mine.user_id = auth.uid() and mine.partner_team_id = teams.id)
  );

-- Vue publique : ajoute id + partner_team_id (pour dédupliquer les paires côté client)
drop view if exists teams_public;
create view teams_public as
  select id, team_name, created_at, registration_type, looking_for_partner, partner_team_id from teams order by created_at;

grant select on teams_public to anon, authenticated;

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
    registration_type = 'doublette',
    looking_for_partner = false,
    partner_team_id = from_team.id,
    team_name = to_team.team_name
  where id = to_team.id;

  update teams set
    registration_type = 'doublette',
    looking_for_partner = false,
    partner_team_id = to_team.id,
    team_name = to_team.team_name
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
  my_team teams%rowtype;
  partner teams%rowtype;
begin
  select * into my_team from teams where user_id = auth.uid();
  if my_team is null or my_team.partner_team_id is null then
    raise exception 'Pas de binôme à séparer';
  end if;

  select * into partner from teams where id = my_team.partner_team_id;

  update teams set
    registration_type = 'solo',
    looking_for_partner = true,
    partner_team_id = null,
    team_name = player1_name
  where id = my_team.id;

  if partner is not null then
    update teams set
      registration_type = 'solo',
      looking_for_partner = true,
      partner_team_id = null,
      team_name = player1_name
    where id = partner.id;
  end if;

  update partner_requests set status = 'cancelled'
    where status = 'pending'
    and (from_team_id in (my_team.id, my_team.partner_team_id) or to_team_id in (my_team.id, my_team.partner_team_id));
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
