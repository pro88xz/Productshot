# Scaffold — Compound AI for Product Photography

**AMD Developer Hackathon Act II · Track 3 (Unicorn) · Solo Submission**

> Scaffolding intelligence for the real world — cost-aware routing, verified generation, self-healing.

Scaffold is a compound AI system that powers [ProductShot](https://theproductshot.com), a shipped web app used by ecommerce sellers to turn one phone photo into professional product photography. Instead of calling a single image model per request, Scaffold routes each generation through the cheapest architecture that meets the quality bar — while a vision-language verifier watches every output and self-heals when the primary path drifts.

---

## Live artifacts

| Link | What |
|------|------|
| **Live routing dashboard** | REPLACE_WITH_PREVIEW_URL/routing |
| **Live app** | REPLACE_WITH_PREVIEW_URL |
| **Hackathon PR** | https://github.com/pro88xz/Productshot/pull/1 |
| **Branch** | `scaffold-hackathon` |

The routing dashboard is public. Judges can see every routing decision made by the system, live, streaming from Postgres.

---

## The problem

Existing AI product-photo tools call FLUX Kontext (or equivalent) per image at ~$0.04. On complex scenes (lifestyle, outdoor) that works. On simple scenes (studio white, marble flatlay, moody dark, pastel, colorful pop) it's overkill — and Kontext occasionally distorts brand-critical details like buckles, logos, and neck collars. Users don't know when it fails. Sellers ship distorted product images to Amazon and Shopify. Chargebacks follow.

## Scaffold's answer

A per-scene router picks between two paths:

- **Edit path** — FLUX Kontext Pro on Replicate. For complex scenes (`wood-shelf`, `lifestyle-home`, `natural-outdoor`) where AI-driven composition matters.
- **Compose path** — rembg + FLUX Schnell + `sharp` compositing. For simple scenes (`studio-white`, `marble-flatlay`, `moody-dark`, `minimal-pastel`, `colorful-pop`). 20x cheaper. Product preservation is guaranteed by construction — the final image contains the literal source pixels of the product.

Every generation is verified by **Kimi K2.6 vision-language model on Fireworks**, using Fireworks' structured-output JSON schema mode so the verification is grammar-guarded and parseable. Kimi returns a similarity score (0.0–1.0), a one-sentence rationale, and a list of specific distortions.

If the edit path scores below threshold, the router auto-retries on the compose path — the compound-AI self-heal. Both attempts are logged to Supabase `routing_events` for full audit trail.

## Measured performance

Verified on 23+ live production events (visible on the dashboard):

| Path | Avg cost | Avg latency | Avg Kimi score |
|------|----------|-------------|----------------|
| Compose | $0.0018 – $0.006 | 3.9s – 10.6s | 0.92 |
| Edit | $0.04 | 9.8s | 0.90 |

- **38% cheaper** than pure-edit baseline
- **4.3% self-heal rate** — 1 retry fired in the first 23 events, both attempts captured 0.13ms apart in Postgres
- **100% product preservation** on compose-path scenes

---

## Architecture

Pipeline:

1. User uploads product photo → `/api/generate` Next.js route
2. Route checks feature flag (`?scaffold=1` or `USE_SCAFFOLD_ROUTER=true`)
3. Scaffold router (`lib/inference/router.ts`) decides path per scene
4. Compose path: rembg cutout + backdrop from Supabase library + sharp composite
5. Edit path: `replicate.run('flux-kontext-pro')`
6. Kimi K2.6 on Fireworks verifies output using JSON schema structured output
7. If edit score < 0.85, router retries automatically on compose path
8. Every decision, cost, latency, and verification score logged to `routing_events`
9. `/routing` page reads Postgres and renders live dashboard

### Key files

| File | Role |
|------|------|
| `lib/inference/router.ts` | Per-scene routing decisions, verification-driven retry |
| `lib/inference/scenes.ts` | Scene config: preferredPath, prompts, composite settings |
| `lib/inference/providers/replicate.ts` | Edit path — FLUX Kontext Pro |
| `lib/inference/providers/compose.ts` | Compose path — rembg + FLUX Schnell + sharp |
| `lib/inference/verify/kimi.ts` | Fireworks + Kimi K2.6 structured-output verifier |
| `lib/inference/telemetry.ts` | Fire-and-forget insert into `routing_events` |
| `lib/inference/route-adapter.ts` | Adapter between `/api/generate` and Scaffold |
| `app/api/generate/route.ts` | Production route with feature flag + legacy fallback |
| `app/routing/page.tsx` | Live public telemetry dashboard |
| `scripts/seed/backdrops.ts` | One-time backdrop library seeder |
| `supabase/migrations/*_routing_events.sql` | Telemetry schema + RLS |

---

## AMD integration

Kimi K2.6 verification runs on **Fireworks' serverless inference stack, which executes on AMD MI300X GPUs**. Fireworks' grammar-guided structured output — the technique that makes our verification reliable — depends on MI300X's inference-optimized tensor pipelines.

**Post-hackathon roadmap:** containerize the verifier for direct AMD Developer Cloud MI300X deployment, running alongside Kimi as a redundant preservation-focused vision model. Same compound-AI thesis, deeper AMD integration.

---

## Running locally

```bash
git clone https://github.com/pro88xz/Productshot.git
cd Productshot
git checkout scaffold-hackathon
npm install
```

Copy `.env.local.hackathon.template` to `.env.local` and fill in:

```
FIREWORKS_API_KEY=...       # fireworks.ai/account/api-keys
REPLICATE_API_TOKEN=...     # replicate.com/account/api-tokens
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional
ENABLE_SCAFFOLD_ROUTER=true
USE_SCAFFOLD_ROUTER=true
EDIT_MIN_VERIFY_SCORE=0.85
VERIFICATION_SIMILARITY_THRESHOLD=0.72
```

Apply the SQL migrations to Supabase from `supabase/migrations/`.

Seed the backdrop library (one-time, ~$0.075 in Replicate credit):

```bash
npm run seed:backdrops
```

Run the dev server:

```bash
npm run dev
```

---

## Testing the pipeline

```bash
npm run smoke:verify   # Replicate generate + Kimi verify
npm run smoke:router   # Per-scene routing, both paths
npm run smoke:retry    # Verification-driven self-heal demo
npm run check:backdrops # Confirm Supabase backdrop library is populated
```

Each smoke test prints a comparison table with cost, latency, verification score, and Kimi's reasoning.

---

## Running via Docker

```bash
docker build -t scaffold .
docker run --env-file .env.local -p 3000:3000 scaffold
```

---

## Development timeline (9-day sprint)

- **Day 1** — Compound router + Kimi verifier
- **Day 2** — Compose path + per-scene routing + rate-limit resilience
- **Day 3** — Fireworks structured outputs + telemetry + composite polish + retry
- **Day 4** — Wire into `/api/generate` with feature flag + production fallback
- **Day 5** — Live routing dashboard at `/routing`
- **Day 6+** — Documentation, submission, demo video

---

## License

MIT — see LICENSE. Original ProductShot code is my own work. Fireworks, Replicate, Supabase, and Vercel are used per their respective terms.

## Contact

Solo submission, built from Freetown, Sierra Leone.
Team name: **Scaffold**
