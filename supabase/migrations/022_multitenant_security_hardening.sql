-- Close cross-organization access paths left by the original permissive admin policies.

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.session_is_valid()
    and exists (
      select 1
      from public.projects project
      where project.id = project_uuid
        and project.organization_id = public.current_organization_id()
        and (
          public.is_admin_or_manager()
          or exists (
            select 1
            from public.project_user_access project_access
            where project_access.project_id = project.id
              and project_access.user_id = auth.uid()
          )
        )
    )
$$;

create or replace function public.can_access_site(site_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.session_is_valid()
    and exists (
      select 1
      from public.sites site
      where site.id = site_uuid
        and site.organization_id = public.current_organization_id()
        and (
          public.is_admin_or_manager()
          or exists (
            select 1
            from public.user_site_access site_access
            where site_access.site_id = site.id
              and site_access.user_id = auth.uid()
          )
          or (site.project_id is not null and public.can_access_project(site.project_id))
        )
    )
$$;

revoke all on function public.current_profile() from public, anon;
revoke all on function public.current_organization_id() from public, anon;
revoke all on function public.is_admin_or_manager() from public, anon;
revoke all on function public.can_access_project(uuid) from public, anon;
revoke all on function public.can_access_site(uuid) from public, anon;
revoke all on function public.site_belongs_to_current_organization(text) from public, anon;
grant execute on function public.current_profile() to authenticated, service_role;
grant execute on function public.current_organization_id() to authenticated, service_role;
grant execute on function public.is_admin_or_manager() to authenticated, service_role;
grant execute on function public.can_access_project(uuid) to authenticated, service_role;
grant execute on function public.can_access_site(uuid) to authenticated, service_role;
grant execute on function public.site_belongs_to_current_organization(text) to authenticated, service_role;

drop policy if exists "organizations read own" on public.organizations;
create policy "organizations read own"
on public.organizations for select
to authenticated
using (
  public.session_is_valid()
  and id = public.current_organization_id()
);

drop policy if exists "profiles read own org" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;

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

drop policy if exists "sites read assigned" on public.sites;
drop policy if exists "admins manage sites" on public.sites;
drop policy if exists "admins delete sites" on public.sites;

create policy "sites read assigned"
on public.sites for select
to authenticated
using (public.can_access_site(id));

create policy "admins delete sites"
on public.sites for delete
to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
);

drop policy if exists "access read own" on public.user_site_access;
drop policy if exists "admins manage access" on public.user_site_access;

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

drop policy if exists "projects manage" on public.projects;
drop policy if exists "admins delete projects" on public.projects;

create policy "admins delete projects"
on public.projects for delete
to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
);

drop policy if exists "project access read org" on public.project_user_access;
drop policy if exists "project access manage" on public.project_user_access;

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

drop policy if exists "settings read org" on public.trade_settings;
drop policy if exists "settings manage trades" on public.trade_settings;
drop policy if exists "locations read org" on public.location_settings;
drop policy if exists "locations manage" on public.location_settings;
drop policy if exists "items read org" on public.item_settings;
drop policy if exists "items manage" on public.item_settings;
drop policy if exists "contacts read org" on public.contacts;
drop policy if exists "contacts manage" on public.contacts;

create policy "settings read org" on public.trade_settings for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "settings manage trades" on public.trade_settings for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (public.is_admin_or_manager() and organization_id = public.current_organization_id());

create policy "locations read org" on public.location_settings for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "locations manage" on public.location_settings for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (public.is_admin_or_manager() and organization_id = public.current_organization_id());

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

create policy "contacts read org" on public.contacts for select to authenticated
using (public.session_is_valid() and organization_id = public.current_organization_id());
create policy "contacts manage" on public.contacts for all to authenticated
using (public.is_admin_or_manager() and organization_id = public.current_organization_id())
with check (public.is_admin_or_manager() and organization_id = public.current_organization_id());

drop policy if exists "items read assigned site" on public.punch_items;
drop policy if exists "items insert assigned site" on public.punch_items;
drop policy if exists "items update assigned site" on public.punch_items;
drop policy if exists "items delete managers" on public.punch_items;

create policy "items read assigned site" on public.punch_items for select to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
);

create policy "items insert assigned site" on public.punch_items for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
  and (
    created_by is null
    or exists (
      select 1 from public.profiles profile
      where profile.id = punch_items.created_by
        and profile.organization_id = public.current_organization_id()
    )
  )
);

create policy "items update assigned site" on public.punch_items for update to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
)
with check (
  organization_id = public.current_organization_id()
  and public.can_access_site(site_id)
  and (
    created_by is null
    or exists (
      select 1 from public.profiles profile
      where profile.id = punch_items.created_by
        and profile.organization_id = public.current_organization_id()
    )
  )
);

create policy "items delete managers" on public.punch_items for delete to authenticated
using (
  public.is_admin_or_manager()
  and organization_id = public.current_organization_id()
);

drop policy if exists "photos read assigned site" on public.item_photos;
drop policy if exists "photos manage assigned site" on public.item_photos;

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

drop policy if exists "item photo files read assigned site" on storage.objects;
drop policy if exists "item photo files add assigned site" on storage.objects;
drop policy if exists "item photo files update assigned site" on storage.objects;
drop policy if exists "item photo files delete assigned site" on storage.objects;

create policy "item photo files read assigned site" on storage.objects for select to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "item photo files add assigned site" on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "item photo files update assigned site" on storage.objects for update to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
)
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

create policy "item photo files delete assigned site" on storage.objects for delete to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and exists (
    select 1 from public.punch_items item
    where item.id::text = (storage.foldername(name))[2]
      and item.organization_id = public.current_organization_id()
      and public.can_access_site(item.site_id)
  )
);

revoke all on function public.auto_assign_project_creator() from public, anon, authenticated;
revoke all on function public.auto_assign_project_users_to_site() from public, anon, authenticated;

notify pgrst, 'reload schema';
