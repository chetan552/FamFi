# FamFi - Family Financial Responsibility App

FamFi is a React Native (Expo) application designed to help children learn financial responsibility through chores, rewards, and interest-based savings buckets.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Supabase Account](https://supabase.com/)
- [Expo Go](https://expo.dev/go) app on your mobile device (optional, for native testing)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```text
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these in your Supabase Project Settings > API.

### 3. Database Setup (Supabase)

To set up your database schema and permissions, you can use either the manual SQL editor or the Supabase CLI.

#### Option A: Manual SQL Editor
1. Go to your **Supabase Dashboard**.
2. Open the **SQL Editor**.
3. Create a new query and paste the contents of the following files (in order):
   - [`supabase/migrations/00001_initial_schema.sql`](file:///Users/chetanchadalavada/Development/github/Fam-Fi-App-ORIG/Fam-Fi-App/supabase/migrations/00001_initial_schema.sql)
   - [`supabase/migrations/00002_fix_families_rls.sql`](file:///Users/chetanchadalavada/Development/github/Fam-Fi-App-ORIG/Fam-Fi-App/supabase/migrations/00002_fix_families_rls.sql)
4. Click **Run**.

#### Option B: Supabase CLI (Remote)
If you are deploying to a remote Supabase project:

1. **Login**: `npx supabase login`
2. **Link**: `npx supabase link --project-ref your_project_ref_id`
3. **Push**: `npx supabase db push`

#### Option C: Local Development (Docker)
If you are running Supabase locally via Docker:

1. **Start** Supabase (if not already running):
   ```bash
   npx supabase start
   ```
2. **Apply Migrations**:
   The CLI automatically applies migrations in `supabase/migrations` when the database starts. To manually reset and apply them all again:
   ```bash
   npx supabase db reset
   ```
   *Note: Neither `supabase login` nor `supabase link` are required for local development.*

This will create all necessary tables (families, users, chores, buckets, etc.), enums, and Row Level Security (RLS) policies.

## Running the App

### Web
```bash
npm run web
```

### Mobile (Expo Go)
```bash
npx expo start
```
Follow the terminal instructions to open the app on iOS (i) or Android (a).

## Tech Stack

- **Framework**: Expo (React Native)
- **Routing**: Expo Router (File-based)
- **State Management**: Zustand
- **Database/Auth**: Supabase
- **UI Library**: React Native Paper
- **Icons**: Material Community Icons (@expo/vector-icons)

## Project Structure

- `app/`: Expo Router pages
  - `(auth)/`: Login and signup flow
  - `(parent)/`: Parent dashboard and management
  - `(child)/`: Child-specific views (future)
- `components/`: Reusable UI components
- `store/`: Zustand stores for Auth, Family, and Settings
- `constants/`: Theme, spacing, and other global constants
- `supabase/`: Database migrations and snippets
