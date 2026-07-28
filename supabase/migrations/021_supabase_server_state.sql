-- Move Netlify Blob-backed report/app snapshots and rate limits into Supabase.

create table if not exists public.server_state (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  namespace text not null,
  state_key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, namespace, state_key)
);

create index if not exists server_state_updated_at_idx
on public.server_state (organization_id, namespace, updated_at desc);

alter table public.server_state enable row level security;
revoke all on public.server_state from anon, authenticated;
grant select, insert, update, delete on public.server_state to service_role;

create table if not exists public.server_rate_limits (
  rate_key text primary key,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists server_rate_limits_expires_at_idx
on public.server_rate_limits (expires_at);

alter table public.server_rate_limits enable row level security;
revoke all on public.server_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.server_rate_limits to service_role;

create or replace function public.consume_server_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_expires_at timestamptz
)
returns table (
  allowed boolean,
  current_count integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_rate_key), '') = '' or p_limit < 1 or p_expires_at <= now() then
    raise exception 'Invalid rate-limit request';
  end if;

  insert into public.server_rate_limits as limits (rate_key, request_count, expires_at, updated_at)
  values (p_rate_key, 1, p_expires_at, now())
  on conflict (rate_key) do update
  set request_count = case
        when limits.expires_at <= now() then 1
        else limits.request_count + 1
      end,
      expires_at = case
        when limits.expires_at <= now() then excluded.expires_at
        else limits.expires_at
      end,
      updated_at = now();

  return query
  select
    limits.request_count <= p_limit,
    limits.request_count,
    limits.expires_at
  from public.server_rate_limits as limits
  where limits.rate_key = p_rate_key;
end;
$$;

revoke all on function public.consume_server_rate_limit(text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_server_rate_limit(text, integer, timestamptz) to service_role;
