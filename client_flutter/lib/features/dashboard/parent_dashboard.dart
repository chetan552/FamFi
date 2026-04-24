import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import '../../core/settings_provider.dart';

class ParentDashboard extends ConsumerStatefulWidget {
  const ParentDashboard({super.key});

  @override
  ConsumerState<ParentDashboard> createState() => _ParentDashboardState();
}

class _ParentDashboardState extends ConsumerState<ParentDashboard> {
  bool _refreshing = false;

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      await ref.read(familyProvider.notifier).fetchFamily();
      final isConnected = ref.read(familyProvider.select((s) => s.googleConnected));
      if (isConnected && mounted) {
        final result = await ref.read(familyProvider.notifier).syncGoogleTasks();
        if (mounted) {
          final errors = result['errors'] as List;
          final synced = result['synced'] as int;
          final msg = errors.isNotEmpty
              ? (errors.first.toString().contains('google_auth_expired')
                  ? 'Google authorization expired. Reconnect in Settings.'
                  : errors.first.toString().replaceAll('Exception: ', ''))
              : synced > 0
                  ? 'Synced $synced task${synced == 1 ? '' : 's'} from Google'
                  : null;
          if (msg != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(msg), duration: const Duration(seconds: 2)),
            );
          }
        }
      }
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);

    if (familyState.loading || familyState.family == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final balancesByChild = <String, double>{};
    for (final b in familyState.buckets) {
      balancesByChild[b.childId] = (balancesByChild[b.childId] ?? 0.0) + b.cachedBalance;
    }

    final activeChoresByChild = <String, int>{};
    for (final c in familyState.chores) {
      if (c.status == 'assigned') {
        activeChoresByChild[c.assignedToChildId] = (activeChoresByChild[c.assignedToChildId] ?? 0) + 1;
      }
    }

    final children = familyState.children;
    final familyTotal = children.fold<double>(
        0, (sum, child) => sum + (balancesByChild[child.id] ?? 0.0));

    final activeChores = familyState.chores.where((c) => c.status != 'paid').length;
    final pendingReview = familyState.chores.where((c) => c.status == 'done').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text(''),
        actions: [
          _refreshing
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh & sync',
                  onPressed: _refresh,
                ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          children: [
            Row(
              children: [
                const Text('🏦', style: TextStyle(fontSize: 32)),
                const SizedBox(width: 12),
                Text(
                  'FamFi',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: theme.colorScheme.primary,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              familyState.family?.name != null && familyState.family!.name.toLowerCase().startsWith('the ')
                  ? '${familyState.family!.name} Bank'
                  : 'The ${familyState.family?.name ?? 'Our'} Family Bank',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Hi, ${familyState.currentUserProfile?.name ?? 'Parent'}! 👋',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w900,
                color: theme.colorScheme.onSurface,
                letterSpacing: -1,
              ),
            ),
            const SizedBox(height: 16),
            _SetupChecklist(familyState: familyState),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF2B9EB3), Color(0xFF1A7A8A)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF2B9EB3).withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6)),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Text(
                      'FAMILY TOTAL SAVINGS',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), letterSpacing: 1.5, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '\$${familyTotal.toStringAsFixed(2)}',
                      style: theme.textTheme.displaySmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _StatItem(value: children.length.toString(), label: 'Children'),
                        Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2)),
                        _StatItem(value: activeChores.toString(), label: 'Active Chores'),
                        Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2)),
                        _StatItem(
                          value: pendingReview.toString(),
                          label: 'Needs Review',
                          valueColor: pendingReview > 0 ? Colors.amberAccent : Colors.white,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Children', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                TextButton(onPressed: () => context.push('/manage-children'), child: const Text('Manage')),
              ],
            ),
            const SizedBox(height: 8),
            if (children.isEmpty)
              Card(
                elevation: 0,
                color: theme.colorScheme.surfaceContainerHighest,
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      Icon(Icons.child_care, size: 64, color: theme.colorScheme.outline),
                      const SizedBox(height: 16),
                      const Text('No children yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      const Text('Add your children so they can earn!'),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add),
                        label: const Text('Add First Child'),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),
              )
            else
              ...children.map((child) {
                final balance = balancesByChild[child.id] ?? 0.0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border(left: BorderSide(color: theme.colorScheme.primary, width: 4)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: CircleAvatar(
                          radius: 22,
                          backgroundColor: theme.colorScheme.primaryContainer,
                          child: Text(child.avatarEmoji, style: const TextStyle(fontSize: 24)),
                        ),
                        title: Text(child.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${activeChoresByChild[child.id] ?? 0} active chores'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '\$${balance.toStringAsFixed(2)}',
                                style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
                          ],
                        ),
                        onTap: () => context.push('/child/${child.id}'),
                      ),
                    ),
                  ),
                );
              }),
            const SizedBox(height: 32),
            if (familyState.members.isNotEmpty) ...[
              Text('Parents', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(
                elevation: 0,
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
                child: Column(
                  children: [
                    ...familyState.members.asMap().entries.map((entry) {
                      final index = entry.key;
                      final member = entry.value;
                      final isMe = member.id == familyState.currentUserProfile?.id;
                      return Column(
                        children: [
                          ListTile(
                            leading: Text(member.avatarEmoji, style: const TextStyle(fontSize: 24)),
                            title: Text('${member.name}${isMe ? " (You)" : ""}', style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: const Text('Parent'),
                          ),
                          if (index < familyState.members.length - 1) 
                            const Divider(height: 1, indent: 16, endIndent: 16),
                        ],
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
            if (familyState.bucketTemplates.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Savings Buckets', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () => context.push('/bucket-templates'), child: const Text('Edit')),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: familyState.bucketTemplates.map((bt) => Chip(
                  avatar: CircleAvatar(backgroundColor: bt.parsedColor, radius: 6),
                  label: Text('${bt.emoji}  ${bt.name}'),
                  backgroundColor: theme.colorScheme.surface,
                )).toList(),
              ),
              const SizedBox(height: 32),
            ],
            Text('Quick Actions', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ActionCard(icon: Icons.cleaning_services, label: 'Chores', color: theme.colorScheme.primary, badge: pendingReview, route: '/chores'),
                _ActionCard(icon: Icons.payments, label: 'Payday', color: theme.colorScheme.tertiary, route: '/payday'),
                _ActionCard(icon: Icons.card_giftcard, label: 'Gift', color: theme.colorScheme.secondary, route: '/deposit-gift'),
                _ActionCard(icon: Icons.upload_outlined, label: 'Withdraw', color: theme.colorScheme.error, route: '/withdraw'),
                _ActionCard(icon: Icons.percent, label: 'Interest', color: Colors.deepPurpleAccent, route: '/interest-settings'),
                _ActionCard(icon: Icons.dashboard, label: 'Dashboard', color: Colors.deepOrange, route: '/family-tasks-dashboard'),
              ],
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}

class _SetupChecklist extends ConsumerWidget {
  final FamilyState familyState;
  const _SetupChecklist({required this.familyState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dismissedAsync = ref.watch(setupChecklistDismissedProvider);
    final isDismissed = dismissedAsync.asData?.value ?? true;
    if (isDismissed) return const SizedBox.shrink();

    final steps = [
      (
        label: 'Add your first child',
        done: familyState.children.isNotEmpty,
        route: '/manage-children',
      ),
      (
        label: 'Set up savings buckets',
        done: familyState.bucketTemplates.isNotEmpty,
        route: '/bucket-templates',
      ),
      (
        label: 'Create your first chore',
        done: familyState.chores.isNotEmpty,
        route: '/chores',
      ),
    ];

    final allDone = steps.every((s) => s.done);
    if (allDone) {
      // Auto-dismiss once everything is complete
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(setupChecklistDismissedProvider.notifier).dismiss();
      });
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final completedCount = steps.where((s) => s.done).length;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.primary.withValues(alpha: 0.35), width: 1.5),
      ),
      color: theme.colorScheme.primaryContainer.withValues(alpha: 0.25),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 12, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.rocket_launch_rounded, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Get Started  ($completedCount/${steps.length})',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  color: theme.colorScheme.onSurfaceVariant,
                  onPressed: () => ref.read(setupChecklistDismissedProvider.notifier).dismiss(),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: completedCount / steps.length,
                minHeight: 5,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            ...steps.map((step) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: step.done ? null : () => context.push(step.route),
                child: Row(
                  children: [
                    Icon(
                      step.done ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                      color: step.done ? Colors.green : theme.colorScheme.onSurfaceVariant,
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        step.label,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: step.done ? theme.colorScheme.onSurfaceVariant : theme.colorScheme.onSurface,
                          decoration: step.done ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                    if (!step.done)
                      Icon(Icons.chevron_right, size: 18, color: theme.colorScheme.onSurfaceVariant),
                  ],
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final Color valueColor;

  const _StatItem({required this.value, required this.label, this.valueColor = Colors.white});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: valueColor, fontWeight: FontWeight.bold, fontSize: 24)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final int badge;
  final String route;

  const _ActionCard({required this.icon, required this.label, required this.color, this.badge = 0, required this.route});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () {
          try {
            context.push(route);
          } catch (e) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error navigating: $e')));
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 90,
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Column(
                children: [
                  Icon(icon, color: color, size: 28),
                  const SizedBox(height: 8),
                  Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              if (badge > 0)
                Positioned(
                  top: -8,
                  right: -8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                    child: Center(
                      child: Text(badge.toString(), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
