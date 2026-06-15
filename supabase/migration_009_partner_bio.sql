-- ============================================================
-- Espace binôme : description libre pour aider à trouver un binôme
-- (âge, région, niveau, ambiance recherchée, etc.)
-- ============================================================
alter table teams add column partner_bio text;

create or replace view solo_seekers as
  select id, team_name, player1_name, partner_bio, created_at from teams
  where registration_type = 'solo' and looking_for_partner = true;
