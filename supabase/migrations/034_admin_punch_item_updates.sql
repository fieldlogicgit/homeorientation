-- Allow administrators to repair or update any punch item in their own
-- organization, including legacy rows whose original creator profile is gone.

begin;

alter table public.punch_items enable row level security;

drop policy if exists "admins update organization punch items" on public.punch_items;
create policy "admins update organization punch items"
on public.punch_items for update
to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
)
with check (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
);

commit;
