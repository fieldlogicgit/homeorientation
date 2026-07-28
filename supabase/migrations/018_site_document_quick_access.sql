alter table public.site_documents
  add column if not exists quick_access boolean not null default false;

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
    document_date = case when p_patch ? 'document_date' then nullif(p_patch ->> 'document_date', '')::date else document_date end,
    quick_access = case when p_patch ? 'quick_access' then (p_patch ->> 'quick_access')::boolean else quick_access end
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
