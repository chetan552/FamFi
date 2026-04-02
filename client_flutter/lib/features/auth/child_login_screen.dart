import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// A simple data class for children returned by the invite-code RPC.
class _ChildEntry {
  final String id;
  final String name;
  final String avatarEmoji;
  _ChildEntry({required this.id, required this.name, required this.avatarEmoji});
  factory _ChildEntry.fromJson(Map<String, dynamic> j) =>
      _ChildEntry(id: j['id'], name: j['name'], avatarEmoji: j['avatar_emoji']);
}

class ChildLoginScreen extends ConsumerStatefulWidget {
  const ChildLoginScreen({super.key});

  @override
  ConsumerState<ChildLoginScreen> createState() => _ChildLoginScreenState();
}

class _ChildLoginScreenState extends ConsumerState<ChildLoginScreen> {
  final _inviteController = TextEditingController();
  int _step = 1;
  List<_ChildEntry> _children = [];
  String? _error;
  bool _isLoading = false;

  @override
  void dispose() {
    _inviteController.dispose();
    super.dispose();
  }

  Future<void> _lookupFamily() async {
    final code = _inviteController.text.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() => _error = 'Please enter your Family Link Code.');
      return;
    }

    setState(() { _error = null; _isLoading = true; });

    try {
      // Use the existing DB function that fetches children by invite code
      final result = await Supabase.instance.client
          .rpc('get_children_by_invite', params: {'p_invite_code': code});

      final kids = (result as List)
          .map((j) => _ChildEntry.fromJson(j as Map<String, dynamic>))
          .toList();

      if (kids.isEmpty) {
        setState(() => _error = "No kids found in this family yet. Ask your parent to add you first!");
        return;
      }

      setState(() { _children = kids; _step = 2; });
    } on PostgrestException catch (e) {
      setState(() {
        _error = e.message.contains('Invalid invite code')
            ? 'That code doesn\'t match any family. Please double-check and try again.'
            : 'Something went wrong. Please try again.';
      });
    } catch (_) {
      setState(() => _error = 'Connection error. Please check your internet and try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loginAsChild(_ChildEntry child) async {
    setState(() { _error = null; _isLoading = true; });

    try {
      final supabase = Supabase.instance.client;
      final code = _inviteController.text.trim().toUpperCase();

      // Step 1: Sign in anonymously so we get an auth.uid()
      await supabase.auth.signInAnonymously();

      // Step 2: Link this anonymous session to the chosen child profile
      await supabase.rpc('link_child_account', params: {
        'p_invite_code': code,
        'p_child_id': child.id,
      });

      // The authProvider listener will pick up the new session and
      // the router redirect will navigate to the dashboard.
    } catch (e) {
      if (mounted) {
        setState(() {
          final msg = e.toString().toLowerCase();
          if (msg.contains('already linked')) {
            _error = 'This account is already linked to another device. Ask a parent for help.';
          } else {
            _error = 'Login failed. Please try again.';
          }
        });
        // Sign out the anonymous session if linking failed
        await Supabase.instance.client.auth.signOut();
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              theme.colorScheme.secondary.withValues(alpha: 0.12),
              theme.colorScheme.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Column(
                  children: [
                    // ─── Header ───────────────────────────────────────
                    const Text('🎮', style: TextStyle(fontSize: 64)),
                    const SizedBox(height: 12),
                    Text(
                      'Kid Login',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: theme.colorScheme.secondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _step == 1 ? 'Enter your Family Link Code' : "Who's playing? 👇",
                      style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 32),

                    if (_step == 1) ...[
                      // ─── Step 1: Invite Code ────────────────────────
                      Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                          side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextField(
                                controller: _inviteController,
                                textCapitalization: TextCapitalization.characters,
                                textAlign: TextAlign.center,
                                maxLength: 8,
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 6,
                                  color: theme.colorScheme.secondary,
                                ),
                                decoration: const InputDecoration(
                                  labelText: 'Family Link Code',
                                  prefixIcon: Icon(Icons.link),
                                  counterText: '',
                                  hintText: 'ABC123',
                                ),
                                onChanged: (v) {
                                  _inviteController.value = _inviteController.value.copyWith(
                                    text: v.toUpperCase(),
                                    selection: TextSelection.collapsed(offset: v.length),
                                  );
                                },
                                onSubmitted: (_) => _lookupFamily(),
                              ),

                              if (_error != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(_error!, style: TextStyle(color: theme.colorScheme.error, fontSize: 13), textAlign: TextAlign.center),
                                ),
                              const SizedBox(height: 24),

                              ElevatedButton.icon(
                                onPressed: _isLoading ? null : _lookupFamily,
                                icon: _isLoading
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Icon(Icons.search),
                                label: const Text('Find My Family', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                  backgroundColor: theme.colorScheme.secondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      TextButton.icon(
                        onPressed: () => context.go('/login'),
                        icon: const Icon(Icons.arrow_back),
                        label: const Text("Wait, I'm a Parent"),
                        style: TextButton.styleFrom(foregroundColor: theme.colorScheme.onSurfaceVariant),
                      ),
                    ] else ...[
                      // ─── Step 2: Avatar Grid ────────────────────────
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Text(_error!, style: TextStyle(color: theme.colorScheme.error, fontSize: 13), textAlign: TextAlign.center),
                        ),

                      Wrap(
                        spacing: 16,
                        runSpacing: 16,
                        alignment: WrapAlignment.center,
                        children: _children.map((child) => _ChildCard(
                          name: child.name,
                          avatarEmoji: child.avatarEmoji,
                          isLoading: _isLoading,
                          onTap: () => _loginAsChild(child),
                        )).toList(),
                      ),
                      const SizedBox(height: 32),
                      TextButton.icon(
                        onPressed: _isLoading ? null : () => setState(() { _step = 1; _error = null; }),
                        icon: const Icon(Icons.arrow_back),
                        label: const Text('Back'),
                        style: TextButton.styleFrom(foregroundColor: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  final String name;
  final String avatarEmoji;
  final bool isLoading;
  final VoidCallback onTap;

  const _ChildCard({
    required this.name,
    required this.avatarEmoji,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: isLoading ? null : onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 140,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: theme.colorScheme.secondaryContainer,
          border: Border.all(color: theme.colorScheme.secondary.withValues(alpha: 0.3), width: 2),
          boxShadow: [
            BoxShadow(color: theme.colorScheme.secondary.withValues(alpha: 0.12), blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(avatarEmoji, style: const TextStyle(fontSize: 56)),
            const SizedBox(height: 12),
            Text(
              name,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
