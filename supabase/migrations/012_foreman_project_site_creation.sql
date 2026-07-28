-- Let foremen create projects and manage sites inside projects assigned to them.

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_manager()
    or exists (
      select 1
      from public.projects project
      join public.project_user_access project_access
        on project_access.project_id = project.id
       and project_access.user_id = auth.uid()
      where project.id = project_uuid
        and project.organization_id = public.current_organization_id()
    )
$$;

revoke all on function public.can_access_project(uuid) from public;
grant execute on function public.can_access_project(uuid) to authenticated;
grant execute on function public.can_access_project(uuid) to service_role;

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
$$;

create or replace function public.auto_assign_project_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_user_access (project_id, user_id)
  select new.id, profile.id
  from public.profiles profile
  where profile.id = auth.uid()
    and profile.organization_id = new.organization_id
    and profile.role = 'foreman'
  on conflict (project_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists assign_project_creator_after_insert on public.projects;
create trigger assign_project_creator_after_insert
after insert on public.projects
for each row execute function public.auto_assign_project_creator();

create or replace function public.auto_assign_project_users_to_site()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_id is not null then
    insert into public.user_site_access (user_id, site_id)
    select project_access.user_id, new.id
    from public.project_user_access project_access
    join public.profiles profile on profile.id = project_access.user_id
    where project_access.project_id = new.project_id
      and profile.organization_id = new.organization_id
    on conflict (user_id, site_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_project_users_after_site_insert on public.sites;
create trigger assign_project_users_after_site_insert
after insert on public.sites
for each row execute function public.auto_assign_project_users_to_site();

drop policy if exists "projects read org" on public.projects;
drop policy if exists "projects read assigned" on public.projects;
drop policy if exists "organization members add projects" on public.projects;
drop policy if exists "assigned foremen update projects" on public.projects;

create policy "projects read assigned"
on public.projects for select
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_project(id)
);

create policy "organization members add projects"
on public.projects for insert
to authenticated
with check (organization_id = public.current_organization_id());

create policy "assigned foremen update projects"
on public.projects for update
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_project(id)
)
with check (
  organization_id = public.current_organization_id()
  and public.can_access_project(id)
);

drop policy if exists "assigned foremen add sites" on public.sites;
drop policy if exists "assigned foremen update sites" on public.sites;

create policy "assigned foremen add sites"
on public.sites for insert
to authenticated
with check (
  organization_id = public.current_organization_id()
  and project_id is not null
  and public.can_access_project(project_id)
);

create policy "assigned foremen update sites"
on public.sites for update
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(id)
)
with check (
  organization_id = public.current_organization_id()
  and project_id is not null
  and public.can_access_project(project_id)
);
