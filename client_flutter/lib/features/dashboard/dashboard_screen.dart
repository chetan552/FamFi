import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import 'parent_dashboard.dart';
import 'child_dashboard.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(familyProvider.notifier).fetchFamily();
    });
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);

    if (familyState.error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                const Text('Failed to load dashboard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 8),
                Text(familyState.error!, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => ref.read(familyProvider.notifier).fetchFamily(),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!familyState.loading && familyState.currentUserProfile != null && familyState.family == null) {
      // The user is authenticated but has no family associated!
      Future.microtask(() => context.go('/family-setup'));
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (familyState.currentUserProfile?.role == 'child') {
      return const ChildDashboard();
    }
    
    // Default to parent view if role is 'parent' or unknown (like brand new user)
    return const ParentDashboard();
  }
}
