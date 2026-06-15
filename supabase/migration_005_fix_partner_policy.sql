-- C'EST COINCHÉ ! — migration 005 : corrige la récursion RLS sur `teams`
-- À exécuter dans Supabase → SQL Editor → New query → Run.
--
-- La policy "select partner team" ajoutée par la migration 004 fait une
-- sous-requête sur `teams` à l'intérieur d'une policy de `teams`, ce qui
-- provoque "infinite recursion detected in policy for relation teams" et
-- casse silencieusement toute lecture de `teams` (mon-equipe.html affiche
-- alors "Pas encore de doublette" même quand la fiche existe).

drop policy if exists "select partner team" on teams;

-- Fonction security definer pour éviter la récursion RLS
create or replace function my_partner_team_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select partner_team_id from teams where user_id = auth.uid()
$$;

create policy "select partner team" on teams
  for select using (id = my_partner_team_id());
