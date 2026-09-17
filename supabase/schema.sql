-- クレスノート initial schema for project crested-note
-- Crest Link IDs (NC-000001 ...) are globally unique and never reused.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles (replaces settings.displayName for the signed-in keeper)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  collection_name text not null default 'クレスノート',
  prefecture text not null default '',
  public_by_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Crest Link (global lifetime identity)
-- ---------------------------------------------------------------------------
create table if not exists public.crest_link_seq (
  id integer primary key default 1 check (id = 1),
  value integer not null default 0 check (value >= 0)
);

insert into public.crest_link_seq (id, value)
values (1, 0)
on conflict (id) do nothing;

create table if not exists public.crest_links (
  id text primary key,
  animal_id uuid,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  current_owner_label text not null default '',
  current_owner_user_id uuid references public.profiles (id) on delete set null,
  owner_history jsonb not null default '[]'::jsonb,
  sire_crest_link_id text not null default '',
  dam_crest_link_id text not null default '',
  origin_kind text not null default 'local' check (origin_kind in ('local', 'ncrested')),
  payload_version integer not null default 1,
  events jsonb not null default '[]'::jsonb,
  constraint crest_links_id_format check (id ~ '^NC-[0-9]{6}$')
);

create table if not exists public.crest_link_transfers (
  id uuid primary key,
  code text not null unique,
  crest_link_id text not null references public.crest_links (id),
  animal_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'redeemed', 'revoked', 'expired')),
  payload_version integer not null default 1
);

-- ---------------------------------------------------------------------------
-- Collection data
-- ---------------------------------------------------------------------------
create table if not exists public.animals (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  crest_link_id text not null default '',
  code text not null default '',
  name text not null default '',
  sex text not null default 'unknown' check (sex in ('male', 'female', 'unknown')),
  hatch_date text not null default '',
  status text not null default 'active'
    check (status in ('active', 'breeding', 'sold', 'deceased')),
  sire_id uuid,
  dam_id uuid,
  morph_label text not null default '',
  traits jsonb not null default '[]'::jsonb,
  trait_levels jsonb not null default '{}'::jsonb,
  notes text not null default '',
  photo_url text not null default '',
  is_public boolean not null default false,
  share_slug text not null default '',
  prefecture text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists animals_crest_link_id_unique
  on public.animals (crest_link_id)
  where crest_link_id <> '';

create unique index if not exists animals_share_slug_unique
  on public.animals (share_slug)
  where share_slug <> '';

create index if not exists animals_user_id_idx on public.animals (user_id);
create index if not exists animals_sire_id_idx on public.animals (sire_id);
create index if not exists animals_dam_id_idx on public.animals (dam_id);

create table if not exists public.animal_genes (
  animal_id uuid not null references public.animals (id) on delete cascade,
  locus_id text not null,
  status text not null,
  primary key (animal_id, locus_id)
);

create table if not exists public.weight_logs (
  id uuid primary key,
  animal_id uuid not null references public.animals (id) on delete cascade,
  weighed_on text not null,
  weight_g numeric not null,
  notes text not null default ''
);

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default '',
  goal text not null default '',
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  created_at timestamptz not null default now()
);

create table if not exists public.breedings (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  male_id uuid not null,
  female_id uuid not null,
  started_on text not null default '',
  ended_on text not null default '',
  status text not null default 'active' check (status in ('active', 'closed')),
  notes text not null default '',
  prediction_id text not null default '',
  project_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.clutches (
  id uuid primary key,
  breeding_id uuid not null references public.breedings (id) on delete cascade,
  laid_on text not null default '',
  notes text not null default ''
);

create table if not exists public.eggs (
  id uuid primary key,
  clutch_id uuid not null references public.clutches (id) on delete cascade,
  expected_hatch_on text not null default '',
  result text not null default 'incubating'
    check (result in ('incubating', 'fertile', 'infertile', 'hatched', 'failed')),
  hatch_animal_id text not null default '',
  notes text not null default ''
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  animal_id uuid not null references public.animals (id) on delete cascade,
  role text not null check (role in ('candidate', 'sire', 'dam', 'offspring')),
  primary key (project_id, animal_id, role)
);

create table if not exists public.predictions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default '',
  male_id text not null default '',
  female_id text not null default '',
  parent_a jsonb not null default '{}'::jsonb,
  parent_b jsonb not null default '{}'::jsonb,
  pairing jsonb not null default '{}'::jsonb,
  breeding_id text not null default '',
  project_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key,
  user_id uuid references public.profiles (id) on delete set null,
  category text not null,
  status text not null default 'open',
  body text not null default '',
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  admin_note text not null default ''
);

-- ---------------------------------------------------------------------------
-- New auth user → empty profile
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Crest Link sequence: only increase, never reuse numbers
-- ---------------------------------------------------------------------------
create or replace function public.prevent_crest_link_seq_decrease()
returns trigger
language plpgsql
as $$
begin
  if new.value < old.value then
    raise exception 'crest_link_seq must never decrease';
  end if;
  return new;
end;
$$;

drop trigger if exists crest_link_seq_no_decrease on public.crest_link_seq;
create trigger crest_link_seq_no_decrease
  before update on public.crest_link_seq
  for each row execute function public.prevent_crest_link_seq_decrease();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.animals enable row level security;
alter table public.animal_genes enable row level security;
alter table public.weight_logs enable row level security;
alter table public.projects enable row level security;
alter table public.breedings enable row level security;
alter table public.clutches enable row level security;
alter table public.eggs enable row level security;
alter table public.project_members enable row level security;
alter table public.predictions enable row level security;
alter table public.feedback enable row level security;
alter table public.crest_links enable row level security;
alter table public.crest_link_transfers enable row level security;
alter table public.crest_link_seq enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists animals_all_own on public.animals;
create policy animals_all_own on public.animals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists genes_all_own on public.animal_genes;
create policy genes_all_own on public.animal_genes
  for all to authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.animals a where a.id = animal_id and a.user_id = auth.uid()));

drop policy if exists weights_all_own on public.weight_logs;
create policy weights_all_own on public.weight_logs
  for all to authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.animals a where a.id = animal_id and a.user_id = auth.uid()));

drop policy if exists projects_all_own on public.projects;
create policy projects_all_own on public.projects
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists breedings_all_own on public.breedings;
create policy breedings_all_own on public.breedings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists clutches_all_own on public.clutches;
create policy clutches_all_own on public.clutches
  for all to authenticated
  using (exists (select 1 from public.breedings b where b.id = breeding_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.breedings b where b.id = breeding_id and b.user_id = auth.uid()));

drop policy if exists eggs_all_own on public.eggs;
create policy eggs_all_own on public.eggs
  for all to authenticated
  using (
    exists (
      select 1
      from public.clutches c
      join public.breedings b on b.id = c.breeding_id
      where c.id = clutch_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clutches c
      join public.breedings b on b.id = c.breeding_id
      where c.id = clutch_id and b.user_id = auth.uid()
    )
  );

drop policy if exists project_members_all_own on public.project_members;
create policy project_members_all_own on public.project_members
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

drop policy if exists predictions_all_own on public.predictions;
create policy predictions_all_own on public.predictions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists crest_links_select_own_animal on public.crest_links;
create policy crest_links_select_own_animal on public.crest_links
  for select to authenticated
  using (
    crest_links.current_owner_user_id = auth.uid()
    or exists (
      select 1
      from public.animals a
      where a.user_id = auth.uid()
        and (
          a.crest_link_id = crest_links.id
          or a.id = crest_links.animal_id
        )
    )
  );

drop policy if exists crest_links_update_own on public.crest_links;
create policy crest_links_update_own on public.crest_links
  for update to authenticated
  using (
    crest_links.current_owner_user_id = auth.uid()
    or exists (
      select 1
      from public.animals a
      where a.user_id = auth.uid()
        and (
          a.crest_link_id = crest_links.id
          or a.id = crest_links.animal_id
        )
    )
  )
  with check (
    crest_links.current_owner_user_id = auth.uid()
    or exists (
      select 1
      from public.animals a
      where a.user_id = auth.uid()
        and (
          a.crest_link_id = crest_links.id
          or a.id = crest_links.animal_id
        )
    )
  );

drop policy if exists transfers_select_own on public.crest_link_transfers;
create policy transfers_select_own on public.crest_link_transfers
  for select to authenticated
  using (
    exists (
      select 1
      from public.animals a
      where a.id = crest_link_transfers.animal_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists transfers_insert_own on public.crest_link_transfers;
create policy transfers_insert_own on public.crest_link_transfers
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.animals a
      where a.id = crest_link_transfers.animal_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists transfers_update_own on public.crest_link_transfers;
create policy transfers_update_own on public.crest_link_transfers
  for update to authenticated
  using (
    exists (
      select 1
      from public.animals a
      where a.id = crest_link_transfers.animal_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.animals a
      where a.id = crest_link_transfers.animal_id
        and a.user_id = auth.uid()
    )
  );

-- Sequence and Crest Link insert: service role / later RPC only (no authenticated insert of new IDs)
revoke all on public.crest_link_seq from anon, authenticated;
grant select, insert, update, delete on public.crest_link_seq to service_role;
