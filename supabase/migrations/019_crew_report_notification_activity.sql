alter table public.punch_items
  add column if not exists shared_note_updated_at timestamptz,
  add column if not exists shared_note_source text;

comment on column public.punch_items.shared_note_updated_at is
  'Timestamp of the latest shared note change for notification activity.';

comment on column public.punch_items.shared_note_source is
  'Origin of the latest shared note change, such as field_app or crew_report.';

create or replace function public.track_shared_note_activity()
returns trigger
language plpgsql
as $$
begin
  if new.shared_note is distinct from old.shared_note then
    new.shared_note_updated_at = now();
    new.shared_note_source = 'field_app';
  end if;
  return new;
end;
$$;

drop trigger if exists punch_items_track_shared_note_activity on public.punch_items;
create trigger punch_items_track_shared_note_activity
before update of shared_note on public.punch_items
for each row execute function public.track_shared_note_activity();

notify pgrst, 'reload schema';
