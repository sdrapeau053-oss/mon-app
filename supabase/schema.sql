-- Schéma initial Supabase pour la migration progressive depuis localStorage.
-- À exécuter dans Supabase SQL Editor.

create table if not exists public.chapitres_tome1 (
  id text primary key,
  titre text,
  bloc integer,
  type text,
  statut text,
  contenu text,
  updated_at timestamp with time zone default now()
);

create table if not exists public.fragments (
  id text primary key,
  titre text,
  tome integer,
  chapitre text,
  contenu text,
  type text,
  statut text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.daily_system_entries (
  id text primary key,
  date text not null,
  hard_day boolean default false,
  note text,
  tasks jsonb default '[]'::jsonb,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

-- RLS peut être activé plus tard quand l'authentification sera définie.
-- Pour une app privée sans auth, éviter d'activer RLS tant que les policies ne sont pas prêtes.
