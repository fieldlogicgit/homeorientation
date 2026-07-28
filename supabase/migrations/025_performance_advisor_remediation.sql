-- Add foreign-key indexes and avoid duplicate permissive SELECT policies.

begin;

create index if not exists contacts_organization_id_idx on public.contacts (organization_id);
create index if not exists item_photos_item_id_idx on public.item_photos (item_id);
create index if not exists item_photos_organization_id_idx on public.item_photos (organization_id);
create index if not exists item_settings_trade_id_idx on public.item_settings (trade_id);
create index if not exists profiles_organization_id_idx on public.profiles (organization_id);
create index if not exists project_user_access_user_id_idx on public.project_user_access (user_id);
create index if not exists punch_items_created_by_idx on public.punch_items (created_by);
create index if not exists punch_items_organization_id_idx on public.punch_items (organization_id);
create index if not exists punch_items_site_id_idx on public.punch_items (site_id);
create index if not exists report_access_tokens_created_by_idx on public.report_access_tokens (created_by);
create index if not exists site_documents_site_id_idx on public.site_documents (site_id);
create index if not exists site_documents_uploaded_by_idx on public.site_documents (uploaded_by);
create index if not exists sites_organization_id_idx on public.sites (organization_id);
create index if not exists sites_project_id_idx on public.sites (project_id);
create index if not exists user_site_access_site_id_idx on public.user_site_access (site_id);

drop policy if exists "site documents add organization site" on public.site_documents;
create policy "site documents add organization site"
on public.site_documents for insert
to authenticated
with check (
  organization_id = (select public.current_organization_id())
  and uploaded_by = (select auth.uid())
  and public.site_belongs_to_current_organization(site_id::text)
);

drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "profiles read own org" on public.profiles;
create policy "profiles read own org" on public.profiles for select to authenticated
using (
  (select public.session_is_valid())
  and organization_id = (select public.current_organization_id())
);
create policy "admins insert profiles" on public.profiles for insert to authenticated
with check (
  (select public.is_admin_or_manager())
  and organization_id = (select public.current_organization_id())
);
create policy "admins update profiles" on public.profiles for update to authenticated
using (
  (select public.is_admin_or_manager())
  and organization_id = (select public.current_organization_id())
)
with check (
  (select public.is_admin_or_manager())
  and organization_id = (select public.current_organization_id())
);
create policy "admins delete profiles" on public.profiles for delete to authenticated
using (
  (select public.is_admin_or_manager())
  and organization_id = (select public.current_organization_id())
);

drop policy if exists "admins manage access" on public.user_site_access;
drop policy if exists "access read own" on public.user_site_access;
create policy "access read own" on public.user_site_access for select to authenticated
using (
  (select public.session_is_valid())
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = (select public.current_organization_id())
  )
  and (user_id = (select auth.uid()) or (select public.is_admin_or_manager()))
);
create policy "admins insert access" on public.user_site_access for insert to authenticated
with check (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_site_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
);
create policy "admins update access" on public.user_site_access for update to authenticated
using (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_site_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
)
with check (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_site_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
);
create policy "admins delete access" on public.user_site_access for delete to authenticated
using (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.sites site
    where site.id = user_site_access.site_id
      and site.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = user_site_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
);

drop policy if exists "project access manage" on public.project_user_access;
drop policy if exists "project access read org" on public.project_user_access;
create policy "project access read org" on public.project_user_access for select to authenticated
using (
  (select public.session_is_valid())
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = (select public.current_organization_id())
  )
  and (user_id = (select auth.uid()) or (select public.is_admin_or_manager()))
);
create policy "project access insert" on public.project_user_access for insert to authenticated
with check (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = project_user_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
);
create policy "project access update" on public.project_user_access for update to authenticated
using (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = project_user_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
)
with check (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = project_user_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
);
create policy "project access delete" on public.project_user_access for delete to authenticated
using (
  (select public.is_admin_or_manager())
  and exists (
    select 1 from public.projects project
    where project.id = project_user_access.project_id
      and project.organization_id = (select public.current_organization_id())
  )
  and exists (
    select 1 from public.profiles profile
    where profile.id = project_user_access.user_id
      and profile.organization_id = (select public.current_organization_id())
  )
);

drop policy if exists "settings manage trades" on public.trade_settings;
drop policy if exists "settings read org" on public.trade_settings;
create policy "settings read org" on public.trade_settings for select to authenticated
using ((select public.session_is_valid()) and organization_id = (select public.current_organization_id()));
create policy "settings insert trades" on public.trade_settings for insert to authenticated
with check ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));
create policy "settings update trades" on public.trade_settings for update to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()))
with check ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));
create policy "settings delete trades" on public.trade_settings for delete to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));

drop policy if exists "locations manage" on public.location_settings;
drop policy if exists "locations read org" on public.location_settings;
create policy "locations read org" on public.location_settings for select to authenticated
using ((select public.session_is_valid()) and organization_id = (select public.current_organization_id()));
create policy "locations insert" on public.location_settings for insert to authenticated
with check ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));
create policy "locations update" on public.location_settings for update to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()))
with check ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));
create policy "locations delete" on public.location_settings for delete to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));

drop policy if exists "items manage" on public.item_settings;
drop policy if exists "items read org" on public.item_settings;
create policy "items read org" on public.item_settings for select to authenticated
using ((select public.session_is_valid()) and organization_id = (select public.current_organization_id()));
create policy "items insert" on public.item_settings for insert to authenticated
with check (
  (select public.is_admin_or_manager())
  and organization_id = (select public.current_organization_id())
  and (
    trade_id is null
    or exists (
      select 1 from public.trade_settings trade
      where trade.id = item_settings.trade_id
        and trade.organization_id = (select public.current_organization_id())
    )
  )
);
create policy "items update" on public.item_settings for update to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()))
with check (
  (select public.is_admin_or_manager())
  and organization_id = (select public.current_organization_id())
  and (
    trade_id is null
    or exists (
      select 1 from public.trade_settings trade
      where trade.id = item_settings.trade_id
        and trade.organization_id = (select public.current_organization_id())
    )
  )
);
create policy "items delete" on public.item_settings for delete to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));

drop policy if exists "contacts manage" on public.contacts;
drop policy if exists "contacts read org" on public.contacts;
create policy "contacts read org" on public.contacts for select to authenticated
using ((select public.session_is_valid()) and organization_id = (select public.current_organization_id()));
create policy "contacts insert" on public.contacts for insert to authenticated
with check ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));
create policy "contacts update" on public.contacts for update to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()))
with check ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));
create policy "contacts delete" on public.contacts for delete to authenticated
using ((select public.is_admin_or_manager()) and organization_id = (select public.current_organization_id()));

drop policy if exists "photos manage assigned site" on public.item_photos;
drop policy if exists "photos read assigned site" on public.item_photos;
create policy "photos read assigned site" on public.item_photos for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = (select public.current_organization_id())
      and public.can_access_site(item.site_id)
  )
);
create policy "photos insert assigned site" on public.item_photos for insert to authenticated
with check (
  organization_id = (select public.current_organization_id())
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = (select public.current_organization_id())
      and public.can_access_site(item.site_id)
  )
);
create policy "photos update assigned site" on public.item_photos for update to authenticated
using (
  organization_id = (select public.current_organization_id())
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = (select public.current_organization_id())
      and public.can_access_site(item.site_id)
  )
)
with check (
  organization_id = (select public.current_organization_id())
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = (select public.current_organization_id())
      and public.can_access_site(item.site_id)
  )
);
create policy "photos delete assigned site" on public.item_photos for delete to authenticated
using (
  organization_id = (select public.current_organization_id())
  and exists (
    select 1 from public.punch_items item
    where item.id = item_photos.item_id
      and item.organization_id = (select public.current_organization_id())
      and public.can_access_site(item.site_id)
  )
);

commit;
