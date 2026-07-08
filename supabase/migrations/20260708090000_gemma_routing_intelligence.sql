-- Gemma routing-intelligence columns for the Scaffold router.
-- Additive only — no changes to existing columns, constraints, or policies.
-- NOTE: applied directly via Supabase SQL Editor on 2026-07-08, this file
-- exists for repo history/parity.

alter table public.routing_events
  add column if not exists gemma_recommended_path text check (gemma_recommended_path in ('edit', 'compose')),
  add column if not exists gemma_confidence numeric(4, 3),
  add column if not exists gemma_reasoning text,
  add column if not exists gemma_risk_factors text[],
  add column if not exists gemma_product_category text,
  add column if not exists gemma_used_fallback boolean,
  add column if not exists gemma_overrode_static boolean,
  add column if not exists gemma_latency_ms integer,
  add column if not exists gemma_cost_usd numeric(10, 6);

create index if not exists routing_events_gemma_overrode_idx
  on public.routing_events (gemma_overrode_static)
  where gemma_overrode_static = true;

create or replace view public.routing_stats as
select
  date_trunc('minute', created_at) as minute,
  path,
  scene_id,
  count(*) as request_count,
  round(avg(cost_usd)::numeric, 6) as avg_cost_usd,
  round(avg(latency_ms)::numeric, 1) as avg_latency_ms,
  round(avg(verify_score)::numeric, 3) as avg_verify_score,
  sum(case when verify_passed then 1 else 0 end)::int as passed_count,
  sum(case when verify_passed = false then 1 else 0 end)::int as failed_count,
  round(sum(total_cost_usd)::numeric, 4) as total_cost_usd,
  round(avg(gemma_confidence)::numeric, 3) as avg_gemma_confidence,
  sum(case when gemma_overrode_static then 1 else 0 end)::int as gemma_override_count,
  sum(case when gemma_used_fallback then 1 else 0 end)::int as gemma_fallback_count,
  round(sum(gemma_cost_usd)::numeric, 6) as gemma_total_cost_usd
from public.routing_events
where created_at > now() - interval '24 hours'
group by 1, 2, 3
order by 1 desc;

grant select on public.routing_stats to anon, authenticated;
