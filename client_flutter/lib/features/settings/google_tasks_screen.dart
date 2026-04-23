import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/models/models.dart';
import '../../core/services/google_tasks_service.dart';
import '../family/family_provider.dart';

class GoogleTasksScreen extends ConsumerStatefulWidget {
  const GoogleTasksScreen({super.key});

  @override
  ConsumerState<GoogleTasksScreen> createState() => _GoogleTasksScreenState();
}

class _GoogleTasksScreenState extends ConsumerState<GoogleTasksScreen> {
  bool _loadingLists = false;
  List<Map<String, dynamic>> _taskLists = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final notifier = ref.read(familyProvider.notifier);
      await notifier.fetchFamily(); // Ensure family is loaded first
      await notifier.checkGoogleConnection();
      await notifier.fetchGoogleMappings();
      
      // Now that connection check has resolved, load task lists if connected
      if (!mounted) return;
      final state = ref.read(familyProvider);

      if (state.googleConnected && state.currentUserProfile != null) {
        _loadTaskLists();
      }
    });
  }

  Future<void> _loadTaskLists() async {
    setState(() => _loadingLists = true);
    try {
      final state = ref.read(familyProvider);
      final userId = state.currentUserProfile?.id;
      if (userId == null) return;

      final service = GoogleTasksService(Supabase.instance.client);
      final token = await service.getValidAccessTokenForUser(userId);
      final lists = await service.fetchTaskLists(token);
      
      if (mounted) {
        setState(() => _taskLists = lists);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load lists: $e')));
    } finally {
      if (mounted) setState(() => _loadingLists = false);
    }
  }

  void _handleConnect() async {
    final redirectUri = '${Uri.base.origin}/google-callback';
    final clientId = GoogleTasksService.clientId;
    final url = Uri.parse('https://accounts.google.com/o/oauth2/v2/auth').replace(queryParameters: {
      'client_id': clientId,
      'redirect_uri': redirectUri,
      'response_type': 'code',
      'scope': 'https://www.googleapis.com/auth/tasks.readonly',
      'access_type': 'offline',
      'prompt': 'consent',
    });

    try {
      await launchUrl(url, webOnlyWindowName: '_self');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open browser for auth.')));
    }
  }

  void _handleDisconnect() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect Google'),
        content: const Text('This will stop syncing tasks. Your existing chores from Google Tasks will remain.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(familyProvider.notifier).disconnectGoogle();
              setState(() => _taskLists = []);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Google disconnected.')));
            },
            child: const Text('Disconnect', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _openMapModal(Map<String, dynamic> list) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _MapListModal(list: list),
    );
  }

  void _handleSync() async {
    final result = await ref.read(familyProvider.notifier).syncGoogleTasks();
    if (!mounted) return;
    
    final errors = result['errors'] as List;
    final synced = result['synced'] as int;

    if (errors.isNotEmpty) {
      final raw = errors.first.toString();
      final msg = raw.contains('google_auth_expired')
          ? 'Google authorization expired. Please reconnect your Google account.'
          : raw.replaceAll('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        duration: const Duration(seconds: 5),
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Synced $synced task(s)!')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(familyProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Google Tasks')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Icon(Icons.check_box, size: 48, color: Colors.blue),
            const SizedBox(height: 8),
            Text('Google Tasks', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            Text('Sync your Google Task Lists as chores', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 24),

            // Connection Card
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(state.googleConnected ? 'Connected ✅' : 'Not Connected', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          Text(
                            state.googleConnected 
                              ? 'Your Google account is linked. Tasks will sync as chores.'
                              : 'Connect your Google account to start syncing task lists.',
                            style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (state.googleConnected)
                      OutlinedButton(
                        onPressed: _handleDisconnect,
                        style: OutlinedButton.styleFrom(foregroundColor: theme.colorScheme.error),
                        child: const Text('Disconnect'),
                      )
                    else
                      ElevatedButton.icon(
                        onPressed: _handleConnect,
                        icon: const Icon(Icons.login),
                        label: const Text('Connect'),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Mappings list
            if (state.googleConnected && state.googleMappings.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Active Mappings', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  ElevatedButton.icon(
                    onPressed: state.loading ? null : _handleSync,
                    icon: state.loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.sync),
                    label: const Text('Sync Now'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...state.googleMappings.map((mapping) {
                final child = state.children.where((c) => c.id == mapping.childId).firstOrNull;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const Icon(Icons.check_box, color: Colors.blue),
                    title: Text(mapping.googleTasklistTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${child?.avatarEmoji ?? ''} ${child?.name ?? 'Unknown'} • \$${mapping.defaultReward.toStringAsFixed(2)} each'),
                        if (mapping.lastSyncedAt != null)
                          Text('Last synced: ${mapping.lastSyncedAt}', style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                    trailing: IconButton(
                      icon: Icon(Icons.close, color: theme.colorScheme.error),
                      onPressed: () {
                        ref.read(familyProvider.notifier).deleteGoogleMapping(mapping.id);
                      },
                    ),
                  ),
                );
              }).toList(),
              const SizedBox(height: 24),
            ],

            // Task Lists
            if (state.googleConnected && _taskLists.isNotEmpty) ...[
              Align(alignment: Alignment.centerLeft, child: Text('Available Task Lists', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold))),
              const SizedBox(height: 8),
              if (_loadingLists)
                const CircularProgressIndicator()
              else
                ..._taskLists.map((list) {
                  final isMapped = state.googleMappings.any((m) => m.googleTasklistId == list['id']);
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Icon(isMapped ? Icons.check_box : Icons.check_box_outline_blank, color: isMapped ? theme.colorScheme.primary : theme.colorScheme.outline),
                      title: Text(list['title'], style: const TextStyle(fontWeight: FontWeight.bold)),
                      trailing: !isMapped ? ElevatedButton(
                        onPressed: () => _openMapModal(list),
                        child: const Text('Map'),
                      ) : null,
                    ),
                  );
                }),
            ],

            if (state.googleConnected && state.googleMappings.isEmpty && _taskLists.isEmpty) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      Icon(Icons.assignment, size: 48, color: theme.colorScheme.outline),
                      const SizedBox(height: 16),
                      Text('Google account connected! Load your task lists to start mapping them to your children.', textAlign: TextAlign.center, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadTaskLists,
                        child: _loadingLists ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator()) : const Text('Load Task Lists'),
                      )
                    ],
                  ),
                ),
              )
            ]
          ],
        ),
      ),
    );
  }
}

class _MapListModal extends ConsumerStatefulWidget {
  final Map<String, dynamic> list;
  const _MapListModal({required this.list});

  @override
  ConsumerState<_MapListModal> createState() => _MapListModalState();
}

class _MapListModalState extends ConsumerState<_MapListModal> {
  final _rewardController = TextEditingController(text: '1.00');
  String? _childId;

  void _handleSave() {
    final reward = double.tryParse(_rewardController.text);
    if (reward == null || _childId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a child and enter a valid reward.')));
      return;
    }

    ref.read(familyProvider.notifier).saveGoogleMapping(
      widget.list['id'], 
      widget.list['title'], 
      _childId!, 
      reward
    );

    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('"${widget.list['title']}" mapped!')));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(familyProvider);
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 16, right: 16, top: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Map "${widget.list['title']}"', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Choose which child these tasks belong to and the default reward per task.', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
          const SizedBox(height: 24),

          Text('Assign To Child', style: theme.textTheme.titleSmall),
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
          const SizedBox(height: 16),

          TextField(
            controller: _rewardController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Default Reward (\$)',
              prefixIcon: Icon(Icons.attach_money),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _childId == null ? null : _handleSave,
                child: const Text('Save Mapping'),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
