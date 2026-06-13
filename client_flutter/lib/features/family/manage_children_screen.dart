import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import '../../core/widgets/emoji_picker.dart';
import '../../core/models/models.dart';

class ManageChildrenScreen extends ConsumerStatefulWidget {
  const ManageChildrenScreen({super.key});

  @override
  ConsumerState<ManageChildrenScreen> createState() => _ManageChildrenScreenState();
}

class _ManageChildrenScreenState extends ConsumerState<ManageChildrenScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(familyProvider.notifier).fetchFamily();
    });
  }

  void _openModal({UserProfile? child}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AddEditChildModal(child: child),
    );
  }

  void _handleRemove(UserProfile child) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Child'),
        content: Text('Are you sure you want to remove ${child.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final provider = ref.read(familyProvider.notifier);
              try {
                await provider.removeChild(child.id);
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${child.name} removed.')));
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: Text('Remove', style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);
    final children = familyState.children;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Children'),
      ),
      body: children.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('🧒', style: TextStyle(fontSize: 48)),
                    const SizedBox(height: 16),
                    Text('No children added yet.', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Text('Tap the + button to add your first child.', textAlign: TextAlign.center),
                  ],
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: children.length,
              itemBuilder: (context, index) {
                final child = children[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Text(child.avatarEmoji, style: const TextStyle(fontSize: 32)),
                    title: Text(child.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(icon: const Icon(Icons.edit), onPressed: () => _openModal(child: child)),
                        IconButton(
                          icon: const Icon(Icons.close),
                          color: theme.colorScheme.error,
                          onPressed: () => _handleRemove(child),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openModal(),
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: children.isNotEmpty
          ? Padding(
              padding: const EdgeInsets.all(16.0).copyWith(bottom: 32),
              child: ElevatedButton.icon(
                onPressed: () => context.push('/bucket-templates'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.arrow_right_alt),
                label: const Text('Set Up Buckets', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            )
          : null,
    );
  }
}

class _AddEditChildModal extends ConsumerStatefulWidget {
  final UserProfile? child;

  const _AddEditChildModal({this.child});

  @override
  ConsumerState<_AddEditChildModal> createState() => _AddEditChildModalState();
}

class _AddEditChildModalState extends ConsumerState<_AddEditChildModal> {
  late TextEditingController _nameController;
  late String _emoji;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.child?.name ?? '');
    _emoji = widget.child?.avatarEmoji ?? '😊';
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
      if (widget.child == null) {
        await provider.addChild(name, _emoji);
      } else {
        await provider.updateChild(widget.child!.id, name, _emoji);
      }
      if (mounted) {
        Navigator.pop(context); // close modal
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.child == null ? '$name added!' : '$name updated!'))
        );
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
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.child == null ? 'Add a Child' : 'Edit ${widget.child!.name}',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: "Child's Name",
              prefixIcon: Icon(Icons.person),
              border: OutlineInputBorder(),
            ),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 16),
          Text('Pick an Avatar', style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          EmojiPicker(
            selected: _emoji,
            onSelect: (e) => setState(() => _emoji = e),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _handleSave,
                child: Text(widget.child == null ? 'Add' : 'Save'),
              ),
            ],
          )
        ],
      ),
    );
  }
}
