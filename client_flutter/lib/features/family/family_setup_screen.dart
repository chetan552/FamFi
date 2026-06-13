import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'family_provider.dart';

class FamilySetupScreen extends ConsumerStatefulWidget {
  const FamilySetupScreen({super.key});

  @override
  ConsumerState<FamilySetupScreen> createState() => _FamilySetupScreenState();
}

class _FamilySetupScreenState extends ConsumerState<FamilySetupScreen> {
  bool _isCreateMode = true;
  final _nameController = TextEditingController();
  final _inviteController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _inviteController.dispose();
    super.dispose();
  }

  Future<void> _handleCreate() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    try {
      await ref.read(familyProvider.notifier).createFamily(name);
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _handleJoin() async {
    final code = _inviteController.text.trim();
    if (code.length < 6) return;

    try {
      await ref.read(familyProvider.notifier).joinFamily(code);
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Set Up Your Family')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              '👨‍👩‍👧‍👦',
              style: TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              'Give your family bank a name to get started',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: true, label: Text('Create New')),
                ButtonSegment(value: false, label: Text('Join Existing')),
              ],
              selected: {_isCreateMode},
              onSelectionChanged: (Set<bool> newSelection) {
                setState(() => _isCreateMode = newSelection.first);
              },
            ),
            const SizedBox(height: 32),
            if (_isCreateMode) ...[
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Family Name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: familyState.loading ? null : _handleCreate,
                child: familyState.loading ? const CircularProgressIndicator() : const Text('Create Family'),
              ),
            ] else ...[
              TextField(
                controller: _inviteController,
                decoration: const InputDecoration(labelText: 'Invite Code', border: OutlineInputBorder()),
                textCapitalization: TextCapitalization.characters,
                maxLength: 6,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: familyState.loading ? null : _handleJoin,
                child: familyState.loading ? const CircularProgressIndicator() : const Text('Join Family'),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
