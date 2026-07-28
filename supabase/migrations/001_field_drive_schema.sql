-- Punch Logic Supabase schema
-- Run this in Supabase SQL Editor after creating a new project.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  display_name text,
  role text not null default 'foreman' check (role in ('admin', 'foreman')),
  created_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_site_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  primary key (user_id, site_id)
);

create table if not exists public.trade_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.location_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.item_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trade_id uuid references public.trade_settings(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, trade_id, name)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trade text,
  vendor text,
  job_desc text,
  contact_name text,
  email text,
  phone text,
  alternate_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts add column if not exists fields jsonb not null default '[]'::jsonb;

create table if not exists public.punch_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  location text,
  location_area text,
  location_detail text,
  trade text not null,
  item text not null,
  notes text,
  shared_note text,
  completed boolean not null default false,
  completed_at timestamptz,
  trade_completed boolean not null default false,
  trade_completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.punch_items(id) on delete cascade,
  storage_path text not null,
  file_name text,
  content_type text,
  created_at timestamptz not null default now()
);

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
$$;

create or replace function public.can_access_site(site_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_manager()
    or exists (
      select 1
      from public.user_site_access usa
      where usa.user_id = auth.uid()
        and usa.site_id = site_uuid
    )
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.user_site_access enable row level security;
alter table public.trade_settings enable row level security;
alter table public.location_settings enable row level security;
alter table public.item_settings enable row level security;
alter table public.contacts enable row level security;
alter table public.punch_items enable row level security;
alter table public.item_photos enable row level security;

drop policy if exists "profiles read own org" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "sites read assigned" on public.sites;
drop policy if exists "admins manage sites" on public.sites;
drop policy if exists "access read own" on public.user_site_access;
drop policy if exists "admins manage access" on public.user_site_access;
drop policy if exists "settings read org" on public.trade_settings;
drop policy if exists "settings manage trades" on public.trade_settings;
drop policy if exists "locations read org" on public.location_settings;
drop policy if exists "locations manage" on public.location_settings;
drop policy if exists "items read org" on public.item_settings;
drop policy if exists "items manage" on public.item_settings;
drop policy if exists "contacts read org" on public.contacts;
drop policy if exists "contacts manage" on public.contacts;
drop policy if exists "items read assigned site" on public.punch_items;
drop policy if exists "items insert assigned site" on public.punch_items;
drop policy if exists "items update assigned site" on public.punch_items;
drop policy if exists "items delete managers" on public.punch_items;
drop policy if exists "photos read assigned site" on public.item_photos;
drop policy if exists "photos manage assigned site" on public.item_photos;

create policy "profiles read own org"
on public.profiles for select
using (
  id = auth.uid()
  or organization_id = public.current_organization_id()
);

create policy "admins manage profiles"
on public.profiles for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "sites read assigned"
on public.sites for select
using (public.can_access_site(id));

create policy "admins manage sites"
on public.sites for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "access read own"
on public.user_site_access for select
using (user_id = auth.uid() or public.is_admin_or_manager());

create policy "admins manage access"
on public.user_site_access for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "settings read org"
on public.trade_settings for select
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "settings manage trades"
on public.trade_settings for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "locations read org"
on public.location_settings for select
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "locations manage"
on public.location_settings for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "items read org"
on public.item_settings for select
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "items manage"
on public.item_settings for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "contacts read org"
on public.contacts for select
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "contacts manage"
on public.contacts for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "items read assigned site"
on public.punch_items for select
using (public.can_access_site(site_id));

create policy "items insert assigned site"
on public.punch_items for insert
with check (public.can_access_site(site_id));

create policy "items update assigned site"
on public.punch_items for update
using (public.can_access_site(site_id))
with check (public.can_access_site(site_id));

create policy "items delete managers"
on public.punch_items for delete
using (public.is_admin_or_manager());

create policy "photos read assigned site"
on public.item_photos for select
using (
  exists (
    select 1
    from public.punch_items item
    where item.id = item_id
      and public.can_access_site(item.site_id)
  )
);

create policy "photos manage assigned site"
on public.item_photos for all
using (
  exists (
    select 1
    from public.punch_items item
    where item.id = item_id
      and public.can_access_site(item.site_id)
  )
)
with check (
  exists (
    select 1
    from public.punch_items item
    where item.id = item_id
      and public.can_access_site(item.site_id)
  )
);
