import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../features/auth/auth_provider.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/auth/child_login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/chores/chores_screen.dart';
import '../features/chores/add_chore_screen.dart';
import '../features/chores/edit_chore_screen.dart';
import '../features/payday/payday_screen.dart';
import '../features/activity/activity_screen.dart';
import '../features/dashboard/child_profile_screen.dart';
import '../features/dashboard/bucket_templates_screen.dart';
import '../features/dashboard/deposit_gift_screen.dart';
import '../features/dashboard/withdraw_screen.dart';
import '../features/family/family_setup_screen.dart';
import '../features/family/manage_children_screen.dart';
import '../features/family/interest_settings_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/settings/google_tasks_screen.dart';
import '../features/settings/google_callback_screen.dart';
import '../features/mentor/money_mentor_screen.dart';
import 'navigation_scaffold.dart';

part 'router.g.dart';

// ── Router Notifier ──────────────────────────────────────────────────
class RouterNotifier extends ChangeNotifier {
  RouterNotifier(Ref ref) {
    _ref = ref;
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
  late final Ref _ref;
}

@riverpod
GoRouter appRouter(Ref ref) {
  final notifier = RouterNotifier(ref);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    redirect: (context, state) {
      final isLoggedIn = ref.read(authProvider) != null;

      // Google OAuth callback bypass
      if (state.matchedLocation == '/google-callback') return null;

      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/signup' ||
          state.matchedLocation == '/child-login';

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/child-login',
        builder: (context, state) => const ChildLoginScreen(),
      ),
      GoRoute(
        path: '/family-setup',
        builder: (context, state) => const FamilySetupScreen(),
      ),
      GoRoute(
        path: '/google-callback',
        builder: (context, state) => GoogleCallbackScreen(
          code: state.uri.queryParameters['code'],
          error: state.uri.queryParameters['error'],
        ),
      ),
      GoRoute(
        path: '/mentor',
        builder: (context, state) => const MoneyMentorScreen(),
      ),
      GoRoute(
        path: '/add-chore',
        builder: (context, state) => const AddChoreScreen(),
      ),
      GoRoute(
        path: '/edit-chore/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return EditChoreScreen(choreId: id);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return NavigationScaffold(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/chores',
                builder: (context, state) => const ChoresScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/payday',
                builder: (context, state) => const PaydayScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/activity',
                builder: (context, state) => const ActivityScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
              GoRoute(
                path: '/manage-children',
                builder: (context, state) => const ManageChildrenScreen(),
              ),
              GoRoute(
                path: '/interest-settings',
                builder: (context, state) => const InterestSettingsScreen(),
              ),
              GoRoute(
                path: '/bucket-templates',
                builder: (context, state) => const BucketTemplatesScreen(),
              ),
              GoRoute(
                path: '/child/:id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return ChildProfileScreen(childId: id);
                },
              ),
              GoRoute(
                path: '/deposit-gift',
                builder: (context, state) => const DepositGiftScreen(),
              ),
              GoRoute(
                path: '/withdraw',
                builder: (context, state) {
                  final childId = state.uri.queryParameters['childId'];
                  return WithdrawScreen(preselectedChildId: childId);
                },
              ),
              GoRoute(
                path: '/google-tasks',
                builder: (context, state) => const GoogleTasksScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
