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

    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    final pendingReview = familyState.chores.where((c) => c.status == 'done').toList();
    final activeChores = familyState.chores.where((c) => c.status == 'assigned').toList();
    final completedChores = familyState.chores.where((c) => c.status == 'approved' || c.status == 'paid').toList();

    // Chores expiring today or already overdue (will be auto-deleted at midnight UTC)
    final expiringCount = activeChores.where((c) {
      if (c.dueDate == null) return false;
      final due = DateTime.tryParse(c.dueDate!);
      if (due == null) return false;
      return !due.isAfter(todayDate);
    }).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Family Chores', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-chore'),
        child: const Icon(Icons.add),
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
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => context.push('/add-chore'),
                      icon: const Icon(Icons.add),
                      label: const Text('Create First Chore'),
                    ),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  Wrap(
                    spacing: 8,
                    children: [
                      Chip(
                        avatar: Icon(Icons.list, size: 16, color: theme.colorScheme.onSurfaceVariant),
                        label: Text('${familyState.chores.length} total'),
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                        side: BorderSide.none,
                      ),
                      if (pendingReview.isNotEmpty)
                        Chip(
                          avatar: const Icon(Icons.error_outline, size: 16, color: Colors.orange),
                          label: Text('${pendingReview.length} needs review'),
                          backgroundColor: Colors.orange.withOpacity(0.1),
                          side: BorderSide.none,
                        ),
                      if (expiringCount > 0)
                        Chip(
                          avatar: const Icon(Icons.timer_off_outlined, size: 16, color: Colors.red),
                          label: Text('$expiringCount expiring'),
                          backgroundColor: Colors.red.withOpacity(0.1),
                          side: BorderSide.none,
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
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

    // Expiry helpers (only meaningful for assigned chores with a due date)
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    final due = chore.dueDate != null ? DateTime.tryParse(chore.dueDate!) : null;
    final isOverdue = chore.status == 'assigned' && due != null && due.isBefore(todayDate);
    final isExpiringToday = chore.status == 'assigned' && due != null && due.isAtSameMomentAs(todayDate);

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
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: isDone ? theme.colorScheme.secondaryContainer.withOpacity(0.5) : null,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: statusColor, width: 4)),
          ),
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
                                Icon(
                                  Icons.calendar_today,
                                  size: 14,
                                  color: isOverdue ? Colors.red : isExpiringToday ? Colors.orange : theme.colorScheme.onSurfaceVariant,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  chore.dueDate!,
                                  style: TextStyle(
                                    color: isOverdue ? Colors.red : isExpiringToday ? Colors.orange : theme.colorScheme.onSurfaceVariant,
                                    fontSize: 12,
                                    fontWeight: (isOverdue || isExpiringToday) ? FontWeight.bold : FontWeight.normal,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: theme.colorScheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                      child: Text('\$${chore.value.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                    ),
                  ],
                ),
                // Expiry warning banner
                if (isOverdue || isExpiringToday) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isOverdue ? Colors.red.withOpacity(0.08) : Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isOverdue ? Colors.red.withOpacity(0.3) : Colors.orange.withOpacity(0.4)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.timer_off_outlined, size: 14, color: isOverdue ? Colors.red : Colors.orange),
                        const SizedBox(width: 6),
                        Text(
                          isOverdue ? '⚠️ Overdue — auto-delete pending' : '⏰ Expires today — complete before midnight!',
                          style: TextStyle(fontSize: 11, color: isOverdue ? Colors.red[700] : Colors.orange[800], fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
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
                          minimumSize: const Size(0, 36),
                        ),
                        child: const Text('Approve ✓', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
