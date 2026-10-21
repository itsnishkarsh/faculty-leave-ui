-- Restrict profile department values to the institution's published department list.
-- NOT VALID preserves any older values but enforces the list on all future inserts/updates.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_department_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_department_allowed
      check (
        department is null or department in (
          'Computer Engineering',
          'Information Technology',
          'Electronics & Tele-Communication',
          'Electronics and Computer Science',
          'Mechanical Engineering',
          'Civil Engineering',
          'Computer Science and Engineering (Cyber Security)',
          'Mechanical and Mechatronics Engineering (Additive Manufacturing)',
          'Artificial Intelligence & Machine Learning',
          'Artificial Intelligence & Data Science',
          'Computer Science and Engineering (IoT)'
        )
      ) not valid;
  end if;
end;
$$;
