-- Public bucket for keeper animal photos. App writes with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animal-photos',
  'animal-photos',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists animal_photos_public_read on storage.objects;
create policy animal_photos_public_read
  on storage.objects
  for select
  using (bucket_id = 'animal-photos');
