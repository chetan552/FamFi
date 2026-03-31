import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/models.dart';
import '../family/family_provider.dart';

class ChoresScreen extends ConsumerStatefulWidget {
  const ChoresScreen({super.key});

  @override
  ConsumerState<ChoresScreen> createState() => _ChoresScreenState();
}

class _ChoresScreenState extends ConsumerState<ChoresScreen> {
  final Set<String> _selected = {};

  bool get _selectionMode => _selected.isNotEmpty;

  void _toggleSelection(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
    });
  }

  void _clearSelection() => setState(() => _selected.clear());

  Future<void> _deleteSelected() async {
    final count = _selected.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Chores'),
        content: Text('Delete $count selected chore${count == 1 ? '' : 's'}? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await ref.read(familyProvider.notifier).deleteMultipleChores(_selected.toList());
      if (mounted) {
        _clearSelection();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$count chore${count == 1 ? '' : 's'} deleted'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(familyProvider.select((s) => s.loading));
    final chores = ref.watch(familyProvider.select((s) => s.chores));
    final theme = Theme.of(context);

    if (isLoading && chores.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    final pendingReview = chores.where((c) => c.status == 'done').toList();
    final activeChores = chores.where((c) => c.status == 'assigned').toList();
    final completedChores = chores.where((c) => c.status == 'approved' || c.status == 'paid').toList();

    final expiringCount = activeChores.where((c) {
      if (c.dueDate == null) return false;
      final due = DateTime.tryParse(c.dueDate!);
      if (due == null) return false;
      return !due.isAfter(todayDate);
    }).length;

    // All deletable chore ids (exclude paid)
    final deletableIds = chores.where((c) => c.status != 'paid').map((c) => c.id).toSet();
    final allDeletableSelected = deletableIds.isNotEmpty && deletableIds.every(_selected.contains);

    return Scaffold(
      appBar: _selectionMode
          ? AppBar(
              leading: IconButton(
                icon: const Icon(Icons.close),
                onPressed: _clearSelection,
              ),
              title: Text('${_selected.length} selected'),
              actions: [
                // Select all / deselect all
                IconButton(
                  icon: Icon(allDeletableSelected ? Icons.deselect : Icons.select_all),
                  tooltip: allDeletableSelected ? 'Deselect all' : 'Select all',
                  onPressed: () {
                    setState(() {
                      if (allDeletableSelected) {
                        _selected.clear();
                      } else {
                        _selected.addAll(deletableIds);
                      }
                    });
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  tooltip: 'Delete selected',
                  color: Colors.red,
                  onPressed: _deleteSelected,
                ),
              ],
            )
          : AppBar(
              title: const Text('Family Chores', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
      floatingActionButton: _selectionMode
          ? null
          : FloatingActionButton(
              onPressed: () => context.push('/add-chore'),
              child: const Icon(Icons.add),
            ),
      body: RefreshIndicator(
        onRefresh: () async {
          _clearSelection();
          await ref.read(familyProvider.notifier).fetchFamily();
        },
        child: chores.isEmpty
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
                        label: Text('${chores.length} total'),
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                        side: BorderSide.none,
                      ),
                      if (pendingReview.isNotEmpty)
                        Chip(
                          avatar: const Icon(Icons.error_outline, size: 16, color: Colors.orange),
                          label: Text('${pendingReview.length} needs review'),
                          backgroundColor: Colors.orange.withValues(alpha: 0.1),
                          side: BorderSide.none,
                        ),
                      if (expiringCount > 0)
                        Chip(
                          avatar: const Icon(Icons.timer_off_outlined, size: 16, color: Colors.red),
                          label: Text('$expiringCount expiring'),
                          backgroundColor: Colors.red.withValues(alpha: 0.1),
                          side: BorderSide.none,
                        ),
                    ],
                  ),
                  if (_selectionMode)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Long-press to select • tap to toggle',
                        style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                  const SizedBox(height: 16),
                  if (pendingReview.isNotEmpty) ...[
                    _buildSectionHeader('Pending Review', Icons.error_outline, Colors.orange),
                    ...pendingReview.map((c) => _ChoreCard(
                          chore: c,
                          isSelected: _selected.contains(c.id),
                          selectionMode: _selectionMode,
                          onLongPress: c.status != 'paid' ? () => _toggleSelection(c.id) : null,
                          onSelectionTap: c.status != 'paid' ? () => _toggleSelection(c.id) : null,
                        )),
                  ],
                  if (activeChores.isNotEmpty) ...[
                    _buildSectionHeader('Active Chores', Icons.play_circle_outline, Colors.blue),
                    ...activeChores.map((c) => _ChoreCard(
                          chore: c,
                          isSelected: _selected.contains(c.id),
                          selectionMode: _selectionMode,
                          onLongPress: () => _toggleSelection(c.id),
                          onSelectionTap: () => _toggleSelection(c.id),
                        )),
                  ],
                  if (completedChores.isNotEmpty) ...[
                    _buildSectionHeader('Completed', Icons.check_circle_outline, Colors.green),
                    ...completedChores.map((c) => _ChoreCard(
                          chore: c,
                          isSelected: _selected.contains(c.id),
                          selectionMode: _selectionMode,
                          onLongPress: c.status != 'paid' ? () => _toggleSelection(c.id) : null,
                          onSelectionTap: c.status != 'paid' ? () => _toggleSelection(c.id) : null,
                        )),
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
  final bool isSelected;
  final bool selectionMode;
  final VoidCallback? onLongPress;
  final VoidCallback? onSelectionTap;

  const _ChoreCard({
    required this.chore,
    required this.isSelected,
    required this.selectionMode,
    this.onLongPress,
    this.onSelectionTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final children = ref.watch(familyProvider.select((s) => s.children));
    final child = children.where((c) => c.id == chore.assignedToChildId).firstOrNull;
    final isDone = chore.status == 'done';
    final canEdit = chore.status == 'assigned' || chore.status == 'done';
    final isPaid = chore.status == 'paid';

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

    return GestureDetector(
      onLongPress: onLongPress,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: isSelected
              ? Border.all(color: theme.colorScheme.primary, width: 2)
              : null,
        ),
        child: Card(
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: isSelected
              ? theme.colorScheme.primaryContainer.withValues(alpha: 0.4)
              : isDone
                  ? theme.colorScheme.secondaryContainer.withValues(alpha: 0.5)
                  : null,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: selectionMode && !isPaid ? onSelectionTap : null,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: isSelected ? theme.colorScheme.primary : statusColor, width: 4)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Checkbox shown in selection mode
                          if (selectionMode && !isPaid) ...[
                            Padding(
                              padding: const EdgeInsets.only(right: 12, top: 2),
                              child: Icon(
                                isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                                color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
                                size: 22,
                              ),
                            ),
                          ],
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
                            decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                            child: Text('\$${chore.value.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                          ),
                        ],
                      ),
                      if (isOverdue || isExpiringToday) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: isOverdue ? Colors.red.withValues(alpha: 0.08) : Colors.orange.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isOverdue ? Colors.red.withValues(alpha: 0.3) : Colors.orange.withValues(alpha: 0.4)),
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
                      // Action row — hidden during selection mode
                      if (!selectionMode) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                              child: Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                            const Spacer(),
                            if (canEdit)
                              IconButton(
                                icon: const Icon(Icons.edit, size: 20),
                                visualDensity: VisualDensity.compact,
                                padding: EdgeInsets.zero,
                                color: theme.colorScheme.onSurfaceVariant,
                                onPressed: () => context.push('/edit-chore/${chore.id}'),
                              ),
                            if (!isPaid)
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 20),
                                visualDensity: VisualDensity.compact,
                                padding: EdgeInsets.zero,
                                color: Colors.red,
                                onPressed: () async {
                                  try {
                                    await ref.read(familyProvider.notifier).deleteChore(chore.id);
                                  } catch (e) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to delete chore: $e')));
                                    }
                                  }
                                },
                              ),
                            if (isDone)
                              ElevatedButton(
                                onPressed: () async {
                                  try {
                                    await ref.read(familyProvider.notifier).updateChoreStatus(chore.id, 'approved');
                                  } catch (e) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to approve chore: $e')));
                                    }
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
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
