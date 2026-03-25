import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/family/family_provider.dart';

class NavigationScaffold extends ConsumerWidget {
  const NavigationScaffold({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDesktop = MediaQuery.of(context).size.width >= 800;
    final familyState = ref.watch(familyProvider);
    final isChild = familyState.currentUserProfile?.role == 'child';

    // ── Child navigation: just Home + Activity (read-only) ──────────────
    if (isChild) {
      // Children see only Home (index 0) and Activity (index 3).
      // Map child tab index to the shell branch index.
      const childBranches = [0, 3]; // Home, Activity
      int childIndex = childBranches.indexOf(navigationShell.currentIndex);
      if (childIndex < 0) childIndex = 0;

      final childNavItems = const [
        (icon: Icon(Icons.grid_view), label: 'Home'),
        (icon: Icon(Icons.history_outlined), label: 'My Activity'),
      ];

      if (isDesktop) {
        return Scaffold(
          body: Row(
            children: [
              NavigationRail(
                extended: true,
                minExtendedWidth: 240,
                leading: SizedBox(
                  width: 240,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 48, 16, 12),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('💰', style: TextStyle(fontSize: 28)),
                        const SizedBox(width: 12),
                        Text(
                          'FamFi',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: theme.colorScheme.primary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                selectedIndex: childIndex,
                onDestinationSelected: (i) {
                  navigationShell.goBranch(childBranches[i]);
                },
                destinations: [
                  for (final item in childNavItems)
                    NavigationRailDestination(icon: item.icon, label: Text(item.label)),
                ],
              ),
              const VerticalDivider(thickness: 1, width: 1),
              Expanded(child: navigationShell),
            ],
          ),
        );
      }

      return Scaffold(
        body: navigationShell,
        bottomNavigationBar: NavigationBar(
          selectedIndex: childIndex,
          onDestinationSelected: (i) => navigationShell.goBranch(childBranches[i]),
          destinations: [
            for (final item in childNavItems)
              NavigationDestination(icon: item.icon, label: item.label),
          ],
        ),
      );
    }

    // ── Parent navigation: all 5 branches ───────────────────────────────
    if (isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              extended: true,
              minExtendedWidth: 240,
              leading: SizedBox(
                width: 240,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 48, 16, 12),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('💰', style: TextStyle(fontSize: 28)),
                      const SizedBox(width: 12),
                      Text(
                        'FamFi',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: theme.colorScheme.primary,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: const [
                NavigationRailDestination(icon: Icon(Icons.grid_view), label: Text('Home')),
                NavigationRailDestination(icon: Icon(Icons.assignment_outlined), label: Text('Chores')),
                NavigationRailDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: Text('Payday')),
                NavigationRailDestination(icon: Icon(Icons.history_outlined), label: Text('Activity')),
                NavigationRailDestination(icon: Icon(Icons.settings_outlined), label: Text('Settings')),
              ],
            ),
            const VerticalDivider(thickness: 1, width: 1),
            Expanded(child: navigationShell),
          ],
        ),
      );
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.cleaning_services), label: 'Chores'),
          NavigationDestination(icon: Icon(Icons.payments), label: 'Payday'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Activity'),
          NavigationDestination(icon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }
}
