-- Request-scoped messages and callback requests.
create table if not exists public.leave_messages (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists leave_messages_request_created_idx
  on public.leave_messages (leave_request_id, created_at);

create table if not exists public.leave_callback_requests (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  phone text not null check (char_length(trim(phone)) between 7 and 30),
  preferred_time text not null check (char_length(trim(preferred_time)) between 2 and 120),
  note text check (note is null or char_length(trim(note)) <= 1000),
  status text not null default 'open' check (status in ('open', 'contacted', 'closed')),
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leave_callback_request_id_created_idx
  on public.leave_callback_requests (leave_request_id, created_at desc);

alter table public.leave_messages enable row level security;
alter table public.leave_callback_requests enable row level security;

grant select on public.leave_messages to authenticated;
grant insert (leave_request_id, sender_id, body) on public.leave_messages to authenticated;
grant select on public.leave_callback_requests to authenticated;
grant insert (leave_request_id, requester_id, phone, preferred_time, note) on public.leave_callback_requests to authenticated;
grant update (status, handled_by) on public.leave_callback_requests to authenticated;

create policy "leave_messages_read_participants" on public.leave_messages
for select to authenticated
using (
  exists (
    select 1 from public.leave_requests as request
    where request.id = leave_request_id
  )
);

create policy "leave_messages_send_participants" on public.leave_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.leave_requests as request
    where request.id = leave_request_id
  )
);

create policy "leave_callbacks_read_participants" on public.leave_callback_requests
for select to authenticated
using (
  exists (
    select 1 from public.leave_requests as request
    where request.id = leave_request_id
  )
);

create policy "leave_callbacks_create_request_owner" on public.leave_callback_requests
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1 from public.leave_requests as request
    where request.id = leave_request_id
      and request.faculty_id = (select auth.uid())
  )
);

create policy "leave_callbacks_manage_reviewers" on public.leave_callback_requests
for update to authenticated
using (
  exists (
    select 1 from public.leave_requests as request
    where request.id = leave_request_id
      and (
        private.has_role(array['admin']::text[])
        or (private.has_role(array['hod']::text[]) and private.is_in_my_department(request.faculty_id))
      )
  )
)
with check (
  status in ('open', 'contacted', 'closed')
  and (handled_by is null or handled_by = (select auth.uid()))
  and exists (
    select 1 from public.leave_requests as request
    where request.id = leave_request_id
      and (
        private.has_role(array['admin']::text[])
        or (private.has_role(array['hod']::text[]) and private.is_in_my_department(request.faculty_id))
      )
  )
);

-- Realtime refreshes the open conversation when another participant posts or updates a callback.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leave_messages'
  ) then
    alter publication supabase_realtime add table public.leave_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leave_callback_requests'
  ) then
    alter publication supabase_realtime add table public.leave_callback_requests;
  end if;
end;
$$;
