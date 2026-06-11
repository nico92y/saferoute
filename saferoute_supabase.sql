-- ============================================================
-- SafeRoute — Schéma Supabase (avec comptes utilisateurs)
-- À coller dans : Supabase → SQL Editor → New query → Run
-- Idempotent : ré-exécutable sans perdre les données existantes.
-- ============================================================

create extension if not exists pgcrypto;

-- 0) Utilisateurs (comptes) ----------------------------------
-- Chaque personne se connecte avec son e-mail ; ses contacts et
-- ses trajets lui sont reliés via user_id.
create table if not exists public.utilisateurs (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nom text default '',
  created_at timestamptz default now()
);

-- 1) Contacts d'urgence --------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  relation text default '',
  telephone text default '',
  prioritaire boolean default false,
  user_id uuid references public.utilisateurs(id) on delete cascade,
  created_at timestamptz default now()
);
-- Migration des bases existantes : ajoute la colonne si absente
alter table public.contacts
  add column if not exists user_id uuid references public.utilisateurs(id) on delete cascade;
create index if not exists contacts_user_id_idx on public.contacts(user_id);

-- 2) Historique des trajets ----------------------------------
create table if not exists public.trajets (
  id uuid primary key default gen_random_uuid(),
  depart text,
  arrivee text,
  duree_min integer,
  distance_km numeric,
  type text default 'securise', -- 'securise' ou 'direct'
  user_id uuid references public.utilisateurs(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.trajets
  add column if not exists user_id uuid references public.utilisateurs(id) on delete cascade;
create index if not exists trajets_user_id_idx on public.trajets(user_id);

-- 3) Signalements communautaires (partagés par tous) ---------
create table if not exists public.signalements (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  motif text not null,
  description text default '',
  created_at timestamptz default now()
);

-- RLS : accès ouvert pour la démo (clé publishable / rôle anon)
alter table public.utilisateurs  enable row level security;
alter table public.contacts      enable row level security;
alter table public.trajets       enable row level security;
alter table public.signalements  enable row level security;

drop policy if exists "demo_all" on public.utilisateurs;
create policy "demo_all" on public.utilisateurs
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "demo_all" on public.contacts;
create policy "demo_all" on public.contacts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "demo_all" on public.trajets;
create policy "demo_all" on public.trajets
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "demo_all" on public.signalements;
create policy "demo_all" on public.signalements
  for all to anon, authenticated using (true) with check (true);

-- Données de démarrage des signalements (uniquement si vides) -
-- Les contacts de démo ne sont plus insérés globalement : ils sont
-- créés par l'app pour chaque compte au premier login.
insert into public.signalements (lat, lng, motif, description)
select * from (values
  (48.8443, 2.3479, 'Rue peu éclairée',     'Lampadaires éteints après 22h'),
  (48.8466, 2.3556, 'Rue déserte la nuit',  '')
) as v(lat, lng, motif, description)
where not exists (select 1 from public.signalements);

-- Zones dangereuses du nord de Paris (18e / 19e) -------------
-- Insérées seulement si elles ne sont pas déjà présentes.
insert into public.signalements (lat, lng, motif, description)
select * from (values
  (48.89815, 2.35965, 'Rue déserte la nuit',  'Porte de la Chapelle — secteur isolé et sombre après 22h'),
  (48.88945, 2.36025, 'Rue peu éclairée',     'Rue Marx Dormoy — plusieurs lampadaires hors service'),
  (48.88375, 2.36985, 'Harcèlement de rue',   'Abords de la place de la Bataille-de-Stalingrad la nuit'),
  (48.89785, 2.34435, 'Rue déserte la nuit',  'Porte de Clignancourt — zone déserte après fermeture des puces'),
  (48.88705, 2.35205, 'Rue peu éclairée',     'Goutte d''Or — éclairage faible autour du square Léon'),
  (48.89855, 2.37045, 'Rue déserte la nuit',  'Quartier Macdonald / Rosa Parks — passages non éclairés')
) as v(lat, lng, motif, description)
where not exists (
  select 1 from public.signalements s
  where abs(s.lat - 48.89815) < 0.0005 and abs(s.lng - 2.35965) < 0.0005
);
