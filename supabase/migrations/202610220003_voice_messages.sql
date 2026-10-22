create table if not exists public.voice_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  duration_seconds integer not null check (duration_seconds between 1 and 120),
  created_at timestamptz not null default now(),
  constraint voice_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists voice_messages_recipient_time_idx
  on public.voice_messages(recipient_id, created_at desc);
create index if not exists voice_messages_sender_time_idx
  on public.voice_messages(sender_id, created_at desc);

alter table public.voice_messages enable row level security;
grant select on public.voice_messages to authenticated;
grant insert (sender_id, recipient_id, object_path, duration_seconds) on public.voice_messages to authenticated;

create policy "voice_messages_contact_participants_read" on public.voice_messages
  for select to authenticated
  using (
    (sender_id = (select auth.uid()) and private.can_contact_user(recipient_id))
    or (recipient_id = (select auth.uid()) and private.can_contact_user(sender_id))
  );

create policy "voice_messages_sender_insert" on public.voice_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and private.can_contact_user(recipient_id)
    and object_path like sender_id::text || '/' || recipient_id::text || '/%'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-messages', 'voice-messages', false, 10485760, array['audio/webm', 'audio/mp4', 'audio/ogg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "voice_messages_upload_scoped" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.can_contact_user(((storage.foldername(name))[2])::uuid)
  );

create policy "voice_messages_list_scoped" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voice-messages'
    and (
      ((storage.foldername(name))[1] = (select auth.uid())::text
        and private.can_contact_user(((storage.foldername(name))[2])::uuid))
      or
      ((storage.foldername(name))[2] = (select auth.uid())::text
        and private.can_contact_user(((storage.foldername(name))[1])::uuid))
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'voice_messages'
  ) then
    alter publication supabase_realtime add table public.voice_messages;
  end if;
end;
$$;
