-- C'EST COINCHÉ ! — migration 003
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- Ajoute la préférence de notification par équipe et l'accès admin
-- aux demandes de binôme (partner_requests).

-- ============================================================
-- Préférence de notification email (espace binôme), par équipe/compte
-- ============================================================
alter table teams add column notify_binome_requests boolean not null default true;

-- ============================================================
-- Permet à l'admin de voir toutes les demandes de binôme
-- ============================================================
create policy "admins can select all partner requests" on partner_requests
  for select using (exists (select 1 from admins a where a.user_id = auth.uid()));
