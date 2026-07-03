-- Scaffold routing telemetry.
-- Every routing decision + result logged for the demo dashboard.
-- Judges can watch this table live during the pitch.

create table if not exists public.routing_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Foreign key to the generation row (nullable — smoke tests have no generation)
  generation_id uuid references public.generations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  -- The request
  scene_id text not null,
  source_image_url text,

  -- The routing decision
  path text not null check (path in ('edit', 'compose')),
  primary_provider text not null,
  fallback_provider text,
  was_fallback boolean not null default false,
  decision_reason text,

  -- The generation result
  tier text not null,
  cost_usd numeric(10, 6) not null,
  latency_ms integer not null,
  provider_request_id text,
  output_url text,

  -- Compose-path sub-step breakdown (nullable for edit path)
  rembg_ms integer,
  scene_gen_ms integer,
  composite_ms integer,
  rembg_cost_usd numeric(10, 6),
  scene_gen_cost_usd numeric(10, 6),

  -- Kimi verification (nullable — verification may fail non-fatally)
  verify_score numeric(4, 3),
  verify_reasoning text,
  verify_concerns text[],
  verify_latency_ms integer,
  verify_cost_usd numeric(10, 6),
  verify_passed boolean, -- verify_score >= threshold at insert time

  -- Total roll-up (cost + verify_cost combined)
  total_cost_usd numeric(10, 6) not null
);

-- Indexes for demo dashboard queries
create index if not exists routing_events_created_at_idx on public.routing_events (created_at desc);
create index if not exists routing_events_user_id_idx on public.routing_events (user_id);
create index if not exists routing_events_path_idx on public.routing_events (path);
create index if not exists routing_events_scene_id_idx on public.routing_events (scene_id);

-- RLS: users can read their own events; service role writes everything
alter table public.routing_events enable row level security;

create policy "routing_events_select_own"
  on public.routing_events for select
  to authenticated
  using (user_id = auth.uid());

-- Public read-only view for the demo dashboard (aggregates, no PII)
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
  round(sum(total_cost_usd)::numeric, 4) as total_cost_usd
from public.routing_events
where created_at > now() - interval '24 hours'
group by 1, 2, 3
order by 1 desc;

grant select on public.routing_stats to anon, authenticated;
