-- Run this once in Supabase: Project > SQL Editor > New query > paste > Run

create extension if not exists "pgcrypto";

create table if not exists creatives (
  id uuid primary key default gen_random_uuid(),
  ad_name text not null,
  meta_ad_id text,
  page text,
  date_launched date,
  script text,
  concept_link text,
  tags text[] default '{}',
  concept_creator text,
  editor text,
  submitted_by text not null,
  submitted_at timestamptz default now(),
  editing_done boolean default false,
  launched boolean default false,
  winner_status text default 'pending',
  performance jsonb
);

create table if not exists pages (
  id text primary key,
  label text not null
);

alter table creatives enable row level security;
alter table pages enable row level security;

-- The API routes use the service_role key server-side, which bypasses RLS,
-- so no policies are required for this app to work. Add policies here only
-- if you later want the browser to talk to Supabase directly with the anon key.
