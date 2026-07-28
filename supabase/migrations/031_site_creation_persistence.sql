-- Create sites through one organization- and project-scoped path used by
-- manual entry and spreadsheet imports in both application surfaces.

begin;

create or replace function public.create_site_for_current_user(
  p_project_id uuid,
  p_name text,
  p_fields jsonb default '[]'::jsonb
)
returns table (id uuid, name text, fields jsonb, project_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_organization_id uuid;
  creator_role text;
  created_site_id uuid;
  normalized_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null or not public.session_is_valid() then
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
    raise exception 'This login cannot create sites.' using errcode = '42501';
  end if;

  if p_project_id is null then
    raise exception 'Select a project for every site before saving.'
      using errcode = '22023';
  end if;

  if normalized_name = '' then
    raise exception 'Site name is required.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and project.organization_id = creator_organization_id
      and (
        creator_role = 'admin'
        or exists (
          select 1
          from public.project_user_access project_access
          where project_access.project_id = project.id
            and project_access.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'You can only add sites to projects assigned to you.'
      using errcode = '42501';
  end if;

  insert into public.sites (organization_id, project_id, name, fields)
  values (
    creator_organization_id,
    p_project_id,
    normalized_name,
    coalesce(p_fields, '[]'::jsonb)
  )
  returning sites.id into created_site_id;

  return query
  select site.id, site.name, site.fields, site.project_id
  from public.sites site
  where site.id = created_site_id;
end;
$$;

revoke all on function public.create_site_for_current_user(uuid, text, jsonb) from public;
revoke all on function public.create_site_for_current_user(uuid, text, jsonb) from anon;
grant execute on function public.create_site_for_current_user(uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
