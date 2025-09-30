# Getting Started

A concise end‑to‑end guide to set up, configure, and run this AI Chatbot application locally and in production.

---
## 1. Overview
This project is a Next.js (App Router) application that integrates:
- Vercel AI SDK + Vercel AI Gateway (multi‑provider routing & usage limits)
- Convex (real‑time database, file storage, reactive queries)
- NextAuth (Auth.js) credentials auth (password + guest) with Convex persistence
- (Light) Convex auth helper instance for server utilities
- Redis (optional: rate limiting / caching / sessions)
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- OpenTelemetry (optional; instrumentation stub included)

You will:
1. Create required external accounts
2. Configure environment variables
3. Initialize Convex backend
4. Run locally
5. (Optional) Deploy to Vercel

Technology highlights:
- Next.js 15 (App Router, Server Components, Server Actions)
- React 19 RC (see React 19 release notes for potential API differences)
- AI Gateway centralizes Anthropic (default) or other providers; switchable in one file

---
## 2. External Accounts & Services Needed
| Purpose | Service | Notes / Free Tier |
|---------|---------|-------------------|
| Hosting + AI Gateway + Env Mgmt | Vercel | Simplest deployment path |
| Real‑time DB & File Storage | Convex | Generous free tier |
| (Optional) Redis storage | Vercel Redis | Only if enabling Redis features |
| (Optional) Direct LLM keys | Anthropic / OpenAI / xAI / etc. | Only if bypassing Gateway or adding models |

### 2.1 Vercel Account
Create: https://vercel.com/signup (GitHub OAuth recommended). Install the Vercel GitHub App for automatic deployments.

### 2.2 Convex Account & Project
Create: https://www.convex.dev/signup. You can also let `npx convex dev` create/link a project interactively.

### 2.3 AI Model Access
Defaults use Anthropic Claude Sonnet 4 via the Vercel AI Gateway (see `lib/ai/providers.ts`).
- Local (non‑Vercel) runs require `AI_GATEWAY_API_KEY`.
- Create at: Vercel Dashboard → AI Gateway → Create Gateway → Copy API Key.
- Gateway lets you enforce rate & spend limits centrally.

(Optional) Direct Providers (add keys only if you modify `providers.ts`):
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- xAI: https://x.ai/

### 2.4 Redis (Optional)
If you enable rate limiting or caching that needs Redis:
- Create store: https://vercel.com/docs/redis
- Add `REDIS_URL` to env vars.

---
## 3. Local Prerequisites
Install locally:
- Node.js LTS 20+ (recommended) → https://nodejs.org/
- pnpm → `npm i -g pnpm`
- (Already on macOS) OpenSSL for generating secrets

Verify:
```
node -v
pnpm -v
```

---
## 4. Clone & Install
```
git clone <your-fork-or-repo-url>
cd ai-chatbot
pnpm install
```

---
## 5. Environment Variables
Copy template:
```
cp .env.example .env.local
```
Fill values:
| Variable | Description | How to Obtain |
|----------|-------------|---------------|
| AUTH_SECRET | Random 32+ char secret | `openssl rand -base64 32` or https://generate-secret.vercel.app/32 |
| AI_GATEWAY_API_KEY | Required locally for AI Gateway | Vercel → AI Gateway → API Key |
| CONVEX_DEPLOYMENT | Written by `npx convex dev` | Convex init output |
| NEXT_PUBLIC_CONVEX_URL | Public Convex URL | `npx convex dev` output |
| REDIS_URL | (Optional) Redis connection string | Vercel Redis dashboard |

Never commit `.env.local`.
Further reading:
- Next.js env docs: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- Convex env management: https://docs.convex.dev/production/environment-variables

---
## 6. Initialize Convex
From project root:
```
npx convex dev
```
This will:
1. Authenticate (browser prompt) if first run
2. Create or link a Convex project
3. Deploy schema (`convex/schema.ts`)
4. Generate client code in `convex/_generated/`
5. Populate/update `CONVEX_DEPLOYMENT` & `NEXT_PUBLIC_CONVEX_URL` in `.env.local`

Leave it running in a separate terminal (hot reload for functions & schema).
Docs: https://docs.convex.dev/

---
## 7. Run the App Locally
In a new terminal:
```
pnpm dev
```
Visit: http://localhost:3000
If not authenticated, middleware provisions a guest session automatically.

---
## 8. Authentication Flows
Primary authentication uses NextAuth Credentials providers (see `app/(auth)/auth.ts`).
Providers defined:
- `Credentials` (id: default) for email + password users stored in Convex `users` table.
- `Credentials` (id: `guest`) creates ephemeral guest users (`type: "guest"`).

Middleware (`middleware.ts`) behavior:
- Unauthenticated requests (except auth endpoints) are redirected to `/api/auth/guest?redirectUrl=<original>` to auto‑provision a guest.
- Logged-in non‑guest users visiting `/login` or `/register` are redirected to `/`.

Convex auth helper (`convex/auth.ts`) is retained minimally for server utilities; user identity and sessions are managed by NextAuth JWT cookies.

Security Tips:
- Rotate `AUTH_SECRET` if compromised.
- Enforce stronger password rules (bcrypt‑ts already included) before production.
- Consider adding OAuth providers if desired (update NextAuth config).

---
## 9. AI Models & Provider Configuration
File: `lib/ai/providers.ts`
Default mapping (Gateway):
- `chat-model` → `anthropic/claude-sonnet-4`
- `chat-model-reasoning` → `anthropic/claude-sonnet-4` wrapped with `extractReasoningMiddleware({ tagName: "think" })`
- `title-model` → `anthropic/claude-sonnet-4`
- `artifact-model` → `anthropic/claude-sonnet-4`

Test environment swaps to mocks (`lib/ai/models.mock.ts`) when `PLAYWRIGHT` or related env vars are set.

To change models: update `gateway.languageModel("provider/model")` calls. Provider list: https://ai-sdk.dev/providers/ai-sdk-providers

---
## 10. Data Model
Defined in `convex/schema.ts`:
- `users`: email, password?, type (`guest` | `regular`), timestamps.
- `chats`: title, externalId (client UUID), userId, visibility, lastContext.
- `messages`: role, parts (structured content), attachments.
- `votes`: per message feedback.
- `documents`: text/code/image/sheet artifacts.
- `suggestions`: AI or user suggestions tied to documents.
- `streams`: active streaming sessions (tracking).
- `files`: metadata + `_storage` reference for uploads.

Indexes support efficient querying (see schema for details). Adjust schema then re-run `npx convex dev`.

---
## 11. File Uploads
Convex handles storage via `_storage` references inside the `files` table. Use generated Convex mutations/queries for uploading & retrieving. Docs: https://docs.convex.dev/file-storage

---
## 12. Styling & UI
- Tailwind CSS v4
- shadcn/ui component primitives (Radix UI)
- Theming via `next-themes`

Docs:
- Tailwind: https://tailwindcss.com/
- shadcn/ui: https://ui.shadcn.com/

---
## 13. Testing
Playwright configured (`playwright.config.ts`). Run:
```
pnpm test
```
The `PLAYWRIGHT` env variable is set automatically in the test script to enable mocked providers.
Docs: https://playwright.dev/

---
## 14. Linting & Formatting
Biome (via Ultracite wrapper scripts):
```
pnpm lint
pnpm format
```
Docs: https://biomejs.dev/

---
## 15. Deployment to Vercel
1. Push repo to GitHub.
2. Vercel → New Project → Import Repo.
3. Framework auto-detected (Next.js).
4. Add Environment Variables (copy from `.env.local` except `AI_GATEWAY_API_KEY` if using Vercel OIDC; you may still include it for explicit control).
5. Deploy.

Post‑deploy:
- Check build & runtime logs.
- Verify AI Gateway usage metrics.
- Confirm Convex deployment region and env variables.

Custom Domains: https://vercel.com/docs/projects/domains

---
## 16. Production Hardening Checklist
- Set model usage & rate limits in AI Gateway dashboard.
- Add request rate limiting (Edge Middleware + Redis) if exposing public endpoints.
- Monitor OpenTelemetry traces (extend `instrumentation.ts`).
- Implement password strength & optional email verification before opening to users.
- Review data retention & implement cleanup tasks.
- Backup / export Convex data periodically if required for compliance.

---
## 17. Customization Pointers
| Goal | Where to Look |
|------|---------------|
| Add new chat tool | `lib/ai/tools/*` |
| Modify prompts | `lib/ai/prompts.ts` |
| Change model list | `lib/ai/providers.ts` + model selector UI |
| Add artifact/doc kinds | `convex/schema.ts` + related components |
| Extend auth (OAuth) | Add providers in `auth.ts` & update UI |
| Modify middleware logic | `middleware.ts` |
| Add telemetry spans | `instrumentation.ts` / server actions |

---
## 18. Troubleshooting
| Symptom | Fix |
|---------|-----|
| Convex URL undefined | Re-run `npx convex dev` & inspect `.env.local` |
| 401 / redirect loops | Ensure `AUTH_SECRET` consistent; clear cookies; check middleware conditions |
| AI requests fail locally | Set `AI_GATEWAY_API_KEY` |
| Test models not mocked | Confirm `PLAYWRIGHT=True` exported by test script |
| Type errors in Convex generated code | Delete `convex/_generated` then `npx convex dev` |
| Styles missing | Ensure `app/globals.css` imported in `app/layout.tsx` |
| Model switch not applied | Restart dev server after editing `providers.ts` |

---
## 19. Further Reading
- Next.js App Router: https://nextjs.org/docs/app
- Vercel AI SDK: https://ai-sdk.dev/docs/introduction
- Convex Functions: https://docs.convex.dev/functions
- Auth.js (NextAuth): https://authjs.dev
- OpenTelemetry on Vercel: https://vercel.com/docs/observability/instrumentation

---
## 20. Quick Reference Commands
```
# Install deps
pnpm install
# Start Convex (watch)
npx convex dev
# Run dev server
pnpm dev
# Tests
pnpm test
# Lint / format
pnpm lint
pnpm format
```

---
## 21. Support & Contributions
Issues & PRs welcome. Standard fork → branch → PR workflow.

---
All set — happy building!
