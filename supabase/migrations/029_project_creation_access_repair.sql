-- Restore organization-scoped project creation after the security policy changes.
-- Active users may create projects only inside the organization on their profile.

begin;

alter table public.projects enable row level security;

drop policy if exists "organization members add projects" on public.projects;
create policy "organization members add projects"
on public.projects for insert
to authenticated
with check (
  public.session_is_valid()
  and organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_active
      and profile.organization_id = projects.organization_id
  )
);

notify pgrst, 'reload schema';

commit;
