create table if not exists public.project_user_access (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_user_access enable row level security;

drop policy if exists "project access read org" on public.project_user_access;
drop policy if exists "project access manage" on public.project_user_access;

create policy "project access read org"
on public.project_user_access for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_user_access.project_id
      and p.organization_id = public.current_organization_id()
  )
);

create policy "project access manage"
on public.project_user_access for all
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());
