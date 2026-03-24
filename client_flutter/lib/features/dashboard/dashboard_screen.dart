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

    if (familyState.loading && familyState.currentUserProfile == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
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
