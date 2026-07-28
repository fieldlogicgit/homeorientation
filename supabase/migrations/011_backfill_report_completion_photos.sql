alter table public.item_photos
  add column if not exists completion_proof boolean not null default false;

update public.item_photos
set completion_proof = true
where completion_proof = false
  and storage_path = id::text;
