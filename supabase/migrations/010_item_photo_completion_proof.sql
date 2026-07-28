alter table public.item_photos
  add column if not exists completion_proof boolean not null default false;

comment on column public.item_photos.completion_proof is
  'True when a crew or trade uploads the photo as proof of completed work.';
