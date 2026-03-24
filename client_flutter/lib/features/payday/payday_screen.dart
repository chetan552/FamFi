import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/models.dart';
import '../family/family_provider.dart';

class PaydayScreen extends ConsumerStatefulWidget {
  const PaydayScreen({super.key});

  @override
  ConsumerState<PaydayScreen> createState() => _PaydayScreenState();
}

class _PaydayScreenState extends ConsumerState<PaydayScreen> {
  // childId -> templateId -> amountStr
  Map<String, Map<String, String>> distributions = {};
  Map<String, String> errors = {};
  Set<String> paidChildren = {};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _recalculateDistributions();
  }

  void _recalculateDistributions() {
    final familyState = ref.read(familyProvider);
    final templates = familyState.bucketTemplates;
    if (templates.isEmpty) return;

    final childrenWithValidChores = familyState.children.where((c) {
      return familyState.chores.any((chore) => chore.assignedToChildId == c.id && chore.status == 'approved');
    });

    final newDistributions = <String, Map<String, String>>{};
    
    for (var child in childrenWithValidChores) {
      if (!distributions.containsKey(child.id)) {
        final childChores = familyState.chores.where((c) => c.assignedToChildId == child.id && c.status == 'approved');
        final total = childChores.fold<double>(0, (sum, c) => sum + c.value);
        final splitAmount = (total / templates.length).toStringAsFixed(2);
        
        final childDist = <String, String>{};
        double sumExceptLast = double.parse(splitAmount) * (templates.length - 1);
        
        for (int i = 0; i < templates.length; i++) {
          if (i == templates.length - 1) {
            childDist[templates[i].id] = (total - sumExceptLast).toStringAsFixed(2);
          } else {
            childDist[templates[i].id] = splitAmount;
          }
        }
        newDistributions[child.id] = childDist;
      } else {
        newDistributions[child.id] = distributions[child.id]!;
      }
    }

    setState(() {
      distributions = newDistributions;
    });
  }

  void _handleUpdateAmount(String childId, String templateId, String value) {
    setState(() {
      distributions[childId]?[templateId] = value;
      errors.remove(childId);
    });
  }

  Future<void> _handleProcessPayday(String childId, double total, List<String> choreIds, String childName) async {
    final childDist = distributions[childId];
    if (childDist == null) return;

    double calculatedTotal = 0;
    final numberDist = <String, double>{};
    for (final entry in childDist.entries) {
      final val = double.tryParse(entry.value) ?? 0;
      calculatedTotal += val;
      numberDist[entry.key] = val;
    }

    if ((calculatedTotal - total).abs() > 0.01) {
      setState(() {
        errors[childId] = 'Amounts must equal \$${total.toStringAsFixed(2)}. Currently: \$${calculatedTotal.toStringAsFixed(2)}';
      });
      return;
    }

    try {
      await ref.read(familyProvider.notifier).processPayday(childId, numberDist, choreIds);
      setState(() {
        paidChildren.add(childId);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Paid \$${total.toStringAsFixed(2)} to $childName! 🎉')));
      }
    } catch (e) {
      setState(() {
        errors[childId] = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);

    // Re-verify list on rebuild
    final childrenWithPay = familyState.children.map((child) {
      final childChores = familyState.chores.where((c) => c.assignedToChildId == child.id && c.status == 'approved').toList();
      final total = childChores.fold<double>(0, (sum, c) => sum + c.value);
      return (child: child, chores: childChores, total: total);
    }).where((item) => item.total > 0).toList();

    if (childrenWithPay.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Payday', style: TextStyle(fontWeight: FontWeight.bold))),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('💸', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 16),
                Text('No one is owed payday right now!', style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                const SizedBox(height: 8),
                Text("Chores must be marked as 'Approved' before they appear here.", style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.go('/chores'),
                  style: ElevatedButton.styleFrom(backgroundColor: theme.colorScheme.secondaryContainer, foregroundColor: theme.colorScheme.onSecondaryContainer),
                  child: const Text('Go to Chores'),
                )
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Run Payday 💸', style: TextStyle(fontWeight: FontWeight.bold))),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: childrenWithPay.length,
        itemBuilder: (context, index) {
          final data = childrenWithPay[index];
          final child = data.child;
          final total = data.total;
          final childChores = data.chores;
          
          final dist = distributions[child.id] ?? {};
          final childError = errors[child.id];
          final isPaid = paidChildren.contains(child.id);

          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            color: isPaid ? theme.colorScheme.surfaceContainerHighest.withOpacity(0.5) : theme.colorScheme.surface,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(child.avatarEmoji, style: const TextStyle(fontSize: 28)),
                          const SizedBox(width: 12),
                          Text(child.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(width: 8),
                          if (isPaid)
                            const Text('✓ Paid', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: Colors.orange.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                        child: Text('\$${total.toStringAsFixed(2)}', style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('From ${childChores.length} approved chore(s). How should this be split?', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                  const SizedBox(height: 16),
                  
                  if (familyState.bucketTemplates.isEmpty)
                    Text('No buckets created for your family.', style: TextStyle(color: theme.colorScheme.error))
                  else
                    ...familyState.bucketTemplates.map((bt) {
                      Color templateColor = theme.primaryColor;
                      try {
                        if (bt.color.startsWith('#')) {
                          templateColor = Color(int.parse(bt.color.substring(1, 7), radix: 16) + 0xFF000000);
                        }
                      } catch (_) {}

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Row(
                          children: [
                            Container(width: 12, height: 12, decoration: BoxDecoration(color: templateColor, shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Expanded(child: Text('${bt.emoji} ${bt.name}')),
                            SizedBox(
                              width: 100,
                              height: 40,
                              child: TextField(
                                enabled: !isPaid,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                textAlign: TextAlign.right,
                                decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 0), prefixText: '\$'),
                                controller: TextEditingController(text: dist[bt.id] ?? '')..selection = TextSelection.fromPosition(TextPosition(offset: (dist[bt.id] ?? '').length)),
                                onChanged: (val) => _handleUpdateAmount(child.id, bt.id, val),
                              ),
                            )
                          ],
                        ),
                      );
                    }),
                    
                  if (childError != null)
                    Padding(padding: const EdgeInsets.only(top: 8.0), child: Text(childError, style: TextStyle(color: theme.colorScheme.error))),
                    
                  if (!isPaid)
                    Padding(
                      padding: const EdgeInsets.only(top: 16.0),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                        ),
                        onPressed: familyState.loading ? null : () => _handleProcessPayday(child.id, total, childChores.map((c) => c.id).toList(), child.name),
                        child: familyState.loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : Text('Pay \$${total.toStringAsFixed(2)} to ${child.name}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
