begin;

create table if not exists public.home_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  homeowner_1_name text not null,
  homeowner_1_email text not null,
  homeowner_1_signature text not null,
  homeowner_1_signed_at timestamptz not null,
  homeowner_2_name text not null,
  homeowner_2_email text not null,
  homeowner_2_signature text not null,
  homeowner_2_signed_at timestamptz not null,
  accepted_at timestamptz not null,
  accepted_by uuid references public.profiles(id) on delete set null,
  document_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id)
);

create index if not exists home_acceptances_organization_id_idx
  on public.home_acceptances (organization_id);
create index if not exists home_acceptances_site_id_idx
  on public.home_acceptances (site_id);

drop trigger if exists home_acceptances_touch_updated_at on public.home_acceptances;
create trigger home_acceptances_touch_updated_at
before update on public.home_acceptances
for each row execute function public.touch_updated_at();

alter table public.home_acceptances enable row level security;

drop policy if exists "home acceptances read organization" on public.home_acceptances;
create policy "home acceptances read organization"
on public.home_acceptances for select
to authenticated
using (organization_id = public.current_organization_id());

drop policy if exists "home acceptances create organization" on public.home_acceptances;
create policy "home acceptances create organization"
on public.home_acceptances for insert
to authenticated
with check (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.sites
    where sites.id = home_acceptances.site_id
      and sites.organization_id = public.current_organization_id()
  )
);

drop policy if exists "home acceptances update organization" on public.home_acceptances;
create policy "home acceptances update organization"
on public.home_acceptances for update
to authenticated
using (organization_id = public.current_organization_id())
with check (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.sites
    where sites.id = home_acceptances.site_id
      and sites.organization_id = public.current_organization_id()
  )
);

drop policy if exists "home acceptances delete managers" on public.home_acceptances;
create policy "home acceptances delete managers"
on public.home_acceptances for delete
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.is_admin_or_manager()
);

grant select, insert, update, delete on public.home_acceptances to authenticated;

commit;
