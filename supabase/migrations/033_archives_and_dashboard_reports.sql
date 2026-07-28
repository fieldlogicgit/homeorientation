begin;

alter table public.projects
add column if not exists archived_at timestamptz;

alter table public.sites
add column if not exists archived_at timestamptz;

create index if not exists projects_org_archive_name_idx
on public.projects (organization_id, archived_at, name);

create index if not exists sites_org_archive_project_name_idx
on public.sites (organization_id, archived_at, project_id, name);

update public.punch_items
set completed_at = coalesce(updated_at, created_at, now())
where completed = true
  and completed_at is null;

create index if not exists punch_items_org_completed_date_idx
on public.punch_items (organization_id, completed, completed_at desc);

alter table public.report_access_tokens
drop constraint if exists report_access_tokens_report_kind_check;

alter table public.report_access_tokens
add constraint report_access_tokens_report_kind_check
check (report_kind in ('site', 'trade', 'all_trade', 'all_items'));

notify pgrst, 'reload schema';

commit;
