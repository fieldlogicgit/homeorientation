-- Keep uploads private, bounded, and limited to the file types Punch Logic uses.

update storage.buckets
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
where id = 'site-documents';

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'item-photos';

alter table public.site_documents
drop constraint if exists site_documents_content_type_check;

alter table public.site_documents
add constraint site_documents_content_type_check check (
  content_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  )
);

alter table public.item_photos
drop constraint if exists item_photos_content_type_check;

alter table public.item_photos
add constraint item_photos_content_type_check check (
  content_type is null or content_type in ('image/jpeg', 'image/png', 'image/webp')
);

