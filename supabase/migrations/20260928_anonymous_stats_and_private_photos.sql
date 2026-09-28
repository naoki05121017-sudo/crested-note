-- Anonymous national compare / Japan stats (no animal identity).
-- Private animal rows stay hidden by existing RLS; only SECURITY DEFINER RPCs
-- return aggregates. Private photos are not world-readable.

alter table public.animals
  add column if not exists stats_morph_key text not null default '';

create index if not exists animals_stats_compare_idx
  on public.animals (sex, stats_morph_key);

create or replace function public.stats_age_months(hatch text, on_day text)
returns integer
language sql
immutable
as $$
  select case
    when hatch ~ '^\d{4}-\d{2}-\d{2}$' and on_day ~ '^\d{4}-\d{2}-\d{2}$'
      then greatest(
        0,
        (extract(year from on_day::date)::integer
          - extract(year from hatch::date)::integer) * 12
        + (extract(month from on_day::date)::integer
          - extract(month from hatch::date)::integer)
      )
    else null
  end;
$$;

create or replace function public.stats_is_japan_prefecture(pref text)
returns boolean
language sql
immutable
as $$
  select coalesce(pref, '') = ''
    or pref in (
      '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
      '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
      '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
      '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
      '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
      '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
      '熊本県','大分県','宮崎県','鹿児島県','沖縄県'
    );
$$;

create or replace function public.stats_morph_key_of(a public.animals)
returns text
language sql
immutable
as $$
  select coalesce(nullif(a.stats_morph_key, ''), lower(trim(a.morph_label)), '');
$$;

create or replace function public.japan_crest_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_registered integer;
  v_living integer;
  v_male integer;
  v_female integer;
  v_unknown integer;
  v_weight_sample integer;
  v_mean numeric;
  v_morphs jsonb;
  v_buckets jsonb;
  v_years jsonb;
begin
  select count(*)::integer into v_registered from public.animals;

  select count(*)::integer into v_living
  from public.animals
  where status is distinct from 'deceased';

  select
    count(*) filter (where sex = 'male')::integer,
    count(*) filter (where sex = 'female')::integer,
    count(*) filter (where sex is distinct from 'male' and sex is distinct from 'female')::integer
  into v_male, v_female, v_unknown
  from public.animals
  where status is distinct from 'deceased';

  with latest as (
    select distinct on (animal_id) animal_id, weight_g
    from public.weight_logs
    where weighed_on ~ '^\d{4}-\d{2}-\d{2}$'
    order by animal_id, weighed_on desc
  )
  select count(*)::integer, avg(l.weight_g)
  into v_weight_sample, v_mean
  from latest l
  join public.animals a on a.id = l.animal_id
  where a.status is distinct from 'deceased';

  select coalesce(
    jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label),
    '[]'::jsonb
  )
  into v_morphs
  from (
    select public.stats_morph_key_of(a) as label, count(*)::integer as n
    from public.animals a
    where a.status is distinct from 'deceased'
      and public.stats_morph_key_of(a) <> ''
    group by 1
    having count(*) >= 3
    order by count(*) desc, 1
    limit 12
  ) morphs;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'label', b.label,
        'n', b.n,
        'average', b.average
      )
      order by b.sort
    ),
    '[]'::jsonb
  )
  into v_buckets
  from (
    select
      x.id,
      x.label,
      x.sort,
      count(v.weight_g)::integer as n,
      case
        when count(v.weight_g) >= 5 then avg(v.weight_g)
        else null
      end as average
    from (
      values
        ('0-3', '0〜3ヶ月', 0, 3, 1),
        ('3-6', '3〜6ヶ月', 3, 6, 2),
        ('6-12', '6〜12ヶ月', 6, 12, 3),
        ('12-24', '1〜2年', 12, 24, 4),
        ('24+', '2年以上', 24, 1000, 5)
    ) as x(id, label, min_m, max_m, sort)
    left join (
      select
        public.stats_age_months(a.hatch_date, l.weighed_on) as age_m,
        l.weight_g
      from public.animals a
      join (
        select distinct on (animal_id) animal_id, weighed_on, weight_g
        from public.weight_logs
        where weighed_on ~ '^\d{4}-\d{2}-\d{2}$'
        order by animal_id, weighed_on desc
      ) l on l.animal_id = a.id
      where a.status is distinct from 'deceased'
    ) v on v.age_m is not null and v.age_m >= x.min_m and v.age_m < x.max_m
    group by x.id, x.label, x.sort
  ) b;

  select coalesce(
    jsonb_agg(jsonb_build_object('year', year, 'count', n) order by year),
    '[]'::jsonb
  )
  into v_years
  from (
    select left(hatch_date, 4) as year, count(*)::integer as n
    from public.animals
    where status is distinct from 'deceased'
      and hatch_date ~ '^\d{4}'
    group by 1
  ) y;

  return jsonb_build_object(
    'registered', v_registered,
    'living', v_living,
    'bySex', jsonb_build_object(
      'male', v_male,
      'female', v_female,
      'unknown', v_unknown
    ),
    'morphs', coalesce(v_morphs, '[]'::jsonb),
    'meanLatestWeight', case when coalesce(v_weight_sample, 0) >= 5 then v_mean else null end,
    'weightSample', coalesce(v_weight_sample, 0),
    'buckets', coalesce(v_buckets, '[]'::jsonb),
    'hatchYears', coalesce(v_years, '[]'::jsonb)
  );
end;
$$;

create or replace function public.compare_cohort_stats(
  p_exclude_animal_id uuid,
  p_sex text,
  p_morph_key text,
  p_age_months integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_n integer;
  v_avg numeric;
  v_curve jsonb := '[]'::jsonb;
begin
  with latest as (
    select distinct on (animal_id) animal_id, weighed_on, weight_g
    from public.weight_logs
    where weighed_on ~ '^\d{4}-\d{2}-\d{2}$'
    order by animal_id, weighed_on desc
  ),
  cohort as (
    select a.id
    from public.animals a
    join latest w on w.animal_id = a.id
    where a.id is distinct from p_exclude_animal_id
      and public.stats_is_japan_prefecture(a.prefecture)
      and a.sex = p_sex
      and public.stats_morph_key_of(a) = coalesce(p_morph_key, '')
      and (
        p_age_months is null
        or (
          public.stats_age_months(a.hatch_date, w.weighed_on) is not null
          and abs(
            public.stats_age_months(a.hatch_date, w.weighed_on) - p_age_months
          ) <= 3
        )
      )
  )
  select count(*)::integer, avg(w.weight_g)
  into v_n, v_avg
  from cohort c
  join latest w on w.animal_id = c.id;

  if coalesce(v_n, 0) >= 5 then
    with latest as (
      select distinct on (animal_id) animal_id, weighed_on, weight_g
      from public.weight_logs
      where weighed_on ~ '^\d{4}-\d{2}-\d{2}$'
      order by animal_id, weighed_on desc
    ),
    cohort as (
      select a.id
      from public.animals a
      join latest w on w.animal_id = a.id
      where a.id is distinct from p_exclude_animal_id
        and public.stats_is_japan_prefecture(a.prefecture)
        and a.sex = p_sex
        and public.stats_morph_key_of(a) = coalesce(p_morph_key, '')
        and (
          p_age_months is null
          or (
            public.stats_age_months(a.hatch_date, w.weighed_on) is not null
            and abs(
              public.stats_age_months(a.hatch_date, w.weighed_on) - p_age_months
            ) <= 3
          )
        )
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object('month', month, 'weightG', avg_g)
        order by month
      ),
      '[]'::jsonb
    )
    into v_curve
    from (
      select
        public.stats_age_months(a.hatch_date, wl.weighed_on) as month,
        avg(wl.weight_g) as avg_g
      from cohort c
      join public.animals a on a.id = c.id
      join public.weight_logs wl on wl.animal_id = c.id
      where wl.weighed_on ~ '^\d{4}-\d{2}-\d{2}$'
        and public.stats_age_months(a.hatch_date, wl.weighed_on) is not null
      group by 1
    ) points;
  end if;

  return jsonb_build_object(
    'sampleSize', coalesce(v_n, 0),
    'average', case when coalesce(v_n, 0) >= 5 then v_avg else null end,
    'curve', coalesce(v_curve, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.stats_age_months(text, text) from public;
revoke all on function public.stats_is_japan_prefecture(text) from public;
revoke all on function public.stats_morph_key_of(public.animals) from public;

revoke all on function public.japan_crest_stats() from public;
revoke all on function public.compare_cohort_stats(uuid, text, text, integer) from public;
grant execute on function public.japan_crest_stats() to authenticated;
grant execute on function public.japan_crest_stats() to service_role;
grant execute on function public.compare_cohort_stats(uuid, text, text, integer) to authenticated;

update public.animals
set stats_morph_key = lower(trim(morph_label))
where trim(coalesce(morph_label, '')) <> ''
  and stats_morph_key = '';

update storage.buckets
set public = false
where id = 'animal-photos';

drop policy if exists animal_photos_public_read on storage.objects;

drop policy if exists animal_photos_select_own on storage.objects;
create policy animal_photos_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'animal-photos'
    and exists (
      select 1
      from public.animals a
      where a.id::text = split_part(name, '/', 1)
        and a.user_id = auth.uid()
    )
  );

drop policy if exists animal_photos_select_if_animal_public on storage.objects;
create policy animal_photos_select_if_animal_public
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'animal-photos'
    and exists (
      select 1
      from public.animals a
      where a.id::text = split_part(name, '/', 1)
        and a.is_public = true
    )
  );
