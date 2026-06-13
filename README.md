# FamFi - Family Financial Responsibility App

FamFi is a Next.js application designed to help children learn financial responsibility through chores, rewards, and interest-based savings buckets.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Supabase Account](https://supabase.com/)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Docker](https://www.docker.com/) (required for local Supabase)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory and add your web app credentials:

```text
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

You can find these in your Supabase Project Settings > API.

Do not commit Google client secrets, service role keys, or OpenAI API keys. Keep browser-visible values under `NEXT_PUBLIC_*`; keep OAuth secrets in server-only variables such as `GOOGLE_CLIENT_SECRET`.

### 3. Database Setup (Supabase)

To set up your database schema and permissions, you can use either the manual SQL editor or the Supabase CLI.

#### Option A: Manual SQL Editor
1. Go to your **Supabase Dashboard**.
2. Open the **SQL Editor**.
3. Create a new query and run every `.sql` file in `supabase/migrations` in filename order.
4. Click **Run**.

#### Option B: Supabase CLI (Remote)
If you are deploying to a remote Supabase project:

1. **Login**: `npx supabase login`
2. **Link**: `npx supabase link --project-ref your_project_ref_id`
3. **Push**: `npx supabase db push`
4. **Deploy Functions**: `npx supabase functions deploy sync-google-tasks`
5. **Set Function Secrets**:
   ```bash
   npx supabase secrets set \
     GOOGLE_CLIENT_ID=your_google_oauth_client_id \
     GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   ```
   Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions automatically.

#### Option C: Local Development (Docker)
If you are running Supabase locally via Docker:

1. **Start** Supabase (if not already running):
   ```bash
   npm run supabase:start
   ```
2. **Apply Migrations**:
   The CLI automatically applies migrations in `supabase/migrations` when the database starts. To manually reset and apply them all again:
   ```bash
   npm run supabase:reset
   ```
   *Note: Neither `supabase login` nor `supabase link` are required for local development.*

This will create all necessary tables (families, users, chores, buckets, etc.), enums, and Row Level Security (RLS) policies.

### 4. Scheduled Google Tasks Sync

The nightly Google Tasks sync uses the Supabase Edge Function in `supabase/functions/sync-google-tasks` plus the cron migrations in `supabase/migrations/00014_*` and `00016_*`.

Before relying on the schedule in a hosted Supabase project:

1. Enable the `pg_cron`, `pg_net`, and Vault extensions in Supabase if they are not already enabled.
2. Store the service role key in Vault:
   ```sql
   SELECT vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');
   ```
3. Deploy or redeploy the function:
   ```bash
   npm run supabase:functions:deploy
   ```
4. Confirm `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set as Supabase function secrets.

## Running the App

### Web
```bash
npm run web
```

## Tech Stack

- **Framework**: Next.js
- **Routing**: Next.js App Router
- **State Management**: Zustand
- **Database/Auth**: Supabase
- **Styling**: CSS modules/global CSS

## Project Structure

- `app/`: Next.js App Router pages and API routes
- `components/`: Reusable UI components
- `store/`: Zustand stores for Auth, Family, and Settings
- `constants/`: Theme, spacing, and other global constants
- `supabase/`: Database migrations, local config, seed, and Edge Functions

## Deployment

To make FamFi available to the public, deploy both the Supabase backend and the Next.js frontend.

### 1. Deploying the Backend (Supabase)
1. **Create a Cloud Project:** Go to [Supabase.com](https://supabase.com) and create a new project.
2. **Link your Local Project:** In your terminal, link your codebase using the Reference ID:
   ```bash
   npx supabase link --project-ref <your-project-ref-id>
   ```
3. **Push to Production:** Push all tables, policies, and RPC functions directly to the cloud:
   ```bash
   npx supabase db push
   ```
4. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy sync-google-tasks
   ```
5. **Configure Cloud Settings:** Go to your Supabase Cloud Dashboard and:
   - Turn **Anonymous Sign-ins ON** (required for Child Login).
   - Input your Google OAuth Credentials (for Parent login).
   - Enable `pg_cron`, `pg_net`, and Vault for the nightly Google Tasks sync.
   - Add the `service_role_key` Vault secret used by the cron migration.
   - Update Vercel with your production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 2. Deploying the Frontend (Next.js)
1. **Build locally before deploy:**
   ```bash
   npm run build
   ```
2. **Deploy to Vercel:**
   - Connect the repository to Vercel.
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
   - Use the default Next.js build command, `npm run build`.
