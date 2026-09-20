-- Display keeper numbers (NC-0001) are per-user and must not share crest_link_seq.
-- crest_link_seq stays a singleton (id = 1) for global Crest Link IDs (NC-000001).
-- This migration does not drop or loosen crest_link_seq_id_check.
-- Existing animals, parents, breedings, and genes are not modified.

create table if not exists public.animal_code_seq (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  value integer not null default 0 check (value >= 0)
);

create or replace function public.prevent_animal_code_seq_decrease()
returns trigger
language plpgsql
as $$
begin
  if new.value < old.value then
    raise exception 'animal_code_seq must never decrease';
  end if;
  return new;
end;
$$;

drop trigger if exists animal_code_seq_no_decrease on public.animal_code_seq;
create trigger animal_code_seq_no_decrease
  before update on public.animal_code_seq
  for each row execute function public.prevent_animal_code_seq_decrease();

alter table public.animal_code_seq enable row level security;
revoke all on public.animal_code_seq from anon, authenticated;
grant select, insert, update, delete on public.animal_code_seq to service_role;

insert into public.animal_code_seq (user_id, value)
select
  a.user_id,
  coalesce(
    max(
      case
        when a.code ~ '^NC-[0-9]+$' then substring(a.code from 4)::integer
        else 0
      end
    ),
    0
  )
from public.animals a
where a.user_id is not null
group by a.user_id
on conflict (user_id) do update
set value = greatest(public.animal_code_seq.value, excluded.value);

insert into public.animal_code_seq (user_id, value)
select p.id, 0
from public.profiles p
on conflict (user_id) do nothing;

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
  insert into public.animal_code_seq (user_id, value)
  values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
