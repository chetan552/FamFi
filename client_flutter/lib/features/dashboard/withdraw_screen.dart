import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import '../../core/models/models.dart';

class WithdrawScreen extends ConsumerStatefulWidget {
  final String? preselectedChildId;
  const WithdrawScreen({super.key, this.preselectedChildId});

  @override
  ConsumerState<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends ConsumerState<WithdrawScreen> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String? _childId;
  String? _templateId;
  bool _isLoading = false;

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(familyProvider);
      setState(() {
        _childId = widget.preselectedChildId ?? (state.children.length == 1 ? state.children.first.id : null);
      });
      ref.read(familyProvider.notifier).fetchFamily(); // Refreshes buckets too
    });
  }

  double _getBucketBalanceFromState(FamilyState familyState, String childIdParam, String templateIdParam) {
    final bucket = familyState.buckets.where((b) => b.childId == childIdParam && b.templateId == templateIdParam).firstOrNull;
    return bucket?.cachedBalance ?? 0.0;
  }

  void _handleWithdraw() async {
    final amountText = _amountController.text;
    final amount = double.tryParse(amountText);

    if (_childId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a child.')));
      return;
    }
    if (_templateId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a bucket to withdraw from.')));
      return;
    }
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount greater than \$0.')));
      return;
    }

    final currentState = ref.read(familyProvider);
    final balance = _getBucketBalanceFromState(currentState, _childId!, _templateId!);
    if (amount > balance) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Amount exceeds available balance of \$${balance.toStringAsFixed(2)}.')));
      return;
    }

    setState(() => _isLoading = true);
    final provider = ref.read(familyProvider.notifier);

    try {
      await provider.withdrawFromBucket(_childId!, _templateId!, amount, _noteController.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('\$${amount.toStringAsFixed(2)} withdrawn successfully! 💸')));
        context.pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(familyProvider);

    final selectedChild = state.children.where((c) => c.id == _childId).firstOrNull;
    final selectedBucketBalance = (_childId != null && _templateId != null)
        ? _getBucketBalanceFromState(state, _childId!, _templateId!)
        : null;

    final List<BucketTemplate> bucketsWithBalance = _childId != null
        ? state.bucketTemplates.where((bt) => _getBucketBalanceFromState(state, _childId!, bt.id) > 0).toList()
        : [];

    return Scaffold(
      appBar: AppBar(title: const Text('Withdraw / Spend')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Icon(Icons.outbound, size: 48),
            const SizedBox(height: 8),
            Text('Record a Spend 💸', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            Text('Deduct money from a child\'s savings bucket when they spend it.', style: TextStyle(color: theme.colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
            const SizedBox(height: 24),

            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('1. Which child?', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (state.children.isEmpty)
                      Text('No children added yet.', style: TextStyle(color: theme.colorScheme.error))
                    else
                      Wrap(
                        spacing: 8, runSpacing: 8,
                        children: state.children.map((child) => ChoiceChip(
                          label: Text('${child.avatarEmoji} ${child.name}'),
                          selected: _childId == child.id,
                          onSelected: (selected) {
                            setState(() {
                              _childId = selected ? child.id : null;
                              _templateId = null;
                              _amountController.clear();
                            });
                          },
                        )).toList(),
                      ),
                    
                    if (_childId != null) ...[
                      const SizedBox(height: 24),
                      Text('2. From which bucket?', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      if (bucketsWithBalance.isEmpty)
                        Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: theme.colorScheme.outlineVariant, style: BorderStyle.solid)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Center(child: Text('${selectedChild?.name} has no savings to withdraw from yet.', textAlign: TextAlign.center)),
                          ),
                        )
                      else
                        Wrap(
                          spacing: 8, runSpacing: 8,
                          children: bucketsWithBalance.map((bt) {
                            final balance = _getBucketBalanceFromState(state, _childId!, bt.id);
                            return ChoiceChip(
                              label: Text('${bt.emoji} ${bt.name} · \$${balance.toStringAsFixed(2)}'),
                              selected: _templateId == bt.id,
                              onSelected: (selected) => setState(() => _templateId = selected ? bt.id : null),
                            );
                          }).toList(),
                        ),
                    ],

                    if (_childId != null && _templateId != null && selectedBucketBalance != null) ...[
                      const SizedBox(height: 24),
                      Card(
                        color: theme.colorScheme.primaryContainer,
                        elevation: 0,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Available balance', style: TextStyle(color: theme.colorScheme.onPrimaryContainer)),
                              Text('\$${selectedBucketBalance.toStringAsFixed(2)}', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.onPrimaryContainer)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _amountController,
                        onChanged: (value) => setState(() {}),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Amount to Withdraw (\$)',
                          prefixIcon: Icon(Icons.currency_exchange),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _noteController,
                        onChanged: (value) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: "What's it for? (Optional)",
                          hintText: 'e.g. New toy, Snacks...',
                          prefixIcon: Icon(Icons.shopping_bag),
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],

                    const SizedBox(height: 32),
                    ElevatedButton.icon(
                      onPressed: (_isLoading || _childId == null || _templateId == null || _amountController.text.isEmpty) ? null : _handleWithdraw,
                      icon: _isLoading ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.outbound),
                      label: Text(_isLoading ? 'Processing...' : 'Confirm Withdrawal', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _isLoading ? null : () => context.pop(),
                      child: const Text('Cancel', style: TextStyle(fontSize: 16)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
