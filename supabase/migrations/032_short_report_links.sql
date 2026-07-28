-- Short, revocable report links. Only Netlify functions using the service role
-- can read this mapping; browsers receive and store only the short code.

create table if not exists public.report_short_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id text not null,
  report_kind text not null check (report_kind in ('site', 'trade', 'all_trade')),
  trade_name text,
  permission text not null check (permission in ('read', 'update')),
  code_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists report_short_links_lookup_idx
on public.report_short_links (code_hash, expires_at);

create index if not exists report_short_links_scope_idx
on public.report_short_links (organization_id, report_kind, report_id, trade_name);

create index if not exists report_short_links_created_by_idx
on public.report_short_links (created_by);

alter table public.report_short_links enable row level security;

drop policy if exists "report short links deny browser access" on public.report_short_links;
create policy "report short links deny browser access"
on public.report_short_links
for all
to anon, authenticated
using (false)
with check (false);

revoke all on public.report_short_links from anon, authenticated;
