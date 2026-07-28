-- Give organization admins an explicit path for dashboard document management.
-- Existing field-user document policies remain unchanged.

begin;

create schema if not exists private;

create or replace function private.admin_can_manage_site_document(
  organization_id_text text,
  site_id_text text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.session_is_valid()
    and private.is_admin_or_manager()
    and private.current_organization_id()::text = organization_id_text
    and exists (
      select 1
      from public.sites site
      where site.id::text = site_id_text
        and site.organization_id = private.current_organization_id()
    )
$$;

revoke all on function private.admin_can_manage_site_document(text, text) from public, anon;
grant execute on function private.admin_can_manage_site_document(text, text) to authenticated, service_role;

alter table public.site_documents enable row level security;

drop policy if exists "admins manage organization site documents" on public.site_documents;
create policy "admins manage organization site documents"
on public.site_documents for all
to authenticated
using (
  private.admin_can_manage_site_document(organization_id::text, site_id::text)
)
with check (
  private.admin_can_manage_site_document(organization_id::text, site_id::text)
);

drop policy if exists "admins manage organization site document files" on storage.objects;
create policy "admins manage organization site document files"
on storage.objects for all
to authenticated
using (
  bucket_id = 'site-documents'
  and private.admin_can_manage_site_document(
    (storage.foldername(name))[1],
    (storage.foldername(name))[2]
  )
)
with check (
  bucket_id = 'site-documents'
  and private.admin_can_manage_site_document(
    (storage.foldername(name))[1],
    (storage.foldername(name))[2]
  )
);

notify pgrst, 'reload schema';

commit;
