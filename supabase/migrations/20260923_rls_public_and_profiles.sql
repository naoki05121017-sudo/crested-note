-- Per-user isolation: public read of published animals; profiles can self-insert.

drop policy if exists animals_select_public on public.animals;
create policy animals_select_public
  on public.animals
  for select
  using (is_public = true);

drop policy if exists genes_select_public on public.animal_genes;
create policy genes_select_public
  on public.animal_genes
  for select
  using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.is_public = true
    )
  );

drop policy if exists weights_select_public on public.weight_logs;
create policy weights_select_public
  on public.weight_logs
  for select
  using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.is_public = true
    )
  );

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());
