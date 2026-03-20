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

## Deployment

To make FamFi available to the public, you need to deploy both the Supabase Backend and the Expo Frontend.

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
4. **Configure Cloud Settings:** Go to your Supabase Cloud Dashboard and:
   - Turn **Anonymous Sign-ins ON** (required for Child Login).
   - Input your Google OAuth Credentials (for Parent login).
   - Update your `.env` file with your *Production* `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### 2. Deploying the Frontend (Expo)
Because FamFi is built with Expo Router, you can publish this single codebase as an iOS App, an Android App, and a Website.

#### A. Releasing the Mobile Apps (iOS & Android)
1. **Set up EAS:** Install the Expo Application Services (EAS) CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. **Build the Binaries:** Generate the `.ipa` (Apple) and `.aab` (Android) files:
   ```bash
   eas build --platform all
   ```
3. **Submit to the Stores:** Send the builds to Apple App Store Connect and Google Play Console:
   ```bash
   eas submit --platform all
   ```

#### B. Releasing the Web Version
1. **Generate Static Files:**
   ```bash
   npx expo export
   ```
   This compiles a highly optimized production website inside a new `/dist` folder.
2. **Host the Website:** Drag and drop that `/dist` folder into a hosting provider like **Vercel** or **Netlify** for instant free deployment.
