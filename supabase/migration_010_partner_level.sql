-- ============================================================
-- Espace binôme : niveau déclaré (pour filtrer/trier les joueur·euses
-- en recherche de binôme)
-- ============================================================
alter table teams add column partner_level text check (partner_level in ('debutant','intermediaire','avance'));

drop view solo_seekers;

create view solo_seekers as
  select id, team_name, player1_name, partner_bio, partner_level, created_at from teams
  where registration_type = 'solo' and looking_for_partner = true;

grant select on solo_seekers to authenticated;
