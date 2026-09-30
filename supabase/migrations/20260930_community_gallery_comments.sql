-- Community gallery comments + extra album rows.
-- Does not change animals.photo_url, Japan/compare RPCs, or existing animal RLS.
-- Comment posting limits can be added later on profiles without renaming these tables.

create table if not exists public.animal_photos (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists animal_photos_animal_sort_idx
  on public.animal_photos (animal_id, sort_order, created_at);

create table if not exists public.animal_comments (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.animal_comments (id) on delete cascade,
  body text not null,
  author_nickname text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint animal_comments_body_len check (char_length(btrim(body)) between 1 and 500)
);

create index if not exists animal_comments_animal_created_idx
  on public.animal_comments (animal_id, created_at);

create table if not exists public.animal_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.animal_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'other',
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

alter table public.animal_photos enable row level security;
alter table public.animal_comments enable row level security;
alter table public.animal_comment_reports enable row level security;

drop policy if exists animal_photos_select_public on public.animal_photos;
create policy animal_photos_select_public
  on public.animal_photos
  for select
  using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.is_public = true
    )
  );

drop policy if exists animal_photos_all_own on public.animal_photos;
create policy animal_photos_all_own
  on public.animal_photos
  for all
  to authenticated
  using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.user_id = auth.uid()
    )
  );

drop policy if exists animal_comments_select_public on public.animal_comments;
create policy animal_comments_select_public
  on public.animal_comments
  for select
  using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.is_public = true
    )
  );

drop policy if exists animal_comments_insert_auth on public.animal_comments;
create policy animal_comments_insert_auth
  on public.animal_comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.animals a
      where a.id = animal_id and a.is_public = true
    )
    and (
      parent_id is null
      or exists (
        select 1 from public.animal_comments parent
        where parent.id = parent_id
          and parent.animal_id = animal_comments.animal_id
          and parent.parent_id is null
      )
    )
  );

drop policy if exists animal_comments_update_soft_delete on public.animal_comments;
create policy animal_comments_update_soft_delete
  on public.animal_comments
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.animals a
      where a.id = animal_id and a.user_id = auth.uid()
    )
  )
  with check (
    user_id = animal_comments.user_id
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.animals a
        where a.id = animal_id and a.user_id = auth.uid()
      )
    )
  );

drop policy if exists animal_comment_reports_insert_own on public.animal_comment_reports;
create policy animal_comment_reports_insert_own
  on public.animal_comment_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists animal_comment_reports_select_own on public.animal_comment_reports;
create policy animal_comment_reports_select_own
  on public.animal_comment_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());
