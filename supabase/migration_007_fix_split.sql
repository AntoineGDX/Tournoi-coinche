-- C'EST COINCHÉ ! — migration 007 : corrige split_partner_team
-- À exécuter dans Supabase → SQL Editor → New query → Run.
--
-- L'ancienne version de split_partner_team (select ... into partner puis
-- update conditionnel) ne mettait pas à jour la fiche du binôme dans
-- certains cas. Nouvelle version : une seule requête update qui couvre
-- les deux fiches via leurs id.

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

-- Corrige la fiche restée associée suite au bug ci-dessus : repasse en solo
-- + recherche de binôme toute équipe encore "doublette" dont le binôme
-- (partner_team_id) est lui-même redevenu solo (partner_team_id = null).
update teams t set
  registration_type = 'solo',
  looking_for_partner = true,
  partner_team_id = null,
  team_name = ''
where t.partner_team_id is not null
  and exists (
    select 1 from teams p
    where p.id = t.partner_team_id and p.partner_team_id is null and p.registration_type = 'solo'
  );
