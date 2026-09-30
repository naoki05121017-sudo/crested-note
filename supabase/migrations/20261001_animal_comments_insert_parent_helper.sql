-- Fix animal_comments INSERT RLS recursion.
-- Parent lookup used to SELECT the same table under RLS and looped.
-- Does not change animals, photos, reports, or the deleted_at-only UPDATE policy.

create or replace function public.animal_comment_reply_parent_ok(
  p_animal_id uuid,
  p_parent_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    p_parent_id is null
    or exists (
      select 1
      from public.animal_comments parent
      where parent.id = p_parent_id
        and parent.animal_id = p_animal_id
        and parent.parent_id is null
    );
$$;

revoke all on function public.animal_comment_reply_parent_ok(uuid, uuid) from public;
grant execute on function public.animal_comment_reply_parent_ok(uuid, uuid) to authenticated;

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
    and public.animal_comment_reply_parent_ok(animal_id, parent_id)
  );
