# FamFi — Flutter Client

A family finance app that helps parents teach kids about saving, chores, and money management.

## Tech Stack

### UI / Styling
- **Flutter Material Design 3** — built-in component library (`useMaterial3: true`). No third-party component library. All UI is built with Flutter's native Material widgets (cards, buttons, dialogs, navigation bar/rail, etc.) using semantic `ColorScheme` tokens for light/dark mode support.
- **Google Fonts** (`google_fonts: ^8.0.2`) — custom typefaces:
  - **Outfit** — display and headline text
  - **Inter** — body and label text
- **Theming** — `ThemeMode.system` with a custom `ColorScheme.fromSeed` (teal primary, amber secondary). Dark mode is fully supported via semantic color tokens (`colorScheme.surface`, `colorScheme.onSurface`, etc.).
- **Touch + mouse scroll** — custom `MaterialScrollBehavior` enables drag scrolling on all pointer device kinds (touch, mouse, stylus, trackpad) for web/desktop compatibility.

### State Management
- **Riverpod** (`flutter_riverpod: ^3.3.1`, `riverpod_annotation: ^4.0.2`) — providers for auth, family data, and feature-level state.

### Navigation
- **go_router** (`go_router: ^17.1.0`) — declarative routing with redirect guards for authenticated/unauthenticated flows. Uses `StatefulShellRoute.indexedStack` for the main tabbed navigation.

### Backend
- **Supabase** (`supabase_flutter: ^2.12.0`) — Postgres database, row-level security, auth (email/password + anonymous + Google OAuth), and RPC functions.
- **Google Sign-In** (`google_sign_in: ^6.2.2`) — native OAuth on iOS/Android; web uses Supabase's OAuth redirect flow.

## Project Structure

```
lib/
  core/           # Router, navigation scaffold, app theme
  features/
    auth/         # Login, signup, child login, social auth, complete profile
    dashboard/    # Parent + child dashboards, child profile, bucket screens
    chores/       # Chores list, add/edit chore screens
    payday/       # Payday distribution screen
    activity/     # Transaction history
    family/       # Family setup, manage children, interest settings
    settings/     # App settings, Google Tasks integration
    landing/      # Public landing/marketing screen
    mentor/       # Money mentor (AI chat)
```

## Getting Started

```bash
cd client_flutter
flutter pub get
flutter run
```

For web:
```bash
flutter run -d chrome
```

For a production web build (deployed to Firebase Hosting):
```bash
flutter build web --release
firebase deploy --only hosting
```

## Environment

Copy `.env.example` to `.env` and fill in your Supabase URL, anon key, and Google OAuth client IDs before running.
