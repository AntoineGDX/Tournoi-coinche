-- C'EST COINCHÉ ! — migration 006 : autorise une nouvelle demande de binôme
-- après une séparation / un refus / une annulation
-- À exécuter dans Supabase → SQL Editor → New query → Run.
--
-- La contrainte unique(from_team_id, to_team_id) bloquait toute nouvelle
-- demande entre deux équipes dès qu'une ligne (même accepted/declined/
-- cancelled) existait déjà entre elles — d'où l'erreur 409 lors d'une
-- nouvelle proposition après une séparation.

alter table partner_requests drop constraint if exists partner_requests_from_team_id_to_team_id_key;

create unique index if not exists partner_requests_pending_unique
  on partner_requests(from_team_id, to_team_id) where status = 'pending';
