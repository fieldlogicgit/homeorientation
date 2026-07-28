-- Allow authenticated organization members to manage documents for any site
-- in their own organization without requiring an explicit site assignment.

create or replace function public.site_belongs_to_current_organization(site_id_text text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sites site
    join public.profiles profile
      on profile.id = auth.uid()
     and profile.organization_id = site.organization_id
    where site.id::text = site_id_text
  )
$$;

revoke all on function public.site_belongs_to_current_organization(text) from public;
grant execute on function public.site_belongs_to_current_organization(text) to authenticated;
grant execute on function public.site_belongs_to_current_organization(text) to service_role;

drop policy if exists "site documents read assigned site" on public.site_documents;
drop policy if exists "site documents add assigned site" on public.site_documents;
drop policy if exists "site documents update assigned site" on public.site_documents;
drop policy if exists "site documents delete assigned site" on public.site_documents;
drop policy if exists "site documents read organization site" on public.site_documents;
drop policy if exists "site documents add organization site" on public.site_documents;
drop policy if exists "site documents update organization site" on public.site_documents;
drop policy if exists "site documents delete organization site" on public.site_documents;

create policy "site documents read organization site"
on public.site_documents for select
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.site_belongs_to_current_organization(site_id::text)
);

create policy "site documents add organization site"
on public.site_documents for insert
to authenticated
with check (
  organization_id = public.current_organization_id()
  and uploaded_by = auth.uid()
  and public.site_belongs_to_current_organization(site_id::text)
);

create policy "site documents update organization site"
on public.site_documents for update
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.site_belongs_to_current_organization(site_id::text)
)
with check (
  organization_id = public.current_organization_id()
  and public.site_belongs_to_current_organization(site_id::text)
);

create policy "site documents delete organization site"
on public.site_documents for delete
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.site_belongs_to_current_organization(site_id::text)
);

drop policy if exists "site document files read assigned site" on storage.objects;
drop policy if exists "site document files add assigned site" on storage.objects;
drop policy if exists "site document files update assigned site" on storage.objects;
drop policy if exists "site document files delete assigned site" on storage.objects;
drop policy if exists "site document files read organization site" on storage.objects;
drop policy if exists "site document files add organization site" on storage.objects;
drop policy if exists "site document files update organization site" on storage.objects;
drop policy if exists "site document files delete organization site" on storage.objects;

create policy "site document files read organization site"
on storage.objects for select
to authenticated
using (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and public.site_belongs_to_current_organization((storage.foldername(name))[2])
);

create policy "site document files add organization site"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and public.site_belongs_to_current_organization((storage.foldername(name))[2])
);

create policy "site document files update organization site"
on storage.objects for update
to authenticated
using (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and public.site_belongs_to_current_organization((storage.foldername(name))[2])
)
with check (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and public.site_belongs_to_current_organization((storage.foldername(name))[2])
);

create policy "site document files delete organization site"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and public.site_belongs_to_current_organization((storage.foldername(name))[2])
);
