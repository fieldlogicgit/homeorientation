-- Restore the combined policies used before migration 025 and refresh PostgREST.

begin;

drop policy if exists "admins insert profiles" on public.profiles;
drop policy if exists "admins update profiles" on public.profiles;
drop policy if exists "admins delete profiles" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "profiles read own org" on public.profiles;

create policy "profiles read own org"
on public.profiles for select
to authenticated
using (
  public.session_is_valid()
  and organization_id = public.current_organization_id()
);

create policy "admins manage profiles"
on public.profiles for all
to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
)
with check (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
);

drop policy if exists "admins insert access" on public.user_site_access;
drop policy if exists "admins update access" on public.user_site_access;
drop policy if exists "admins delete access" on public.user_site_access;
drop policy if exists "admins manage access" on public.user_site_access;
drop policy if exists "access read own" on public.user_site_access;

create policy "access read own"
on public.user_site_access for select
to authenticated
using (
  public.session_is_valid()
  and exists (
    select 1
    from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = public.current_organization_id()
  )
  and (user_id = auth.uid() or public.is_admin_or_manager())
);

create policy "admins manage access"
on public.user_site_access for all
to authenticated
using (
  public.is_admin_or_manager()
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = public.current_organization_id()
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_site_access.user_id
      and profile.organization_id = public.current_organization_id()
  )
)
with check (
  public.is_admin_or_manager()
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = public.current_organization_id()
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_site_access.user_id
      and profile.organization_id = public.current_organization_id()
  )
);

drop policy if exists "project access insert" on public.project_user_access;
drop policy if exists "project access update" on public.project_user_access;
drop policy if exists "project access delete" on public.project_user_access;
drop policy if exists "project access manage" on public.project_user_access;
drop policy if exists "project access read org" on public.project_user_access;

create policy "project access read org"
on public.project_user_access for select
to authenticated
using (
  public.session_is_valid()
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = public.current_organization_id()
  )
  and (user_id = auth.uid() or public.is_admin_or_manager())
);

create policy "project access manage"
on public.project_user_access for all
to authenticated
using (
  public.is_admin_or_manager()
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = public.current_organization_id()
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = project_user_access.user_id
      and profile.organization_id = public.current_organization_id()
  )
)
with check (
  public.is_admin_or_manager()
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = public.current_organization_id()
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = project_user_access.user_id
      and profile.organization_id = public.current_organization_id()
  )
);

drop policy if exists "settings insert trades" on public.trade_settings;
drop policy if exists "settings update trades" on public.trade_settings;
drop policy if exists "settings delete trades" on public.trade_settings;
drop policy if exists "settings manage trades" on public.trade_settings;
drop policy if exists "settings read org" on public.trade_settings;

create policy "settings read org" on public.trade_settings for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "settings manage trades" on public.trade_settings for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (public.is_admin_or_manager() and organization_id = public.current_organization_id());

drop policy if exists "locations insert" on public.location_settings;
drop policy if exists "locations update" on public.location_settings;
drop policy if exists "locations delete" on public.location_settings;
drop policy if exists "locations manage" on public.location_settings;
drop policy if exists "locations read org" on public.location_settings;

create policy "locations read org" on public.location_settings for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "locations manage" on public.location_settings for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (public.is_admin_or_manager() and organization_id = public.current_organization_id());

drop policy if exists "items insert" on public.item_settings;
drop policy if exists "items update" on public.item_settings;
drop policy if exists "items delete" on public.item_settings;
drop policy if exists "items manage" on public.item_settings;
drop policy if exists "items read org" on public.item_settings;

create policy "items read org" on public.item_settings for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "items manage" on public.item_settings for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
  and (
    trade_id is null
    or exists (
      select 1 from public.trade_settings trade
      where trade.id = item_settings.trade_id
        and trade.organization_id = public.current_organization_id()
    )
  )
);

drop policy if exists "contacts insert" on public.contacts;
drop policy if exists "contacts update" on public.contacts;
drop policy if exists "contacts delete" on public.contacts;
drop policy if exists "contacts manage" on public.contacts;
drop policy if exists "contacts read org" on public.contacts;

create policy "contacts read org" on public.contacts for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "contacts manage" on public.contacts for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (public.is_admin_or_manager() and organization_id = public.current_organization_id());

drop policy if exists "photos insert assigned site" on public.item_photos;
drop policy if exists "photos update assigned site" on public.item_photos;
drop policy if exists "photos delete assigned site" on public.item_photos;
drop policy if exists "photos manage assigned site" on public.item_photos;
drop policy if exists "photos read assigned site" on public.item_photos;

create policy "photos read assigned site" on public.item_photos for select to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "photos manage assigned site" on public.item_photos for all to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
)
with check (
  organization_id = public.current_organization_id()
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

-- Recreate the three Field App read policies to force fresh policy plans.
drop policy if exists "projects read assigned" on public.projects;
create policy "projects read assigned"
on public.projects for select
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_project(id)
);

drop policy if exists "sites read assigned" on public.sites;
create policy "sites read assigned"
on public.sites for select
to authenticated
using (public.can_access_site(id));

drop policy if exists "items read assigned site" on public.punch_items;
create policy "items read assigned site"
on public.punch_items for select
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
);

drop policy if exists "site documents add organization site" on public.site_documents;
create policy "site documents add organization site"
on public.site_documents for insert
to authenticated
with check (
  organization_id = public.current_organization_id()
  and uploaded_by = auth.uid()
  and public.site_belongs_to_current_organization(site_id::text)
);

commit;

notify pgrst, 'reload schema';
