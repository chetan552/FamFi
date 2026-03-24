import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';

class ParentDashboard extends ConsumerStatefulWidget {
  const ParentDashboard({super.key});

  @override
  ConsumerState<ParentDashboard> createState() => _ParentDashboardState();
}

class _ParentDashboardState extends ConsumerState<ParentDashboard> {
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

    if (familyState.loading || familyState.family == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final children = familyState.children;
    final familyTotal = children.fold<double>(
        0,
        (sum, child) =>
            sum +
            familyState.buckets
                .where((b) => b.childId == child.id)
                .fold(0, (s, b) => s + b.cachedBalance));

    final activeChores = familyState.chores.where((c) => c.status != 'paid').length;
    final pendingReview = familyState.chores.where((c) => c.status == 'done').length;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          '🏦 FamFi',
          style: TextStyle(fontWeight: FontWeight.bold, color: theme.primaryColor),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(familyProvider.notifier).fetchFamily(),
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            Text(
              'Hi, ${familyState.currentUserProfile?.name ?? 'Parent'}! 👋',
              style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            Card(
              elevation: 4,
              color: theme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Text(
                      'FAMILY TOTAL SAVINGS',
                      style: TextStyle(color: Colors.white.withOpacity(0.8), letterSpacing: 1),
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
                        Container(width: 1, height: 40, color: Colors.white.withOpacity(0.3)),
                        _StatItem(value: activeChores.toString(), label: 'Active Chores'),
                        Container(width: 1, height: 40, color: Colors.white.withOpacity(0.3)),
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
                final balance = familyState.buckets
                    .where((b) => b.childId == child.id)
                    .fold<double>(0, (s, b) => s + b.cachedBalance);
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(12),
                    leading: CircleAvatar(
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: Text(child.avatarEmoji, style: const TextStyle(fontSize: 24)),
                    ),
                    title: Text(child.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${familyState.chores.where((c) => c.assignedToChildId == child.id && c.status == 'assigned').length} active chores'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(8)),
                          child: Text(
                            '\$${balance.toStringAsFixed(2)}',
                            style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.chevron_right),
                      ],
                    ),
                    onTap: () => context.push('/child/${child.id}'),
                  ),
                );
              }),
            const SizedBox(height: 32),
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
                  avatar: CircleAvatar(backgroundColor: Color(int.parse(bt.color.replaceFirst('#', '0xFF'))), radius: 6),
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
              ],
            ),
            const SizedBox(height: 48),
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
