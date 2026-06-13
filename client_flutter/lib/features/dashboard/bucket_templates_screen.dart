import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import '../../core/models/models.dart';
import '../../core/widgets/emoji_picker.dart';

const List<String> _bucketColors = [
  '#2B9EB3', '#4CAF50', '#F5A623', '#E85D75', '#7C4DFF', 
  '#FF7043', '#26A69A', '#5C6BC0', '#EC407A', '#42A5F5',
];

const List<Map<String, String>> _defaultSuggestions = [
  {'name': 'Savings', 'emoji': '💰', 'color': '#4CAF50'},
  {'name': 'Fun Money', 'emoji': '🎮', 'color': '#7C4DFF'},
  {'name': 'Giving', 'emoji': '🎁', 'color': '#E85D75'},
];

class BucketTemplatesScreen extends ConsumerStatefulWidget {
  const BucketTemplatesScreen({super.key});

  @override
  ConsumerState<BucketTemplatesScreen> createState() => _BucketTemplatesScreenState();
}

class _BucketTemplatesScreenState extends ConsumerState<BucketTemplatesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(familyProvider.notifier).fetchFamily();
    });
  }

  void _openModal({BucketTemplate? template}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AddEditBucketModal(template: template),
    );
  }

  void _handleDelete(BucketTemplate template) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Bucket'),
        content: Text('Are you sure you want to remove "${template.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              // Handle delete in provider
              final provider = ref.read(familyProvider.notifier);
              try {
                await provider.deleteBucketTemplate(template.id);
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${template.name} removed.')));
              } catch (e) {
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: Text('Remove', style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        ],
      ),
    );
  }

  void _handleAddSuggestion(Map<String, String> suggestion) async {
    final provider = ref.read(familyProvider.notifier);
    try {
      await provider.createBucketTemplate(suggestion['name']!, suggestion['emoji']!, suggestion['color']!);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${suggestion['name']} added!')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final familyState = ref.watch(familyProvider);
    final templates = familyState.bucketTemplates;

    final unusedSuggestions = _defaultSuggestions.where(
      (s) => !templates.any((bt) => bt.name.toLowerCase() == s['name']!.toLowerCase())
    ).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Spending Buckets')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text('🪣', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 8),
            Text('Spending Buckets', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
            const SizedBox(height: 8),
            Text('Create categories for how your children save and spend', textAlign: TextAlign.center, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 24),

            if (unusedSuggestions.isNotEmpty) ...[
              Align(alignment: Alignment.centerLeft, child: Text('Quick Add:', style: theme.textTheme.titleSmall)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: unusedSuggestions.map((s) => ActionChip(
                  avatar: Text(s['emoji']!),
                  label: Text(s['name']!),
                  onPressed: () => _handleAddSuggestion(s),
                )).toList(),
              ),
              const SizedBox(height: 24),
            ],

            if (templates.isEmpty)
              Card(
                elevation: 0,
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                child: const Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      Text('🪣', style: TextStyle(fontSize: 48)),
                      SizedBox(height: 16),
                      Text('No buckets yet. Use the quick-adds above or tap + to create custom ones.', textAlign: TextAlign.center),
                    ],
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: templates.length,
                itemBuilder: (context, index) {
                  final item = templates[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border(left: BorderSide(color: Color(int.parse(item.color.replaceFirst('#', '0xFF'))), width: 6)),
                      ),
                      child: ListTile(
                        leading: Text(item.emoji, style: const TextStyle(fontSize: 28)),
                        title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(icon: const Icon(Icons.edit), onPressed: () => _openModal(template: item)),
                            IconButton(
                              icon: const Icon(Icons.close),
                              color: theme.colorScheme.error,
                              onPressed: () => _handleDelete(item),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),

            if (templates.isNotEmpty) ...[
              const SizedBox(height: 32),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => context.go('/'),
                      icon: const Icon(Icons.check),
                      label: const Text('Finish Setup', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 48),
            ]
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openModal,
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AddEditBucketModal extends ConsumerStatefulWidget {
  final BucketTemplate? template;
  const _AddEditBucketModal({this.template});

  @override
  ConsumerState<_AddEditBucketModal> createState() => _AddEditBucketModalState();
}

class _AddEditBucketModalState extends ConsumerState<_AddEditBucketModal> {
  late TextEditingController _nameController;
  late String _selectedEmoji;
  late String _selectedColor;

  static const List<String> bucketEmojis = ['💰', '🎮', '🎁', '📚', '🎨', '⚽', '🎵', '🍕', '🐾', '✈️', '🏠', '💝'];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.template?.name ?? '');
    _selectedEmoji = widget.template?.emoji ?? '💰';
    _selectedColor = widget.template?.color ?? _bucketColors[0];
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _handleSave() async {
    if (_nameController.text.trim().isEmpty) return;
    
    final name = _nameController.text.trim();
    final provider = ref.read(familyProvider.notifier);
    
    try {
      if (widget.template == null) {
        await provider.createBucketTemplate(name, _selectedEmoji, _selectedColor);
      } else {
        await provider.updateBucketTemplate(widget.template!.id, name, _selectedEmoji, _selectedColor);
      }
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.template == null ? 'Bucket created!' : 'Bucket updated!')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.template == null ? 'Create a Bucket' : 'Edit Bucket', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: "Bucket Name", border: OutlineInputBorder()),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 24),
          Text('Pick an Icon', style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: bucketEmojis.map((e) => InkWell(
              onTap: () => setState(() => _selectedEmoji = e),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: _selectedEmoji == e ? theme.colorScheme.primaryContainer : Colors.transparent,
                  border: Border.all(color: _selectedEmoji == e ? theme.colorScheme.primary : theme.colorScheme.outline, width: 2),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(e, style: const TextStyle(fontSize: 24)),
              ),
            )).toList(),
          ),
          const SizedBox(height: 24),
          Text('Pick a Color', style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _bucketColors.map((c) {
              final color = Color(int.parse(c.replaceFirst('#', '0xFF')));
              final isSelected = _selectedColor == c;
              return InkWell(
                onTap: () => setState(() => _selectedColor = c),
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                  child: isSelected ? const Icon(Icons.check, color: Colors.white) : null,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              const SizedBox(width: 8),
              ElevatedButton(onPressed: _handleSave, child: Text(widget.template == null ? 'Create' : 'Save')),
            ],
          )
        ],
      ),
    );
  }
}
