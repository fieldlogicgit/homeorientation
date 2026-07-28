alter table public.profiles
drop constraint if exists profiles_role_check;

update public.profiles
set role = 'foreman'
where role in ('manager', 'site_user', 'trade_user');

alter table public.profiles
alter column role set default 'foreman';

alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'foreman'));

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
$$;
