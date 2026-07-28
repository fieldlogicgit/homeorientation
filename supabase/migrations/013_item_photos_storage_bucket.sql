-- Private Supabase Storage bucket for Punch Logic item and completion photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "item photo files read assigned site" on storage.objects;
drop policy if exists "item photo files add assigned site" on storage.objects;
drop policy if exists "item photo files update assigned site" on storage.objects;
drop policy if exists "item photo files delete assigned site" on storage.objects;

create policy "item photo files read assigned site"
on storage.objects for select
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1
    from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "item photo files add assigned site"
on storage.objects for insert
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1
    from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "item photo files update assigned site"
on storage.objects for update
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1
    from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
)
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1
    from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "item photo files delete assigned site"
on storage.objects for delete
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1
    from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);
