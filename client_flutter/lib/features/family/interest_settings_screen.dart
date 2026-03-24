import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../family/family_provider.dart';

class InterestSettingsScreen extends ConsumerStatefulWidget {
  const InterestSettingsScreen({super.key});

  @override
  ConsumerState<InterestSettingsScreen> createState() => _InterestSettingsScreenState();
}

class _InterestSettingsScreenState extends ConsumerState<InterestSettingsScreen> {
  final Map<String, _LocalSetting> _settings = {};
  bool _processing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncSettings();
    });
  }

  void _syncSettings() {
    final familyState = ref.read(familyProvider);
    final initial = <String, _LocalSetting>{};
    for (final bt in familyState.bucketTemplates) {
      final existing = familyState.interestSettings.where((s) => s.templateId == bt.id).firstOrNull;
      initial[bt.id] = _LocalSetting(
        rate: existing != null ? existing.ratePercent.toString() : '0',
        match: existing?.matchEnabled ?? false,
      );
    }
    setState(() {
      _settings.clear();
      _settings.addAll(initial);
    });
  }

  Future<void> _handleSaveAll() async {
    setState(() => _saving = true);
    bool hasError = false;

    try {
      for (final entry in _settings.entries) {
        final rate = double.tryParse(entry.value.rate) ?? 0.0;
        await ref.read(familyProvider.notifier).saveInterestSetting(entry.key, rate, entry.value.match);
      }
    } catch (e) {
      hasError = true;
    } finally {
      setState(() => _saving = false);
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(hasError ? 'Some settings could not be saved' : 'Interest settings saved!')),
      );
    }
  }

  Future<void> _handleProcessInterest() async {
    setState(() => _processing = true);
    
    try {
      final processed = await ref.read(familyProvider.notifier).processInterest();
      if (mounted) {
        if (processed == 0) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No qualifying balances to process interest on.')));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Interest processed for $processed bucket(s)! 🎉')));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final familyState = ref.watch(familyProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Interest & Match'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Description
            Row(
              children: [
                const Icon(Icons.percent, size: 32, color: Colors.deepPurpleAccent),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Interest & Match',
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Set a monthly interest rate for each savings bucket. Enable parent matching to double the bonus!',
              style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),

            if (familyState.bucketTemplates.isEmpty)
              Card(
                elevation: 0,
                color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text(
                    'No bucket templates yet. Create some in Settings first.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              )
            else ...[
              for (final bt in familyState.bucketTemplates) ...[
                Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        // Bucket Title
                        Row(
                          children: [
                            Container(width: 12, height: 12, decoration: BoxDecoration(color: Color(int.parse(bt.color.replaceFirst('#', '0xFF'))), shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Text(bt.emoji, style: const TextStyle(fontSize: 22)),
                            const SizedBox(width: 8),
                            Expanded(child: Text(bt.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Rate Row
                        Row(
                          children: [
                            Expanded(child: Text('Monthly Rate (%)', style: TextStyle(color: theme.colorScheme.onSurfaceVariant))),
                            SizedBox(
                              width: 100,
                              child: TextField(
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  suffixText: '%',
                                  isDense: true,
                                ),
                                controller: TextEditingController(text: _settings[bt.id]?.rate ?? '0')
                                  ..selection = TextSelection.collapsed(offset: _settings[bt.id]?.rate.length ?? 0),
                                onChanged: (val) {
                                  _settings[bt.id]?.rate = val;
                                },
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Match Row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Parent Match', style: TextStyle(fontWeight: FontWeight.bold)),
                                Text('Double the interest bonus', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                              ],
                            ),
                            Switch(
                              value: _settings[bt.id]?.match ?? false,
                              activeColor: Colors.deepPurpleAccent,
                              onChanged: (val) {
                                setState(() {
                                  _settings[bt.id]?.match = val;
                                });
                              },
                            )
                          ],
                        )
                      ],
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _saving || familyState.loading ? null : _handleSaveAll,
                icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
                label: const Text('Save Settings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),

              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Divider(),
              ),

              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.deepPurpleAccent.withOpacity(0.4)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Process Monthly Interest', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      Text(
                        "Calculate and credit interest to all children's qualifying buckets based on current balances.",
                        style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _processing || familyState.loading ? null : _handleProcessInterest,
                        icon: _processing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.account_balance),
                        label: const Text('Process Interest Now', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.deepPurpleAccent,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}

class _LocalSetting {
  String rate;
  bool match;
  _LocalSetting({required this.rate, required this.match});
}
