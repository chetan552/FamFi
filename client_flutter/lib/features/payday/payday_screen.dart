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
  // Flat map for childId_templateId -> value
  final Map<String, String> distributions = {};
  // Flat map for childId_templateId -> TextEditingController
  final Map<String, TextEditingController> _controllers = {};

  Map<String, String> errors = {};
  Set<String> paidChildren = {};
  String? _processingChildId;
  String? _lastStateHash;

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _recalculateDistributions(List<({UserProfile child, List<Chore> chores, double total})> childrenWithPay, List<BucketTemplate> templates) {
    if (templates.isEmpty) return;

    for (final item in childrenWithPay) {
      final childId = item.child.id;
      final total = item.total;

      final splitAmount = (total / templates.length).toStringAsFixed(2);
      final double sumExceptLast = double.parse(splitAmount) * (templates.length - 1);

      for (int i = 0; i < templates.length; i++) {
        final tId = templates[i].id;
        final key = '${childId}_$tId';
        final String amountStr = (i == templates.length - 1)
            ? (total - sumExceptLast).toStringAsFixed(2)
            : splitAmount;

        distributions[key] = amountStr;

        final existingController = _controllers[key];
        if (existingController == null) {
          _controllers[key] = TextEditingController(text: amountStr);
        } else if (existingController.text != amountStr) {
          existingController.text = amountStr;
        }
      }
    }
  }

  void _handleUpdateAmount(String childId, String templateId, String value) {
    distributions["${childId}_$templateId"] = value;
    if (errors.containsKey(childId)) {
      setState(() {
        errors.remove(childId);
      });
    }
  }

  Future<void> _handleProcessPayday(String childId, double total, List<String> choreIds, String childName, List<String> templateIds) async {
    double calculatedTotal = 0;
    final numberDist = <String, double>{};
    for (final tId in templateIds) {
      final key = '${childId}_$tId';
      final valStr = distributions[key] ?? '0';
      final val = double.tryParse(valStr) ?? 0;
      calculatedTotal += val;
      numberDist[tId] = val;
    }

    if ((calculatedTotal - total).abs() > 0.01) {
      setState(() {
        errors[childId] = 'Amounts must equal \$${total.toStringAsFixed(2)}. Currently: \$${calculatedTotal.toStringAsFixed(2)}';
      });
      return;
    }

    setState(() => _processingChildId = childId);
    try {
      await ref.read(familyProvider.notifier).processPayday(childId, numberDist, choreIds);
      if (mounted) {
        setState(() {
          paidChildren.add(childId);
          _processingChildId = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Paid \$${total.toStringAsFixed(2)} to $childName! 🎉')));
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          errors[childId] = e.toString();
          _processingChildId = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final children = ref.watch(familyProvider.select((s) => s.children));
    final chores = ref.watch(familyProvider.select((s) => s.chores));
    final bucketTemplates = ref.watch(familyProvider.select((s) => s.bucketTemplates));
    final theme = Theme.of(context);

    final childrenWithPay = children.map((child) {
      final childChores = chores.where((c) => c.assignedToChildId == child.id && c.status == 'approved').toList();
      final total = childChores.fold<double>(0, (sum, c) => sum + c.value);
      return (child: child, chores: childChores, total: total);
    }).where((item) => item.total > 0).toList();

    // Hash includes per-child totals so any chore approval/unapproval triggers recalc
    final stateHash = childrenWithPay.map((item) => '${item.child.id}:${item.total.toStringAsFixed(2)}').join('|')
        + '_bt${bucketTemplates.length}';
    if (_lastStateHash != stateHash) {
      _lastStateHash = stateHash;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _recalculateDistributions(childrenWithPay, bucketTemplates);
          setState(() {});
        }
      });
    }

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
        padding: const EdgeInsets.all(16),
        itemCount: childrenWithPay.length,
        itemBuilder: (context, index) {
          final data = childrenWithPay[index];
          final child = data.child;
          final total = data.total;
          final childChores = data.chores;
          
          final childError = errors[child.id];
          final isPaid = paidChildren.contains(child.id);

          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            color: isPaid ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5) : theme.colorScheme.surface,
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
                        decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                        child: Text('\$${total.toStringAsFixed(2)}', style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('From ${childChores.length} approved chore(s). How should this be split?', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                  const SizedBox(height: 16),
                  
                  if (bucketTemplates.isEmpty)
                    Text('No buckets created for your family.', style: TextStyle(color: theme.colorScheme.error))
                  else
                    ...bucketTemplates.map((bt) {
                      final templateColor = bt.parsedColor;

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
                                controller: _controllers["${child.id}_${bt.id}"],
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
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 400),
                          child: SizedBox(
                            width: double.infinity,
                            child: Builder(builder: (context) {
                              final isProcessingThis = _processingChildId == child.id;
                              final isAnyProcessing = _processingChildId != null;
                              return ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: isAnyProcessing ? null : () => _handleProcessPayday(child.id, total, childChores.map((c) => c.id).toList(), child.name, bucketTemplates.map((t) => t.id).toList()),
                                child: isProcessingThis
                                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                                    : Text('Pay \$${total.toStringAsFixed(2)} to ${child.name}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              );
                            }),
                          ),
                        ),
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
