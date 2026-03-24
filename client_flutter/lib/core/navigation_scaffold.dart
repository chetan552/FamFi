import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class NavigationScaffold extends StatelessWidget {
  const NavigationScaffold({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Breakpoint: if width >= 800, use sidebar
    final isDesktop = MediaQuery.of(context).size.width >= 800;

    if (isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              extended: true,
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: const [
                NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text('Home')),
                NavigationRailDestination(icon: Icon(Icons.cleaning_services), label: Text('Chores')),
                NavigationRailDestination(icon: Icon(Icons.payments), label: Text('Payday')),
                NavigationRailDestination(icon: Icon(Icons.history), label: Text('Activity')),
                NavigationRailDestination(icon: Icon(Icons.settings), label: Text('Settings')),
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
