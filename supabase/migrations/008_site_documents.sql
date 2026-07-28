-- Shared, private documents attached to Punch Logic sites.

create table if not exists public.site_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  description text,
  revision text,
  document_date date,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 26214400),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_documents_organization_site_idx
on public.site_documents (organization_id, site_id, created_at desc);

alter table public.site_documents enable row level security;

drop policy if exists "site documents read assigned site" on public.site_documents;
drop policy if exists "site documents add assigned site" on public.site_documents;
drop policy if exists "site documents update assigned site" on public.site_documents;
drop policy if exists "site documents delete assigned site" on public.site_documents;

create policy "site documents read assigned site"
on public.site_documents for select
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
);

create policy "site documents add assigned site"
on public.site_documents for insert
with check (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
  and uploaded_by = auth.uid()
);

create policy "site documents update assigned site"
on public.site_documents for update
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
)
with check (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
);

create policy "site documents delete assigned site"
on public.site_documents for delete
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-documents',
  'site-documents',
  false,
  26214400,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site document files read assigned site" on storage.objects;
drop policy if exists "site document files add assigned site" on storage.objects;
drop policy if exists "site document files update assigned site" on storage.objects;
drop policy if exists "site document files delete assigned site" on storage.objects;

create policy "site document files read assigned site"
on storage.objects for select
using (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.sites site
    where site.id::text = (storage.foldername(name))[2]
      and site.organization_id = public.current_organization_id()
      and public.can_access_site(site.id)
  )
);

create policy "site document files add assigned site"
on storage.objects for insert
with check (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.sites site
    where site.id::text = (storage.foldername(name))[2]
      and site.organization_id = public.current_organization_id()
      and public.can_access_site(site.id)
  )
);

create policy "site document files update assigned site"
on storage.objects for update
using (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.sites site
    where site.id::text = (storage.foldername(name))[2]
      and site.organization_id = public.current_organization_id()
      and public.can_access_site(site.id)
  )
)
with check (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.sites site
    where site.id::text = (storage.foldername(name))[2]
      and site.organization_id = public.current_organization_id()
      and public.can_access_site(site.id)
  )
);

create policy "site document files delete assigned site"
on storage.objects for delete
using (
  bucket_id = 'site-documents'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.sites site
    where site.id::text = (storage.foldername(name))[2]
      and site.organization_id = public.current_organization_id()
      and public.can_access_site(site.id)
  )
);
