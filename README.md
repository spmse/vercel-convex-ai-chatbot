<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a> ·
  <a href="docs/STACK_INSTRUCTIONS.md"><strong>Stack Guide</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Convex](https://convex.dev) for real-time database, authentication, and file storage
  - Seamless integration with Next.js and React
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication integrated with Convex
 - Artifact System with Lazy Loading
   - Pluggable multi-kind artifacts (text, code, image, sheet) with streaming updates
   - Dynamic, on-demand loading of heavier editor bundles (CodeMirror, ProseMirror, grid) to minimize initial payload
   - Buffered stream handling so no output is lost while artifact modules load
 - Strong Developer Experience
   - Biome + custom lint (ultracite) for formatting & quality
   - Playwright end-to-end tests
   - Type-safe Convex schema & generated client

## Convex Backend

This template uses [Convex](https://convex.dev) as the backend platform, providing:

- **Real-time Database**: Reactive queries that automatically update your UI when data changes
- **File Storage**: Built-in file upload and storage capabilities
- **Authentication**: Seamless integration with NextAuth.js for user management
- **Type Safety**: Full TypeScript support from database to frontend

### Convex Integration

The application uses Convex for:
- **User Management**: Storing user accounts and authentication data
- **Chat Storage**: Persistent chat history with real-time updates
- **Message Handling**: Efficient storage and retrieval of chat messages
- **Document Management**: Artifact and document storage with versioning
- **File Uploads**: Direct file storage with upload URLs
- **Vote Tracking**: User feedback and voting on messages
 - **Suggestions**: Inline document suggestions and resolution tracking
 - **Streams**: Lightweight persisted stream tracking for resumable interactions

## First Start Setup

To set up the project for the first time:

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up Convex**:
   ```bash
   npx convex dev
   ```
   This will:
   - Create a new Convex project (or connect to existing)
   - Set up your development environment
   - Deploy the database schema and functions

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in:
   - AI Gateway or direct LLM provider keys
   - NextAuth configuration
   - Convex URL (automatically set by `npx convex dev`)

4. **Start Development**:
   ```bash
   pnpm dev
   ```

The Convex setup will automatically handle database schema deployment and provide you with the necessary environment variables.

## Architecture Overview

### High-Level Flow

1. User authenticates via Auth.js (NextAuth) with credentials or guest pathway.
2. Frontend initiates chat/document actions invoking Convex mutations & queries.
3. AI responses stream token/part deltas over a custom stream channel.
4. `DataStreamHandler` buffers deltas until the corresponding artifact module is loaded.
5. Lazy-loaded artifact module applies `onStreamPart` logic to incrementally build content (e.g., text, code diff, sheet cells, image metadata).
6. Persisted artifacts/documents can be revisited and re-hydrated via externalId lookups.

### Artifact & Lazy Loading System

| Kind  | Module Contents | Why Lazy Load? |
|-------|-----------------|----------------|
| text  | Prose editor + suggestion hooks | Rich editor libs are sizeable |
| code  | CodeMirror setup & syntax highlighting | Multiple language packages |
| image | Image manipulation + metadata UI | Avoid loading for text-only chats |
| sheet | Data grid & CSV parsing | Heavy grid & parsing libs |

Implementation highlights:
 - `components/artifacts/dynamic-loader.ts` provides a cache + single in-flight promise per kind.
 - `components/data-stream-handler.tsx` now buffers stream parts per kind until the module resolves, then flushes in order.
 - UI components (`artifact.tsx`, toolbar, actions) show lightweight placeholders while the artifact definition loads.
 - Prevents unused editors from inflating the initial bundle, improving Time-to-Interactive.

### Streaming

Stream parts use structured delta types (`data-id`, `data-title`, `data-kind`, `data-clear`, `data-finish`, plus content parts). Structural deltas are applied immediately; content deltas are passed to the artifact's `onStreamPart` once loaded.

### File Upload Constraints

Shared constants enforce limits client & server side:
 - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
 - Max size: 7MB

Update both sides by editing `lib/constants.ts` if constraints change.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (auto-set by `npx convex dev`). |
| `AUTH_SECRET` | Secret for Auth.js session & JWT signing. |
| `AI_GATEWAY_API_KEY` | API key for Vercel AI Gateway (non-Vercel or local multi-provider use). |
| `AI_MODEL` | Override default model name (optional). |
| `PLAYWRIGHT_TEST_BASE_URL` | Base URL used during Playwright tests (optional). |
| `PORT` | Custom dev server port (optional). |

## Feature Flags

All feature flags follow the pattern `APP_ENABLE_<FEATURE>` and default to disabled when absent or set to a falsy value (`0`, `false`, `off`, `no`, empty).

| Flag | Description | Env Var | Default |
|------|-------------|---------|---------|
| Guest Accounts | Allow automatic provisioning + guest sign-in flow | `APP_ENABLE_GUEST_ACCOUNTS` | false |
| Share Conversations | Enable public visibility and sharing toggle for chats | `APP_ENABLE_SHARE_CONVERSATIONS` | false |
| Upload Files | Allow uploading attachments in chat input | `APP_ENABLE_UPLOAD_FILES` | false |
| Weather Tool | Activate the `getWeather` tool (UI + model tool calls) | `APP_ENABLE_WEATHER_TOOL` | false |

Truthy values: `1`, `true`, `on`, `yes` (case-insensitive). Any other non-empty value is treated as enabled for forward compatibility.

Example `.env.local` snippet:

```bash
APP_ENABLE_GUEST_ACCOUNTS=true
APP_ENABLE_SHARE_CONVERSATIONS=1
APP_ENABLE_UPLOAD_FILES=on
APP_ENABLE_WEATHER_TOOL=yes
```

When a feature is disabled:
* UI elements are hidden (e.g., file upload button, share dropdown, weather tool output).
* Server routes/actions enforce gating (guest session creation, file uploads, chat visibility changes, weather tool invocation).
* Attempts to access disabled server functionality return a structured `forbidden:feature` error.

Implementation details are in `lib/feature-flags.tsx`.

Create `.env.local` from `.env.example` and supply these as needed.

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| dev | `next dev --turbo` | Start development server with Turbo mode. |
| build | `next build` | Production build. |
| start | `next start` | Run built app. |
| lint | `npx ultracite@latest check` | Run lint & static checks (Biome + rules). |
| format | `npx ultracite@latest fix` | Auto-fix formatting & simple issues. |
| test | `PLAYWRIGHT=True playwright test` | Execute Playwright E2E suite. |

## Quality & Testing

- **Linting / Formatting**: Enforced via Biome & Ultracite. Run `pnpm lint` / `pnpm format`.
- **Type Safety**: Full TypeScript with Convex generated types.
- **E2E Tests**: Playwright config in `playwright.config.ts`; run with `pnpm test`.
- **Preview Environments**: Recommended to use Vercel preview + separate Convex deployment.

## Performance Notes

- Lazy loading reduces initial JS by deferring heavy editor bundles until an artifact of that kind is first streamed or opened.
- Streaming applies deltas incrementally, minimizing re-renders.
- External IDs allow optimistic creation and quick lookups without extra round trips.

## Future Improvements (Ideas)

- Add bundle size analysis (e.g., `next build --analyze`).
- Persist partial stream state for offline resume.
- Provide per-artifact diff/time-travel history.
- Preload frequently used artifact kinds based on user behavior heuristics.

---
If you discover an inconsistency or missing section, feel free to open an issue or PR.

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. The default configuration includes [xAI](https://x.ai) models (`grok-2-vision-1212`, `grok-3-mini`) routed through the gateway.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

### Quick Start

1. **Install Dependencies**: `pnpm install`
2. **Set up Convex**: `npx convex dev` (creates project and deploys schema)
3. **Configure Environment**: Copy `.env.example` to `.env.local` and fill in required values
4. **Start Development**: `pnpm dev`

### Detailed Setup (Alternative)

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`
4. Set up Convex development environment: `npx convex dev`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

> For an in-depth architecture and deployment reference, see the [Stack Guide](docs/STACK_INSTRUCTIONS.md).
