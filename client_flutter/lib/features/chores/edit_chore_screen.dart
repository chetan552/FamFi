import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';

class EditChoreScreen extends ConsumerStatefulWidget {
  final String choreId;
  const EditChoreScreen({super.key, required this.choreId});

  @override
  ConsumerState<EditChoreScreen> createState() => _EditChoreScreenState();
}

class _EditChoreScreenState extends ConsumerState<EditChoreScreen> {
  final _titleController = TextEditingController();
  final _valueController = TextEditingController();
  final _dueDateController = TextEditingController();
  
  String? _selectedChildId;
  bool _isRecurring = false;
  String _recurrencePeriod = 'weekly';
  String? _error;
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final familyState = ref.read(familyProvider);
      final chore = familyState.chores.where((c) => c.id == widget.choreId).firstOrNull;
      if (chore != null) {
        _titleController.text = chore.title;
        _valueController.text = chore.value.toString();
        _dueDateController.text = chore.dueDate ?? '';
        _selectedChildId = chore.assignedToChildId;
        _isRecurring = chore.isRecurring;
        _recurrencePeriod = chore.recurrencePeriod ?? 'weekly';
      }
      _isInitialized = true;
    }
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
      setState(() => _error = 'Please select a child.');
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
      await ref.read(familyProvider.notifier).updateChore(
        widget.choreId,
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
    final chore = familyState.chores.where((c) => c.id == widget.choreId).firstOrNull;

    if (chore == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Chore')),
        body: const Center(child: Text('Chore not found.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Chore')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Edit Chore', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
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
                      decoration: const InputDecoration(labelText: 'Chore Title', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _valueController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Reward Value (\$)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.attach_money)),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _dueDateController,
                      decoration: const InputDecoration(labelText: 'Due Date — YYYY-MM-DD (Optional)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.calendar_today)),
                    ),
                    const SizedBox(height: 24),

                    // Assign To
                    const Text('Assign To', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
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
                      child: familyState.loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
