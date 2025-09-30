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
  <a href="#running-locally"><strong>Running locally</strong></a>
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
