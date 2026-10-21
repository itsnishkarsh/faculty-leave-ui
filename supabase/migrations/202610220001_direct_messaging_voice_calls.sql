-- Private one-to-one member messaging and WebRTC voice-call signaling.
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_no_self_message check (sender_id <> recipient_id)
);
create index if not exists direct_messages_sender_time_idx on public.direct_messages(sender_id, created_at desc);
create index if not exists direct_messages_recipient_time_idx on public.direct_messages(recipient_id, created_at desc);
alter table public.direct_messages enable row level security;
grant select on public.direct_messages to authenticated;
grant insert (sender_id, recipient_id, body) on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;
create policy "direct_messages_participants_read" on public.direct_messages for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "direct_messages_sender_insert" on public.direct_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and recipient_id <> (select auth.uid()) and exists (select 1 from public.profiles p where p.id = recipient_id));
create policy "direct_messages_recipient_mark_read" on public.direct_messages for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()) and read_at is not null);

create or replace function public.portal_directory()
returns table (id uuid, full_name text, role text, department text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, p.role, p.department
  from public.profiles p
  where (select auth.uid()) is not null and p.id <> (select auth.uid())
  order by p.full_name;
$$;
revoke all on function public.portal_directory() from public, anon;
grant execute on function public.portal_directory() to authenticated;

create table if not exists public.voice_calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_calls_no_self_call check (caller_id <> callee_id)
);
create index if not exists voice_calls_callee_status_idx on public.voice_calls(callee_id, status, created_at desc);
create table if not exists public.voice_call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.voice_calls(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice', 'decline', 'hangup')),
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists voice_call_signals_call_time_idx on public.voice_call_signals(call_id, created_at);
alter table public.voice_calls enable row level security;
alter table public.voice_call_signals enable row level security;
grant select on public.voice_calls to authenticated;
grant insert (caller_id, callee_id) on public.voice_calls to authenticated;
grant update (status, updated_at) on public.voice_calls to authenticated;
grant select, insert on public.voice_call_signals to authenticated;
create policy "voice_calls_participants_read" on public.voice_calls for select to authenticated
  using (caller_id = (select auth.uid()) or callee_id = (select auth.uid()));
create policy "voice_calls_caller_create" on public.voice_calls for insert to authenticated
  with check (caller_id = (select auth.uid()) and callee_id <> (select auth.uid()) and exists (select 1 from public.profiles p where p.id = callee_id));
create policy "voice_calls_participants_update" on public.voice_calls for update to authenticated
  using (caller_id = (select auth.uid()) or callee_id = (select auth.uid()))
  with check ((caller_id = (select auth.uid()) or callee_id = (select auth.uid())) and status in ('ringing', 'accepted', 'declined', 'ended'));
create policy "voice_call_signals_participants_read" on public.voice_call_signals for select to authenticated
  using (exists (select 1 from public.voice_calls c where c.id = call_id and (c.caller_id = (select auth.uid()) or c.callee_id = (select auth.uid()))));
create policy "voice_call_signals_participants_send" on public.voice_call_signals for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (select 1 from public.voice_calls c where c.id = call_id and (c.caller_id = (select auth.uid()) or c.callee_id = (select auth.uid()))));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'voice_calls') then
    alter publication supabase_realtime add table public.voice_calls;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'voice_call_signals') then
    alter publication supabase_realtime add table public.voice_call_signals;
  end if;
end;
$$;
