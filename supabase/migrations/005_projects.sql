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

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.sites
add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.projects enable row level security;

drop policy if exists "projects read org" on public.projects;
drop policy if exists "projects manage" on public.projects;

create policy "projects read org"
on public.projects for select
using (organization_id = public.current_organization_id());

create policy "projects manage"
on public.projects for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());
