-- Anonymous 1–12 month weight means for the growth guide.
-- Returns only month, sampleSize, and averageWeight (null when n < 5).

create or replace function public.growth_guide_month_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'month', month,
          'sampleSize', n,
          'averageWeight', case when n >= 5 then avg_g else null end
        )
        order by month
      )
      from (
        select
          month,
          count(*)::integer as n,
          avg(animal_g) as avg_g
        from (
          select
            a.id,
            public.stats_age_months(a.hatch_date, wl.weighed_on) as month,
            avg(wl.weight_g) as animal_g
          from public.animals a
          join public.weight_logs wl on wl.animal_id = a.id
          where public.stats_is_japan_prefecture(a.prefecture)
            and a.hatch_date ~ '^\d{4}-\d{2}-\d{2}$'
            and wl.weighed_on ~ '^\d{4}-\d{2}-\d{2}$'
            and public.stats_age_months(a.hatch_date, wl.weighed_on) between 1 and 12
          group by a.id, public.stats_age_months(a.hatch_date, wl.weighed_on)
        ) per_animal_month
        group by month
      ) months
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.growth_guide_month_stats() from public;
grant execute on function public.growth_guide_month_stats() to authenticated;
