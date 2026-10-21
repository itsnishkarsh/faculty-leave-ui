-- Enforce the contact rules in SQL as well as the UI, and add scoped announcements.
create or replace function private.can_contact_user(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles me join public.profiles target on target.id = target_user_id
    where me.id = (select auth.uid()) and target.id <> me.id
      and (me.role = 'admin'
        or (me.role = 'hod' and me.department is not null and target.department = me.department)
        or (me.role = 'faculty' and (target.role = 'admin' or (me.department is not null and target.department = me.department))))
  );
$$;
revoke all on function private.can_contact_user(uuid) from public, anon;
grant execute on function private.can_contact_user(uuid) to authenticated;

create or replace function public.portal_directory()
returns table (id uuid, full_name text, role text, department text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, p.role, p.department from public.profiles p
  where (select auth.uid()) is not null and p.id <> (select auth.uid()) and private.can_contact_user(p.id)
  order by p.full_name;
$$;
revoke all on function public.portal_directory() from public, anon;
grant execute on function public.portal_directory() to authenticated;

drop policy if exists "direct_messages_participants_read" on public.direct_messages;
drop policy if exists "direct_messages_sender_insert" on public.direct_messages;
drop policy if exists "direct_messages_recipient_mark_read" on public.direct_messages;
create policy "direct_messages_contact_participants_read" on public.direct_messages for select to authenticated
  using ((sender_id = (select auth.uid()) and private.can_contact_user(recipient_id)) or (recipient_id = (select auth.uid()) and private.can_contact_user(sender_id)));
create policy "direct_messages_sender_insert_scoped" on public.direct_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.can_contact_user(recipient_id));
create policy "direct_messages_recipient_mark_read_scoped" on public.direct_messages for update to authenticated
  using (recipient_id = (select auth.uid()) and private.can_contact_user(sender_id))
  with check (recipient_id = (select auth.uid()) and read_at is not null and private.can_contact_user(sender_id));

drop policy if exists "voice_calls_participants_read" on public.voice_calls;
drop policy if exists "voice_calls_caller_create" on public.voice_calls;
drop policy if exists "voice_calls_participants_update" on public.voice_calls;
create policy "voice_calls_contact_participants_read" on public.voice_calls for select to authenticated
  using ((caller_id = (select auth.uid()) and private.can_contact_user(callee_id)) or (callee_id = (select auth.uid()) and private.can_contact_user(caller_id)));
create policy "voice_calls_caller_create_scoped" on public.voice_calls for insert to authenticated
  with check (caller_id = (select auth.uid()) and private.can_contact_user(callee_id));
create policy "voice_calls_contact_participants_update" on public.voice_calls for update to authenticated
  using ((caller_id = (select auth.uid()) and private.can_contact_user(callee_id)) or (callee_id = (select auth.uid()) and private.can_contact_user(caller_id)))
  with check ((caller_id = (select auth.uid()) and private.can_contact_user(callee_id)) or (callee_id = (select auth.uid()) and private.can_contact_user(caller_id)));

drop policy if exists "voice_call_signals_participants_read" on public.voice_call_signals;
drop policy if exists "voice_call_signals_participants_send" on public.voice_call_signals;
create policy "voice_call_signals_contact_participants_read" on public.voice_call_signals for select to authenticated
  using (exists (select 1 from public.voice_calls c where c.id = call_id and ((c.caller_id = (select auth.uid()) and private.can_contact_user(c.callee_id)) or (c.callee_id = (select auth.uid()) and private.can_contact_user(c.caller_id)))));
create policy "voice_call_signals_contact_participants_send" on public.voice_call_signals for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (select 1 from public.voice_calls c where c.id = call_id and ((c.caller_id = (select auth.uid()) and private.can_contact_user(c.callee_id)) or (c.callee_id = (select auth.uid()) and private.can_contact_user(c.caller_id)))));

create table if not exists public.portal_announcements (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('all', 'department')),
  department text,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint portal_announcement_scope_department check ((scope = 'all' and department is null) or (scope = 'department' and department is not null))
);
create index if not exists portal_announcements_created_idx on public.portal_announcements(created_at desc);
alter table public.portal_announcements enable row level security;
grant select on public.portal_announcements to authenticated;
grant insert (sender_id, scope, department, body) on public.portal_announcements to authenticated;
create policy "portal_announcements_scoped_read" on public.portal_announcements for select to authenticated
  using (private.has_role(array['admin']::text[]) or scope = 'all' or (scope = 'department' and department = private.current_department()));
create policy "portal_announcements_admin_or_hod_send" on public.portal_announcements for insert to authenticated
  with check (sender_id = (select auth.uid()) and ((private.has_role(array['admin']::text[]) and ((scope = 'all' and department is null) or (scope = 'department' and department is not null))) or (private.has_role(array['hod']::text[]) and scope = 'department' and department = private.current_department())));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_announcements') then
    alter publication supabase_realtime add table public.portal_announcements;
  end if;
end;
$$;
