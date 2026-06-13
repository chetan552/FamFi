import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';

class DepositGiftScreen extends ConsumerStatefulWidget {
  const DepositGiftScreen({super.key});

  @override
  ConsumerState<DepositGiftScreen> createState() => _DepositGiftScreenState();
}

class _DepositGiftScreenState extends ConsumerState<DepositGiftScreen> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController(text: 'Birthday Gift 🎁');
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
      if (state.children.length == 1) {
        setState(() => _childId = state.children.first.id);
      }
    });
  }

  void _handleSave() async {
    final amountText = _amountController.text;
    final amount = double.tryParse(amountText);

    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount greater than 0.')));
      return;
    }
    if (_childId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a child.')));
      return;
    }
    if (_templateId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a destination bucket.')));
      return;
    }

    setState(() => _isLoading = true);
    final provider = ref.read(familyProvider.notifier);

    try {
      await provider.addGift(_childId!, _templateId!, amount, _noteController.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gift of \$${amount.toStringAsFixed(2)} deposited! 🎁')));
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

    return Scaffold(
      appBar: AppBar(title: const Text('Deposit Gift')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Give a Gift 🎁', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Amount (\$)',
                        prefixIcon: Icon(Icons.attach_money),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _noteController,
                      decoration: const InputDecoration(
                        labelText: 'Note (Optional)',
                        hintText: "e.g., Grandparent's gift",
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 24),

                    if (state.children.isNotEmpty) ...[
                      Text('To Child', style: theme.textTheme.titleSmall),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: state.children.map((child) => ChoiceChip(
                          label: Text('${child.avatarEmoji} ${child.name}'),
                          selected: _childId == child.id,
                          onSelected: (selected) => setState(() => _childId = selected ? child.id : null),
                        )).toList(),
                      ),
                      const SizedBox(height: 24),
                    ],

                    if (state.bucketTemplates.isNotEmpty) ...[
                      Text('Into Bucket', style: theme.textTheme.titleSmall),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: state.bucketTemplates.map((bt) => ChoiceChip(
                          label: Text('${bt.emoji} ${bt.name}'),
                          selected: _templateId == bt.id,
                          onSelected: (selected) => setState(() => _templateId = selected ? bt.id : null),
                        )).toList(),
                      ),
                    ],

                    if (state.children.isEmpty || state.bucketTemplates.isEmpty) ...[
                      const SizedBox(height: 16),
                      Text('You need to add both children and bucket templates first.', style: TextStyle(color: theme.colorScheme.error)),
                    ],

                    const SizedBox(height: 32),
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 400),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading || state.children.isEmpty || state.bucketTemplates.isEmpty ? null : _handleSave,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: _isLoading
                              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('Deposit Gift', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ),
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
