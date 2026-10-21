-- Role management and department-scoped HOD access for the Faculty Leave Portal.
-- Run once in Supabase SQL Editor while signed in as the project owner.

alter table public.profiles add column if not exists department text;

create or replace function private.current_department()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.department from public.profiles as p where p.id = (select auth.uid()) limit 1;
$$;

create or replace function private.is_in_my_department(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as target
    where target.id = target_user_id
      and target.department is not null
      and target.department = private.current_department()
  );
$$;

create or replace function public.admin_set_profile_access(
  target_user_id uuid,
  new_role text,
  new_department text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
  remaining_admins bigint;
begin
  if (select auth.uid()) is null or not private.has_role(array['admin']::text[]) then
    raise exception 'Only an administrator can change portal access.' using errcode = '42501';
  end if;

  if new_role is null or new_role not in ('faculty', 'hod', 'admin') then
    raise exception 'Role must be faculty, hod, or admin.' using errcode = '22023';
  end if;

  if new_role = 'hod' and nullif(trim(new_department), '') is null then
    raise exception 'A department is required for HOD access.' using errcode = '22023';
  end if;

  -- Serialize administrator role changes so two admins cannot demote each other concurrently.
  perform p.id from public.profiles as p where p.role = 'admin' order by p.id for update;

  select p.role into current_role from public.profiles as p where p.id = target_user_id for update;
  if current_role is null then
    raise exception 'Profile was not found.' using errcode = 'P0002';
  end if;

  if target_user_id = (select auth.uid()) and new_role <> current_role then
    raise exception 'You cannot change your own administrator role.' using errcode = '42501';
  end if;

  if current_role = 'admin' and new_role <> 'admin' then
    select count(*) into remaining_admins from public.profiles as p where p.role = 'admin';
    if remaining_admins <= 1 then
      raise exception 'The last administrator cannot be demoted.' using errcode = '23514';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      department = case when new_role = 'admin' then null else nullif(trim(new_department), '') end
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_profile_access(uuid, text, text) from public, anon;
grant execute on function public.admin_set_profile_access(uuid, text, text) to authenticated;
revoke all on function private.current_department() from public, anon;
revoke all on function private.is_in_my_department(uuid) from public, anon;
grant execute on function private.current_department() to authenticated;
grant execute on function private.is_in_my_department(uuid) to authenticated;

-- Replace existing policies so older broad manager policies cannot bypass the department boundary.
do $$
declare policy_row record;
begin
  for policy_row in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', policy_row.policyname);
  end loop;
  for policy_row in select policyname from pg_policies where schemaname = 'public' and tablename = 'leave_requests' loop
    execute format('drop policy %I on public.leave_requests', policy_row.policyname);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
grant select on public.profiles to authenticated;
grant select on public.leave_requests to authenticated;
revoke insert, update on public.leave_requests from authenticated;
grant insert (faculty_id, leave_type, start_date, end_date, substitute, reason) on public.leave_requests to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.leave_requests to authenticated;

create policy "profiles_select_self_admin_department" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or private.has_role(array['admin']::text[])
  or (private.has_role(array['hod']::text[]) and department is not null and department = private.current_department())
);

create policy "leave_select_self_admin_department" on public.leave_requests
for select to authenticated
using (
  faculty_id = (select auth.uid())
  or private.has_role(array['admin']::text[])
  or (private.has_role(array['hod']::text[]) and private.is_in_my_department(faculty_id))
);

create policy "leave_insert_self_pending" on public.leave_requests
for insert to authenticated
with check (faculty_id = (select auth.uid()) and status = 'pending');

create policy "leave_review_department_pending" on public.leave_requests
for update to authenticated
using (
  status = 'pending'
  and (
    private.has_role(array['admin']::text[])
    or (private.has_role(array['hod']::text[]) and private.is_in_my_department(faculty_id))
  )
)
with check (
  status in ('approved', 'rejected')
  and reviewed_by = (select auth.uid())
  and (
    private.has_role(array['admin']::text[])
    or (private.has_role(array['hod']::text[]) and private.is_in_my_department(faculty_id))
  )
);

