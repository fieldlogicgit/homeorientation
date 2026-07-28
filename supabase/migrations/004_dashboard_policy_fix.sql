create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

drop policy if exists "profiles read own org" on public.profiles;

create policy "profiles read own org"
on public.profiles for select
using (
  id = auth.uid()
  or organization_id = public.current_organization_id()
);
