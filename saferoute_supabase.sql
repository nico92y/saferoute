-- ============================================================
-- SafeRoute — Schéma Supabase
-- À coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Contacts d'urgence
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  relation text default '',
  telephone text default '',
  prioritaire boolean default false,
  created_at timestamptz default now()
);

-- 2) Historique des trajets
create table if not exists public.trajets (
  id uuid primary key default gen_random_uuid(),
  depart text,
  arrivee text,
  duree_min integer,
  distance_km numeric,
  type text default 'securise', -- 'securise' ou 'direct'
  created_at timestamptz default now()
);

-- 3) Signalements communautaires
create table if not exists public.signalements (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  motif text not null,
  description text default '',
  created_at timestamptz default now()
);

-- RLS : accès ouvert pour la démo (clé publishable / rôle anon)
alter table public.contacts enable row level security;
alter table public.trajets enable row level security;
alter table public.signalements enable row level security;

drop policy if exists "demo_all" on public.contacts;
create policy "demo_all" on public.contacts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "demo_all" on public.trajets;
create policy "demo_all" on public.trajets
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "demo_all" on public.signalements;
create policy "demo_all" on public.signalements
  for all to anon, authenticated using (true) with check (true);

-- Données de démarrage (uniquement si la table est vide)
insert into public.contacts (nom, relation, telephone, prioritaire)
select * from (values
  ('Léa',   'Sœur', '+33 6 12 34 56 78', true),
  ('Maman', 'Mère', '+33 6 98 76 54 32', true),
  ('Karim', 'Ami',  '+33 7 45 21 09 87', false)
) as v(nom, relation, telephone, prioritaire)
where not exists (select 1 from public.contacts);

insert into public.signalements (lat, lng, motif, description)
select * from (values
  (48.8443, 2.3479, 'Rue peu éclairée', 'Lampadaires éteints après 22h'),
  (48.8466, 2.3556, 'Rue déserte la nuit', '')
) as v(lat, lng, motif, description)
where not exists (select 1 from public.signalements);
