-- Durable, idempotent field synchronization with optimistic conflict checks.

create table if not exists public.sync_mutations (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mutation_id uuid not null,
  entity_type text not null,
  entity_id uuid,
  result jsonb not null default '{}'::jsonb,
  applied_at timestamptz not null default now(),
  primary key (organization_id, mutation_id)
);

create index if not exists sync_mutations_applied_at_idx
on public.sync_mutations (organization_id, applied_at desc);

alter table public.sync_mutations enable row level security;
revoke all on public.sync_mutations from anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = greatest(now(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

drop trigger if exists punch_items_touch_updated_at on public.punch_items;
create trigger punch_items_touch_updated_at
before update on public.punch_items
for each row execute function public.touch_updated_at();

drop trigger if exists site_documents_touch_updated_at on public.site_documents;
create trigger site_documents_touch_updated_at
before update on public.site_documents
for each row execute function public.touch_updated_at();

create or replace function public.apply_punch_item_patch(
  p_organization_id uuid,
  p_mutation_id uuid,
  p_item_id uuid,
  p_patch jsonb,
  p_base_updated_at timestamptz default null,
  p_client_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_result jsonb;
  current_item public.punch_items%rowtype;
  saved_item public.punch_items%rowtype;
  response jsonb;
begin
  if auth.role() <> 'service_role' then
    if not public.session_is_valid() or public.current_organization_id() is distinct from p_organization_id then
      raise exception using errcode = '42501', message = 'Not authorized for this organization.';
    end if;
  end if;

  select mutation.result
  into existing_result
  from public.sync_mutations mutation
  where mutation.organization_id = p_organization_id
    and mutation.mutation_id = p_mutation_id;

  if found then
    return existing_result;
  end if;

  select item.*
  into current_item
  from public.punch_items item
  where item.id = p_item_id
    and item.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Item no longer exists.';
  end if;

  if auth.role() <> 'service_role' and not public.can_access_site(current_item.site_id) then
    raise exception using errcode = '42501', message = 'Not authorized for this site.';
  end if;

  if auth.role() <> 'service_role'
    and (p_patch ? 'site_id')
    and not public.can_access_site((p_patch ->> 'site_id')::uuid) then
    raise exception using errcode = '42501', message = 'Not authorized for the destination site.';
  end if;

  if p_base_updated_at is not null and current_item.updated_at > p_base_updated_at then
    raise exception using errcode = 'P0001', message = 'SYNC_CONFLICT: a newer server change exists.';
  end if;

  update public.punch_items
  set
    site_id = case when p_patch ? 'site_id' then (p_patch ->> 'site_id')::uuid else site_id end,
    location = case when p_patch ? 'location' then p_patch ->> 'location' else location end,
    location_area = case when p_patch ? 'location_area' then p_patch ->> 'location_area' else location_area end,
    location_detail = case when p_patch ? 'location_detail' then p_patch ->> 'location_detail' else location_detail end,
    trade = case when p_patch ? 'trade' then p_patch ->> 'trade' else trade end,
    item = case when p_patch ? 'item' then p_patch ->> 'item' else item end,
    notes = case when p_patch ? 'notes' then p_patch ->> 'notes' else notes end,
    shared_note = case when p_patch ? 'shared_note' then p_patch ->> 'shared_note' else shared_note end,
    completed = case when p_patch ? 'completed' then (p_patch ->> 'completed')::boolean else completed end,
    completed_at = case
      when p_patch ? 'completed_at' then nullif(p_patch ->> 'completed_at', '')::timestamptz
      else completed_at
    end,
    trade_completed = case when p_patch ? 'trade_completed' then (p_patch ->> 'trade_completed')::boolean else trade_completed end,
    trade_completed_at = case
      when p_patch ? 'trade_completed_at' then nullif(p_patch ->> 'trade_completed_at', '')::timestamptz
      else trade_completed_at
    end
  where id = p_item_id
    and organization_id = p_organization_id
  returning * into saved_item;

  response = jsonb_build_object(
    'id', saved_item.id,
    'updated_at', saved_item.updated_at,
    'shared_note', saved_item.shared_note,
    'completed', saved_item.completed,
    'completed_at', saved_item.completed_at,
    'trade_completed', saved_item.trade_completed,
    'trade_completed_at', saved_item.trade_completed_at
  );

  insert into public.sync_mutations (organization_id, mutation_id, entity_type, entity_id, result)
  values (p_organization_id, p_mutation_id, 'punch_item', p_item_id, response);

  return response;
end;
$$;

revoke all on function public.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) from public, anon;
grant execute on function public.apply_punch_item_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;

create or replace function public.apply_site_document_patch(
  p_organization_id uuid,
  p_mutation_id uuid,
  p_document_id uuid,
  p_patch jsonb,
  p_base_updated_at timestamptz default null,
  p_client_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_result jsonb;
  current_document public.site_documents%rowtype;
  saved_document public.site_documents%rowtype;
  response jsonb;
begin
  if auth.role() <> 'service_role' then
    if not public.session_is_valid() or public.current_organization_id() is distinct from p_organization_id then
      raise exception using errcode = '42501', message = 'Not authorized for this organization.';
    end if;
  end if;

  select mutation.result into existing_result
  from public.sync_mutations mutation
  where mutation.organization_id = p_organization_id
    and mutation.mutation_id = p_mutation_id;
  if found then return existing_result; end if;

  select document.* into current_document
  from public.site_documents document
  where document.id = p_document_id
    and document.organization_id = p_organization_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Document no longer exists.';
  end if;

  if auth.role() <> 'service_role' and not public.can_access_site(current_document.site_id) then
    raise exception using errcode = '42501', message = 'Not authorized for this site.';
  end if;

  if p_base_updated_at is not null and current_document.updated_at > p_base_updated_at then
    raise exception using errcode = 'P0001', message = 'SYNC_CONFLICT: a newer server change exists.';
  end if;

  update public.site_documents
  set
    title = case when p_patch ? 'title' then p_patch ->> 'title' else title end,
    category = case when p_patch ? 'category' then p_patch ->> 'category' else category end,
    description = case when p_patch ? 'description' then nullif(p_patch ->> 'description', '') else description end,
    document_date = case when p_patch ? 'document_date' then nullif(p_patch ->> 'document_date', '')::date else document_date end
  where id = p_document_id
    and organization_id = p_organization_id
  returning * into saved_document;

  response = to_jsonb(saved_document);
  insert into public.sync_mutations (organization_id, mutation_id, entity_type, entity_id, result)
  values (p_organization_id, p_mutation_id, 'site_document', p_document_id, response);
  return response;
end;
$$;

revoke all on function public.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) from public, anon;
grant execute on function public.apply_site_document_patch(uuid, uuid, uuid, jsonb, timestamptz, timestamptz) to authenticated, service_role;

-- Successful mutation receipts are only needed for retry deduplication.
create or replace function public.cleanup_old_sync_mutations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer;
begin
  -- punchlogic-safety: reviewed runtime delete
  delete from public.sync_mutations
  where applied_at < now() - interval '30 days';
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke all on function public.cleanup_old_sync_mutations() from public, anon, authenticated;
grant execute on function public.cleanup_old_sync_mutations() to service_role;
