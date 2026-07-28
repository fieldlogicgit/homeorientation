-- Make intentional server-only access explicit for Security Advisor and defense in depth.

begin;

drop policy if exists "report access tokens deny browser access" on public.report_access_tokens;
create policy "report access tokens deny browser access"
on public.report_access_tokens
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "server rate limits deny browser access" on public.server_rate_limits;
create policy "server rate limits deny browser access"
on public.server_rate_limits
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "server state deny browser access" on public.server_state;
create policy "server state deny browser access"
on public.server_state
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "sync mutations deny browser access" on public.sync_mutations;
create policy "sync mutations deny browser access"
on public.sync_mutations
for all
to anon, authenticated
using (false)
with check (false);

commit;
