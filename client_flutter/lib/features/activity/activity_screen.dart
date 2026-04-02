import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../family/family_provider.dart';
import 'package:intl/intl.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  String _filter = 'all';

  Map<String, dynamic> _getTypeConfig(String type, Color primaryColor) {
    switch (type) {
      case 'chore_earning':
        return {'icon': Icons.cleaning_services, 'color': Colors.green, 'label': 'Chore Earning'};
      case 'gift':
        return {'icon': Icons.card_giftcard, 'color': Colors.pink, 'label': 'Gift'};
      case 'interest':
        return {'icon': Icons.percent, 'color': Colors.deepPurpleAccent, 'label': 'Interest'};
      case 'parent_match':
        return {'icon': Icons.handshake, 'color': Colors.cyan, 'label': 'Parent Match'};
      case 'withdrawal':
        return {'icon': Icons.shopping_bag, 'color': Colors.orange, 'label': 'Withdrawal'};
      case 'adjustment':
        return {'icon': Icons.edit, 'color': Colors.amber, 'label': 'Adjustment'};
      default:
        return {'icon': Icons.attach_money, 'color': primaryColor, 'label': type};
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(familyProvider.select((s) => s.loading));
    final transactions = ref.watch(familyProvider.select((s) => s.transactions));
    final children = ref.watch(familyProvider.select((s) => s.children));
    final buckets = ref.watch(familyProvider.select((s) => s.buckets));
    final theme = Theme.of(context);

    if (isLoading && transactions.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final filtered = _filter == 'all'
        ? transactions
        : transactions.where((tx) => tx.type == _filter).toList();

    // Group by Date
    final Map<String, List<Transaction>> groups = {};
    for (var tx in filtered) {
      final date = DateTime.tryParse(tx.createdAt);
      if (date != null) {
        final key = DateFormat('EEEE, MMMM d').format(date);
        if (!groups.containsKey(key)) groups[key] = [];
        groups[key]!.add(tx);
      }
    }

    String getChildName(String? childId, String bucketId) {
      if (childId != null) {
        final child = children.where((c) => c.id == childId).firstOrNull;
        return child != null ? '${child.avatarEmoji} ${child.name}' : '👤 Unknown';
      }
      // Infer childId from bucket if possible
      final bucket = buckets.where((b) => b.id == bucketId).firstOrNull;
      if (bucket != null) {
         final child = children.where((c) => c.id == bucket.childId).firstOrNull;
         return child != null ? '${child.avatarEmoji} ${child.name}' : '👤 Unknown';
      }
      return '👤 Unknown';
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Activity', style: TextStyle(fontWeight: FontWeight.bold))),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(familyProvider.notifier).fetchFamily(),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  Text('${transactions.length} total transactions', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            
            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  {'id': 'all', 'label': 'All', 'icon': Icons.list},
                  {'id': 'chore_earning', 'label': 'Chores', 'icon': Icons.cleaning_services},
                  {'id': 'gift', 'label': 'Gifts', 'icon': Icons.card_giftcard},
                  {'id': 'interest', 'label': 'Interest', 'icon': Icons.percent},
                  {'id': 'parent_match', 'label': 'Match', 'icon': Icons.handshake},
                  {'id': 'withdrawal', 'label': 'Withdrawals', 'icon': Icons.shopping_bag},
                ].map((f) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(f['label'] as String),
                      selected: _filter == f['id'],
                      onSelected: (selected) {
                        if (selected) setState(() => _filter = f['id'] as String);
                      },
                      avatar: Icon(f['icon'] as IconData, size: 16),
                    ),
                  );
                }).toList(),
              ),
            ),

            if (transactions.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 64, color: theme.colorScheme.outline),
                      const SizedBox(height: 16),
                      Text('No activity yet', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32.0),
                        child: Text(
                          'Transactions will appear here after payday, gifts, or interest processing.',
                          style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.builder(
                  itemCount: groups.keys.length,
                  itemBuilder: (context, index) {
                    final dateKey = groups.keys.elementAt(index);
                    final txs = groups[dateKey]!;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            dateKey.toUpperCase(),
                            style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 0.8),
                          ),
                        ),
                      ),
                        ...txs.map((tx) {
                          final config = _getTypeConfig(tx.type, theme.colorScheme.primary);
                          final color = config['color'] as Color;
                          final isNegative = tx.amount < 0 || tx.type == 'withdrawal';

                          return ListTile(
                            leading: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(color: color.withValues(alpha: 0.2), shape: BoxShape.circle),
                              alignment: Alignment.center,
                              child: Icon(config['icon'] as IconData, color: color),
                            ),
                            title: Text(tx.description ?? config['label'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('${getChildName(tx.childId, tx.bucketId)} • ${config['label']}', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isNegative ? Colors.red.withValues(alpha: 0.1) : Colors.green.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${isNegative ? '-' : '+'}\$${tx.amount.abs().toStringAsFixed(2)}',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isNegative ? Colors.red : Colors.green),
                              ),
                            ),
                          );
                        }),
                      ],
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
