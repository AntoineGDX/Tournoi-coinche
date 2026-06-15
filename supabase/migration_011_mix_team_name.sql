-- ============================================================
-- Quand deux joueur·euses solo s'associent, le nom d'équipe (vide)
-- est remplacé automatiquement par "MIX N" (N = premier numéro libre)
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
