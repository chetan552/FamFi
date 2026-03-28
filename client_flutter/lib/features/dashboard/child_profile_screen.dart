import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';

class ChildProfileScreen extends ConsumerStatefulWidget {
  final String childId;
  const ChildProfileScreen({super.key, required this.childId});

  @override
  ConsumerState<ChildProfileScreen> createState() => _ChildProfileScreenState();
}

class _ChildProfileScreenState extends ConsumerState<ChildProfileScreen> {
  @override
  void initState() {
    super.initState();
    // Only fetch if data hasn't loaded yet (e.g., direct deep-link)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (ref.read(familyProvider).family == null) {
        ref.read(familyProvider.notifier).fetchFamily();
      }
    });
  }

  void _handleDelete(String childName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Remove $childName?'),
        content: const Text('This will permanently remove this child and all their data. This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context); // close dialog
              final provider = ref.read(familyProvider.notifier);
              try {
                await provider.removeChild(widget.childId);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$childName removed.')));
                  context.pop(); // pop screen
                }
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

  void _showEditChildDialog(String currentName, String currentEmoji) {
    final nameController = TextEditingController(text: currentName);
    String selectedEmoji = currentEmoji;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit Child'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              const Text('Pick an Emoji'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['😊', '😎', '🐱', '🐶', '🦄', '🚀', '🎨', '🍕', '⭐', '🎮', '🏀', '🎸'].map((emoji) {
                  return InkWell(
                    onTap: () => setDialogState(() => selectedEmoji = emoji),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: selectedEmoji == emoji ? Theme.of(context).colorScheme.primaryContainer : null,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: selectedEmoji == emoji ? Theme.of(context).colorScheme.primary : Colors.transparent),
                      ),
                      child: Text(emoji, style: const TextStyle(fontSize: 24)),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final name = nameController.text.trim();
                if (name.isNotEmpty) {
                  try {
                    await ref.read(familyProvider.notifier).updateChild(widget.childId, name, selectedEmoji);
                    if (mounted) {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$name updated!')));
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                    }
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final familyState = ref.watch(familyProvider);
    
    final child = familyState.children.where((c) => c.id == widget.childId).firstOrNull;

    if (child == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Not Found')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Child not found.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              OutlinedButton(onPressed: () => context.pop(), child: const Text('Go Back')),
            ],
          ),
        ),
      );
    }

    // Safely calculate total balance only for buckets matching this child
    final totalBalance = familyState.buckets
        .where((b) => b.childId == child.id)
        .fold<double>(0, (sum, b) => sum + b.cachedBalance);

    // Get child's transactions
    final txs = familyState.transactions.where((t) => t.childId == child.id).take(5).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text("${child.name}'s Profile"),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _showEditChildDialog(child.name, child.avatarEmoji),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Profile Header
            Text(child.avatarEmoji, style: const TextStyle(fontSize: 64)),
            const SizedBox(height: 8),
            Text(child.name, style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('\$${totalBalance.toStringAsFixed(2)}', style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800, color: theme.colorScheme.primary)),
            Text('Total Family Bank Balance', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 32),

            // Buckets
            Align(alignment: Alignment.centerLeft, child: Text('Buckets', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold))),
            const SizedBox(height: 12),
            if (familyState.bucketTemplates.isEmpty)
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: theme.colorScheme.outlineVariant)),
                child: const Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Center(child: Text('No buckets set up yet.')),
                ),
              )
            else
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: familyState.bucketTemplates.map((template) {
                  final bucket = familyState.buckets.where((b) => b.templateId == template.id && b.childId == child.id).firstOrNull;
                  final balance = bucket?.cachedBalance ?? 0.0;
                  final color = template.parsedColor;
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: color.withOpacity(0.5), width: 1.5),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(template.emoji, style: const TextStyle(fontSize: 20)),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(template.name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: theme.colorScheme.onSurface)),
                            Text('\$${balance.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: color)),
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            const SizedBox(height: 32),

            // Activity
            Align(alignment: Alignment.centerLeft, child: Text('Recent Activity', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold))),
            const SizedBox(height: 16),
            if (txs.isEmpty)
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: theme.colorScheme.outlineVariant, style: BorderStyle.solid)),
                child: const Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Center(child: Text('No transactions yet.')),
                ),
              )
            else
              Card(
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: txs.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final tx = txs[index];
                    return ListTile(
                      leading: Icon(tx.type == 'gift' ? Icons.card_giftcard : Icons.attach_money),
                      title: Text(tx.description ?? tx.type.replaceAll('_', ' ')),
                      subtitle: Text(tx.createdAt.split('T').first),
                      trailing: Text(
                        '${tx.amount >= 0 ? '+' : '-'}\$${tx.amount.abs().toStringAsFixed(2)}',
                        style: TextStyle(
                          color: tx.amount >= 0 ? theme.colorScheme.primary : theme.colorScheme.error,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    );
                  },
                ),
              ),

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.push(Uri(path: '/withdraw', queryParameters: {'childId': child.id}).toString()),
                icon: const Icon(Icons.outbound),
                label: const Text('Record a Spend'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _handleDelete(child.name),
                icon: const Icon(Icons.person_remove),
                label: Text('Remove ${child.name} from Family'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: theme.colorScheme.error,
                  side: BorderSide(color: theme.colorScheme.error),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}
