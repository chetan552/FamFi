import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/models.dart';
import '../family/family_provider.dart';

class ChoresScreen extends ConsumerWidget {
  const ChoresScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);

    if (familyState.loading && familyState.chores.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final pendingReview = familyState.chores.where((c) => c.status == 'done').toList();
    final activeChores = familyState.chores.where((c) => c.status == 'assigned').toList();
    final completedChores = familyState.chores.where((c) => c.status == 'approved' || c.status == 'paid').toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Family Chores', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.blueAccent, size: 28),
            onPressed: () {
              context.push('/add-chore');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(familyProvider.notifier).fetchFamily(),
        child: familyState.chores.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.assignment_outlined, size: 64, color: theme.colorScheme.outline),
                    const SizedBox(height: 16),
                    Text('No chores yet', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text('Create chores to help your children earn rewards.'),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  Text(
                    '${familyState.chores.length} total • ${pendingReview.length} needs review',
                    style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 24),
                  if (pendingReview.isNotEmpty) ...[
                    _buildSectionHeader('Pending Review', Icons.error_outline, Colors.orange),
                    ...pendingReview.map((c) => _ChoreCard(chore: c)),
                  ],
                  if (activeChores.isNotEmpty) ...[
                    _buildSectionHeader('Active Chores', Icons.play_circle_outline, Colors.blue),
                    ...activeChores.map((c) => _ChoreCard(chore: c)),
                  ],
                  if (completedChores.isNotEmpty) ...[
                    _buildSectionHeader('Completed', Icons.check_circle_outline, Colors.green),
                    ...completedChores.map((c) => _ChoreCard(chore: c)),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Text(title.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.bold, letterSpacing: 1)),
        ],
      ),
    );
  }
}

class _ChoreCard extends ConsumerWidget {
  final Chore chore;
  const _ChoreCard({required this.chore});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final familyState = ref.watch(familyProvider);
    final child = familyState.children.where((c) => c.id == chore.assignedToChildId).firstOrNull;
    final isDone = chore.status == 'done';
    final canEdit = chore.status == 'assigned' || chore.status == 'done';

    Color statusColor;
    String statusLabel;
    switch (chore.status) {
      case 'assigned':
        statusColor = theme.colorScheme.primary;
        statusLabel = 'ACTIVE';
        break;
      case 'done':
        statusColor = Colors.orange;
        statusLabel = 'REVIEW';
        break;
      case 'approved':
        statusColor = Colors.green;
        statusLabel = 'PENDING PAYMENT';
        break;
      case 'paid':
        statusColor = Colors.grey;
        statusLabel = 'PAID';
        break;
      default:
        statusColor = Colors.grey;
        statusLabel = chore.status.toUpperCase();
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: isDone ? theme.colorScheme.secondaryContainer.withOpacity(0.5) : theme.colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(chore.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (child != null) ...[
                            Text(child.avatarEmoji, style: const TextStyle(fontSize: 14)),
                            const SizedBox(width: 4),
                            Text(child.name, style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                            const SizedBox(width: 12),
                          ],
                          if (chore.dueDate != null) ...[
                            Icon(Icons.calendar_today, size: 14, color: theme.colorScheme.onSurfaceVariant),
                            const SizedBox(width: 4),
                            Text(chore.dueDate!, style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text('\$${chore.value.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
                const Spacer(),
                if (canEdit)
                  IconButton(
                    icon: const Icon(Icons.edit, size: 20),
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    color: theme.colorScheme.onSurfaceVariant,
                    onPressed: () {
                      context.push('/edit-chore/${chore.id}');
                    },
                  ),
                if (chore.status != 'paid')
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    color: Colors.red,
                    onPressed: () async {
                      try {
                        await ref.read(familyProvider.notifier).deleteChore(chore.id);
                      } catch (e) {
                         // ignore
                      }
                    },
                  ),
                if (isDone)
                  ElevatedButton(
                    onPressed: () async {
                      try {
                        await ref.read(familyProvider.notifier).updateChoreStatus(chore.id, 'approved');
                      } catch (e) {
                         // ignore
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Approve ✓', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
