-- Enforce client and user access state inside RLS, including already-issued JWTs.

alter table public.organizations
add column if not exists access_paused boolean not null default false;

alter table public.profiles
add column if not exists is_active boolean not null default true;

alter table public.profiles
add column if not exists sessions_valid_after timestamptz not null default to_timestamp(0);

drop policy if exists "organizations read own" on public.organizations;
create policy "organizations read own"
on public.organizations for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.organization_id = organizations.id
  )
);

create or replace function public.session_is_valid()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.organizations organization on organization.id = profile.organization_id
    where profile.id = auth.uid()
      and profile.is_active
      and not organization.access_paused
      and to_timestamp(coalesce((auth.jwt() ->> 'iat')::bigint, 0)) >= profile.sessions_valid_after
  )
$$;

revoke all on function public.session_is_valid() from public;
grant execute on function public.session_is_valid() to authenticated;
grant execute on function public.session_is_valid() to service_role;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select profile.*
  from public.profiles profile
  where profile.id = auth.uid()
    and public.session_is_valid()
  limit 1
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profile.organization_id
  from public.profiles profile
  where profile.id = auth.uid()
    and public.session_is_valid()
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
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
      and public.session_is_valid()
  )
$$;

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.session_is_valid()
    and (
      public.is_admin_or_manager()
      or exists (
        select 1
        from public.projects project
        join public.project_user_access project_access
          on project_access.project_id = project.id
         and project_access.user_id = auth.uid()
        where project.id = project_uuid
          and project.organization_id = public.current_organization_id()
      )
    )
$$;

create or replace function public.can_access_site(site_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.session_is_valid()
    and (
      public.is_admin_or_manager()
      or exists (
        select 1
        from public.user_site_access site_access
        where site_access.user_id = auth.uid()
          and site_access.site_id = site_uuid
      )
      or exists (
        select 1
        from public.sites site
        where site.id = site_uuid
          and site.organization_id = public.current_organization_id()
          and public.can_access_project(site.project_id)
      )
    )
$$;

create or replace function public.site_belongs_to_current_organization(site_id_text text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.session_is_valid()
    and exists (
      select 1
      from public.sites site
      join public.profiles profile
        on profile.id = auth.uid()
       and profile.organization_id = site.organization_id
      where site.id::text = site_id_text
    )
$$;

create or replace function public.revoke_user_sessions(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- punchlogic-safety: reviewed runtime delete
  delete from auth.sessions where user_id = target_user_id;
  update public.profiles
  set sessions_valid_after = now() + interval '2 seconds'
  where id = target_user_id;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
