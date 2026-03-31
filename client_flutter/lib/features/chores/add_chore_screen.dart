import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import '../../core/settings_provider.dart';

class AddChoreScreen extends ConsumerStatefulWidget {
  const AddChoreScreen({super.key});

  @override
  ConsumerState<AddChoreScreen> createState() => _AddChoreScreenState();
}

class _AddChoreScreenState extends ConsumerState<AddChoreScreen> {
  final _titleController = TextEditingController();
  final _valueController = TextEditingController();
  final _dueDateController = TextEditingController();
  
  String? _selectedChildId;
  bool _isRecurring = false;
  String _recurrencePeriod = 'weekly';
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final children = ref.read(familyProvider).children;
      if (children.length == 1 && mounted) {
        setState(() => _selectedChildId = children.first.id);
      }
      final defaultAmount = ref.read(defaultChoreAmountProvider).asData?.value;
      if (defaultAmount != null && defaultAmount > 0 && mounted) {
        _valueController.text = defaultAmount.toStringAsFixed(2);
      }
    });
  }

  Future<void> _handleSave() async {
    setState(() => _error = null);
    
    final title = _titleController.text.trim();
    final valueText = _valueController.text.trim();
    final dueDate = _dueDateController.text.trim();

    if (title.isEmpty) {
      setState(() => _error = 'Please enter a chore title.');
      return;
    }
    
    final valueBase = double.tryParse(valueText);
    if (valueBase == null) {
      setState(() => _error = 'Please enter a valid amount.');
      return;
    }
    
    if (_selectedChildId == null) {
      setState(() => _error = 'Please select a child to assign this chore to.');
      return;
    }

    String? parsedDate;
    if (dueDate.isNotEmpty) {
      if (DateTime.tryParse(dueDate) == null) {
        setState(() => _error = 'Please enter a valid date as YYYY-MM-DD.');
        return;
      }
      parsedDate = dueDate;
    }

    try {
      await ref.read(familyProvider.notifier).createChore(
        _selectedChildId!, 
        title, 
        valueBase, 
        parsedDate, 
        _isRecurring, 
        _isRecurring ? _recurrencePeriod : null,
      );
      if (mounted) context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('New Chore')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Create a Chore', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            
            // Form Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'Chore Title', border: OutlineInputBorder(), hintText: 'e.g., Wash the dishes'),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _valueController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Reward Value (\$)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.attach_money), hintText: '5.00'),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _dueDateController,
                      decoration: const InputDecoration(labelText: 'Due Date — YYYY-MM-DD (Optional)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.calendar_today), hintText: '2025-12-31'),
                    ),
                    const SizedBox(height: 24),

                    // Assign To
                    const Text('Assign To', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (familyState.children.isEmpty)
                      Text('You need to add children to your family first.', style: TextStyle(color: theme.colorScheme.error))
                    else
                      Wrap(
                        spacing: 8,
                        children: familyState.children.map((child) {
                          return ChoiceChip(
                            label: Text('${child.avatarEmoji} ${child.name}'),
                            selected: _selectedChildId == child.id,
                            onSelected: (selected) {
                              if (selected) setState(() => _selectedChildId = child.id);
                            },
                          );
                        }).toList(),
                      ),
                    const SizedBox(height: 24),

                    // Recurring Toggle
                    Card(
                      elevation: 0,
                      color: theme.colorScheme.surfaceContainerHighest,
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                  Icon(Icons.repeat, color: _isRecurring ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Recurring Chore', style: TextStyle(fontWeight: FontWeight.bold)),
                                        Text('Auto-creates a new copy after each approval', style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
                                      ],
                                    ),
                                  ),
                                  Switch(value: _isRecurring, onChanged: (v) => setState(() => _isRecurring = v)),
                                ],
                            ),
                            if (_isRecurring) ...[
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 8,
                                children: ['daily', 'weekly', 'monthly'].map((period) {
                                  return ChoiceChip(
                                    label: Text(period.toUpperCase()),
                                    selected: _recurrencePeriod == period,
                                    onSelected: (selected) {
                                      if (selected) setState(() => _recurrencePeriod = period);
                                    },
                                  );
                                }).toList(),
                              ),
                            ]
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    if (_error != null) ...[
                      Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                      const SizedBox(height: 16),
                    ],

                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: familyState.loading ? null : _handleSave,
                      child: familyState.loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Create Chore', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => context.pop(),
                      child: const Text('Cancel'),
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
