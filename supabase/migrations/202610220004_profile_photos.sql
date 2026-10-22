alter table public.profiles add column if not exists avatar_path text;

grant update (avatar_path) on public.profiles to authenticated;
drop policy if exists "profiles_update_own_avatar" on public.profiles;
create policy "profiles_update_own_avatar" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_photos_owner_upload" on storage.objects;
create policy "profile_photos_owner_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profile_photos_scoped_read" on storage.objects;
create policy "profile_photos_scoped_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.has_role(array['admin']::text[])
      or (private.has_role(array['hod']::text[]) and private.is_in_my_department(((storage.foldername(name))[1])::uuid))
    )
  );

drop policy if exists "profile_photos_owner_delete" on storage.objects;
create policy "profile_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
