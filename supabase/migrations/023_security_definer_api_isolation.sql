-- Keep privileged function implementations outside the exposed Data API schema.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.session_is_valid() set schema private;
alter function public.current_profile() set schema private;
alter function public.current_organization_id() set schema private;
alter function public.is_admin_or_manager() set schema private;
alter function public.can_access_project(uuid) set schema private;
alter function public.can_access_site(uuid) set schema private;
alter function public.site_belongs_to_current_organization(text) set schema private;
alter function public.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) set schema private;
alter function public.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) set schema private;

revoke all on function private.session_is_valid() from public, anon;
revoke all on function private.current_profile() from public, anon;
revoke all on function private.current_organization_id() from public, anon;
revoke all on function private.is_admin_or_manager() from public, anon;
revoke all on function private.can_access_project(uuid) from public, anon;
revoke all on function private.can_access_site(uuid) from public, anon;
revoke all on function private.site_belongs_to_current_organization(text) from public, anon;
revoke all on function private.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) from public, anon;
revoke all on function private.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) from public, anon;

grant execute on function private.session_is_valid() to authenticated, service_role;
grant execute on function private.current_profile() to authenticated, service_role;
grant execute on function private.current_organization_id() to authenticated, service_role;
grant execute on function private.is_admin_or_manager() to authenticated, service_role;
grant execute on function private.can_access_project(uuid) to authenticated, service_role;
grant execute on function private.can_access_site(uuid) to authenticated, service_role;
grant execute on function private.site_belongs_to_current_organization(text) to authenticated, service_role;
grant execute on function private.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function private.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;

-- Preserve the existing browser RPC contract without exposing SECURITY DEFINER functions.
create or replace function public.session_is_valid()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.session_is_valid()
$$;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_profile()
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_organization_id()
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.is_admin_or_manager()
$$;

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.can_access_project(project_uuid)
$$;

create or replace function public.can_access_site(site_uuid uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.can_access_site(site_uuid)
$$;

create or replace function public.site_belongs_to_current_organization(site_id_text text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.site_belongs_to_current_organization(site_id_text)
$$;

create or replace function public.apply_punch_item_patch(
  p_organization_id uuid,
  p_mutation_id uuid,
  p_item_id uuid,
  p_patch jsonb,
  p_base_updated_at timestamptz default null,
  p_client_updated_at timestamptz default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.apply_punch_item_patch(
    p_organization_id,
    p_mutation_id,
    p_item_id,
    p_patch,
    p_base_updated_at,
    p_client_updated_at
  )
$$;

create or replace function public.apply_site_document_patch(
  p_organization_id uuid,
  p_mutation_id uuid,
  p_document_id uuid,
  p_patch jsonb,
  p_base_updated_at timestamptz default null,
  p_client_updated_at timestamptz default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.apply_site_document_patch(
    p_organization_id,
    p_mutation_id,
    p_document_id,
    p_patch,
    p_base_updated_at,
    p_client_updated_at
  )
$$;

revoke all on function public.session_is_valid() from public, anon;
revoke all on function public.current_profile() from public, anon;
revoke all on function public.current_organization_id() from public, anon;
revoke all on function public.is_admin_or_manager() from public, anon;
revoke all on function public.can_access_project(uuid) from public, anon;
revoke all on function public.can_access_site(uuid) from public, anon;
revoke all on function public.site_belongs_to_current_organization(text) from public, anon;
revoke all on function public.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) from public, anon;
revoke all on function public.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) from public, anon;

grant execute on function public.session_is_valid() to authenticated, service_role;
grant execute on function public.current_profile() to authenticated, service_role;
grant execute on function public.current_organization_id() to authenticated, service_role;
grant execute on function public.is_admin_or_manager() to authenticated, service_role;
grant execute on function public.can_access_project(uuid) to authenticated, service_role;
grant execute on function public.can_access_site(uuid) to authenticated, service_role;
grant execute on function public.site_belongs_to_current_organization(text) to authenticated, service_role;
grant execute on function public.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
