-- Curated backdrop library for the compose path.
-- Pre-generated once during setup, reused across all users' compose requests.

create table if not exists public.scaffold_backdrops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scene_id text not null,
  variant_index integer not null,
  storage_path text not null,
  public_url text not null,
  prompt text,
  unique (scene_id, variant_index)
);

create index if not exists scaffold_backdrops_scene_idx
  on public.scaffold_backdrops (scene_id);

-- Public read (compose runtime needs to fetch backdrop URLs)
alter table public.scaffold_backdrops enable row level security;

drop policy if exists "scaffold_backdrops_public_read" on public.scaffold_backdrops;
create policy "scaffold_backdrops_public_read"
  on public.scaffold_backdrops for select
  to anon, authenticated
  using (true);
