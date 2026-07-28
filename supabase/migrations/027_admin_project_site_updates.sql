-- Let active organization admins update any project or site in their organization.
-- Existing assignment-based policies continue to limit foremen.

begin;

drop policy if exists "admins update projects" on public.projects;
create policy "admins update projects"
on public.projects for update
to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
)
with check (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
);

drop policy if exists "admins update sites" on public.sites;
create policy "admins update sites"
on public.sites for update
to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
)
with check (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
  and (
    project_id is null
    or exists (
      select 1
      from public.projects project
      where project.id = sites.project_id
        and project.organization_id = public.current_organization_id()
    )
  )
);

notify pgrst, 'reload schema';

commit;
