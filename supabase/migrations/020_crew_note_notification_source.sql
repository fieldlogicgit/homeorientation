-- Preserve crew-report metadata when shared notes are saved through the sync RPC.

create or replace function public.track_shared_note_activity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.shared_note is distinct from old.shared_note then
    if new.shared_note_updated_at is not distinct from old.shared_note_updated_at then
      new.shared_note_updated_at = now();
      new.shared_note_source = 'field_app';
    else
      new.shared_note_source = coalesce(nullif(new.shared_note_source, ''), 'field_app');
    end if;
  end if;
  return new;
end;
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
    shared_note_updated_at = case
      when p_patch ? 'shared_note_updated_at' then nullif(p_patch ->> 'shared_note_updated_at', '')::timestamptz
      else shared_note_updated_at
    end,
    shared_note_source = case
      when p_patch ? 'shared_note_source' then nullif(p_patch ->> 'shared_note_source', '')
      else shared_note_source
    end,
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
    'shared_note_updated_at', saved_item.shared_note_updated_at,
    'shared_note_source', saved_item.shared_note_source,
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

notify pgrst, 'reload schema';
