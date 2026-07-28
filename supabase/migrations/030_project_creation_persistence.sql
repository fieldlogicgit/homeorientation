-- Create a project and its creator access in one transaction so the new
-- project remains visible to a foreman on the next Field App fetch.

begin;

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
    and profile.is_active
  on conflict (project_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists assign_project_creator_after_insert on public.projects;
create trigger assign_project_creator_after_insert
after insert on public.projects
for each row execute function public.auto_assign_project_creator();

create or replace function public.create_project_for_current_user(project_name text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_organization_id uuid;
  creator_role text;
  created_project_id uuid;
  normalized_name text := btrim(coalesce(project_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select profile.organization_id, profile.role
  into creator_organization_id, creator_role
  from public.profiles profile
  where profile.id = auth.uid()
    and profile.is_active;

  if creator_organization_id is null then
    raise exception 'This login is not connected to an active client organization.'
      using errcode = '42501';
  end if;

  if creator_role not in ('admin', 'foreman') then
    raise exception 'This login cannot create projects.' using errcode = '42501';
  end if;

  if normalized_name = '' then
    raise exception 'Project name is required.' using errcode = '22023';
  end if;

  insert into public.projects (organization_id, name)
  values (creator_organization_id, normalized_name)
  returning projects.id into created_project_id;

  if creator_role = 'foreman' then
    insert into public.project_user_access (project_id, user_id)
    values (created_project_id, auth.uid())
    on conflict (project_id, user_id) do nothing;
  end if;

  return query
  select project.id, project.name
  from public.projects project
  where project.id = created_project_id;
end;
$$;

revoke all on function public.create_project_for_current_user(text) from public;
revoke all on function public.create_project_for_current_user(text) from anon;
grant execute on function public.create_project_for_current_user(text) to authenticated;

notify pgrst, 'reload schema';

commit;
