create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create table if not exists public.push_notice_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  animal_id uuid not null,
  notified_on date not null,
  primary key (user_id, animal_id, notified_on)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_notice_log enable row level security;

drop policy if exists push_subscriptions_all_own on public.push_subscriptions;
create policy push_subscriptions_all_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
