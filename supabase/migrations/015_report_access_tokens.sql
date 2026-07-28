-- Hashed, expiring, revocable access for public site and crew/trade reports.

create table if not exists public.report_access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id text not null,
  report_kind text not null check (report_kind in ('site', 'trade', 'all_trade')),
  trade_name text,
  permission text not null check (permission in ('read', 'update')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists report_access_lookup_idx
on public.report_access_tokens (token_hash, report_kind, report_id);

create index if not exists report_access_org_idx
on public.report_access_tokens (organization_id, expires_at desc);

alter table public.report_access_tokens enable row level security;

-- Browser clients never read report tokens directly. Netlify functions use the
-- service role after validating either a Supabase session or the token hash.
revoke all on public.report_access_tokens from anon, authenticated;

