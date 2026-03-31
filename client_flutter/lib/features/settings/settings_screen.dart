import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../family/family_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/settings_provider.dart';
import 'package:flutter/services.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {

  Future<void> _handleSignOut() async {
    await ref.read(authProvider.notifier).signOut();
  }

  Future<void> _showEditProfileDialog() async {
    final familyState = ref.read(familyProvider);
    final userProfile = familyState.currentUserProfile;
    if (userProfile == null) return;

    final nameController = TextEditingController(text: userProfile.name);
    String selectedEmoji = userProfile.avatarEmoji;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Edit Profile'),
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
                children: ['😊', '😎', '🐱', '🐶', '🦄', '🚀', '🎨', '🍕'].map((emoji) {
                  return InkWell(
                    onTap: () => setState(() => selectedEmoji = emoji),
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
                  await ref.read(familyProvider.notifier).updateProfile(name, selectedEmoji);
                  if (mounted) Navigator.pop(ctx);
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showRenameFamilyDialog() async {
    final familyState = ref.read(familyProvider);
    if (familyState.family == null) return;

    final controller = TextEditingController(text: familyState.family!.name);

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename Family'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Family Name', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                await ref.read(familyProvider.notifier).renameFamily(name);
                if (mounted) Navigator.pop(ctx);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _showRegenerateCodeConfirmation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Invite Code'),
        content: const Text('Are you sure you want to generate a new invite code? The old one will stop working immediately.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error, foregroundColor: Theme.of(context).colorScheme.onError),
            child: const Text('Regenerate'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(familyProvider.notifier).regenerateFamilyInviteCode();
    }
  }

  Future<void> _showChangePasswordDialog() async {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool isLoading = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Change Password'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                TextField(
                  controller: currentPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Current Password',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: newPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New Password',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock_reset),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm New Password',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.check_circle_outline),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      final current = currentPasswordController.text;
                      final newPass = newPasswordController.text;
                      final confirm = confirmPasswordController.text;

                      if (current.isEmpty || newPass.isEmpty || confirm.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please fill all fields')),
                        );
                        return;
                      }

                      if (newPass.length < 6) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('New password must be at least 6 characters')),
                        );
                        return;
                      }

                      if (newPass != confirm) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('New passwords do not match')),
                        );
                        return;
                      }

                      setState(() => isLoading = true);
                      try {
                        await ref.read(authProvider.notifier).updatePassword(
                              newPass,
                              currentPassword: current,
                            );
                        if (mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Password updated successfully'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          setState(() => isLoading = false);
                          String errorMessage = 'Failed to update password';
                          if (e.toString().contains('Invalid login credentials')) {
                            errorMessage = 'Current password is incorrect';
                          } else if (e.toString().contains('New password should be different')) {
                            errorMessage = 'New password must be different from current password';
                          }
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(errorMessage),
                              backgroundColor: Theme.of(context).colorScheme.error,
                            ),
                          );
                        }
                      }
                    },
              child: isLoading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Update'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDeleteAccountConfirmation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Account', style: TextStyle(color: Theme.of(context).colorScheme.error)),
        content: const Text('DANGER: This will permanently delete your account, your family (if you are the creator), and all associated data. This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error, foregroundColor: Theme.of(context).colorScheme.onError),
            child: const Text('Delete Everything'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authProvider.notifier).deleteAccount();
    }
  }

  Future<void> _showDefaultChoreAmountDialog() async {
    final current = ref.read(defaultChoreAmountProvider).asData?.value ?? 5.0;
    final controller = TextEditingController(text: current.toStringAsFixed(2));

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Default Chore Reward'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Default amount (\$)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.attach_money),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(controller.text.trim());
              if (amount != null && amount >= 0) {
                await ref.read(defaultChoreAmountProvider.notifier).setAmount(amount);
                if (mounted) Navigator.pop(ctx);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmAndRun(
    String title,
    String message,
    String confirmLabel,
    Color confirmColor,
    Future<void> Function() action,
    String successMessage,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: confirmColor, foregroundColor: Colors.white),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await action();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(successMessage), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final familyState = ref.watch(familyProvider);
    final defaultAmount = ref.watch(defaultChoreAmountProvider).asData?.value ?? 5.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // My Profile
            _sectionLabel('My Profile', theme),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(familyState.currentUserProfile?.avatarEmoji ?? '😊', style: const TextStyle(fontSize: 32)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(familyState.currentUserProfile?.name ?? 'Loading...', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          Text('Parent', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit),
                      color: theme.colorScheme.primary,
                      style: IconButton.styleFrom(backgroundColor: theme.colorScheme.surfaceContainerHighest),
                      onPressed: _showEditProfileDialog,
                    ),
                  ],
                ),
              ),
            ),

            // Appearance
            _sectionLabel('Appearance', theme),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Customize how FamFi looks', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13)),
                    const SizedBox(height: 16),
                    ref.watch(settingsProvider).when(
                      data: (mode) => SegmentedButton<ThemeMode>(
                        segments: const [
                          ButtonSegment(value: ThemeMode.light, label: Text('Light'), icon: Icon(Icons.wb_sunny_outlined)),
                          ButtonSegment(value: ThemeMode.dark, label: Text('Dark'), icon: Icon(Icons.nightlight_round_outlined)),
                          ButtonSegment(value: ThemeMode.system, label: Text('System'), icon: Icon(Icons.brightness_auto_outlined)),
                        ],
                        selected: {mode},
                        onSelectionChanged: (newSelection) {
                          ref.read(settingsProvider.notifier).setThemeMode(newSelection.first);
                        },
                      ),
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (err, _) => Text('Error: $err'),
                    ),
                  ],
                ),
              ),
            ),

            // Family
            if (familyState.family != null) ...[
              _sectionLabel('Family', theme),
              Card(
                elevation: 0,
                color: theme.colorScheme.surfaceContainerHighest,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
                margin: const EdgeInsets.only(bottom: 24),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(familyState.family!.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                Text('Members can join with your code', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(8)),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SelectableText(
                                  familyState.family!.inviteCode,
                                  style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2, color: theme.colorScheme.onPrimaryContainer, fontSize: 18),
                                ),
                                const SizedBox(width: 4),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  icon: const Icon(Icons.copy, size: 18),
                                  color: theme.colorScheme.onPrimaryContainer,
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: familyState.family!.inviteCode));
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: const Text('Invite code copied to clipboard'),
                                          behavior: SnackBarBehavior.floating,
                                          width: 280,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        TextButton.icon(
                          onPressed: _showRenameFamilyDialog,
                          icon: const Icon(Icons.edit, size: 18),
                          label: const Text('Rename'),
                        ),
                        TextButton.icon(
                          onPressed: _showRegenerateCodeConfirmation,
                          icon: const Icon(Icons.refresh, size: 18),
                          label: const Text('New Code'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            // Integrations
            _sectionLabel('Integrations', theme, topPadding: 8),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  ListTile(
                    leading: Icon(Icons.check_box, color: familyState.googleConnected ? theme.colorScheme.primary : theme.colorScheme.outline),
                    title: const Text('Google Tasks Integration'),
                    subtitle: Text(familyState.googleConnected ? 'Connected ✓' : 'Sync chore lists from Google'),
                    trailing: const Icon(Icons.chevron_right, size: 16),
                    onTap: () => context.push('/google-tasks'),
                  ),
                ],
              ),
            ),

            // Data Management
            _sectionLabel('Data Management', theme),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  // Default chore amount — not destructive
                  ListTile(
                    leading: const Icon(Icons.attach_money),
                    title: const Text('Default Chore Reward'),
                    subtitle: Text('\$${defaultAmount.toStringAsFixed(2)} — pre-filled when creating chores'),
                    trailing: const Icon(Icons.chevron_right, size: 16),
                    onTap: _showDefaultChoreAmountDialog,
                  ),
                  const Divider(height: 1),
                  // Clear completed chores — moderate risk
                  ListTile(
                    leading: Icon(Icons.check_circle_outline, color: Colors.orange[700]),
                    title: Text('Clear Completed Chores', style: TextStyle(color: Colors.orange[700])),
                    subtitle: const Text('Remove all done & approved chores'),
                    onTap: () => _confirmAndRun(
                      'Clear Completed Chores',
                      'This will permanently delete all chores marked as done or approved. Assigned chores will not be affected.',
                      'Clear',
                      Colors.orange[700]!,
                      () => ref.read(familyProvider.notifier).clearCompletedChores(),
                      'Completed chores cleared.',
                    ),
                  ),
                  const Divider(height: 1),
                  // Clear all chores — high risk
                  ListTile(
                    leading: Icon(Icons.playlist_remove, color: theme.colorScheme.error),
                    title: Text('Clear All Chores', style: TextStyle(color: theme.colorScheme.error)),
                    subtitle: const Text('Remove every chore for all children'),
                    onTap: () => _confirmAndRun(
                      'Clear All Chores',
                      'This will permanently delete ALL chores for every child, including ones currently assigned. This cannot be undone.',
                      'Delete All',
                      theme.colorScheme.error,
                      () => ref.read(familyProvider.notifier).clearAllChores(),
                      'All chores cleared.',
                    ),
                  ),
                  const Divider(height: 1),
                  // Clear transaction history — high risk
                  ListTile(
                    leading: Icon(Icons.receipt_long_outlined, color: theme.colorScheme.error),
                    title: Text('Clear Transaction History', style: TextStyle(color: theme.colorScheme.error)),
                    subtitle: const Text('Deletes all transactions and resets balances to \$0'),
                    onTap: () => _confirmAndRun(
                      'Clear Transaction History',
                      'This will permanently delete all transactions and reset every bucket balance to \$0. This cannot be undone.',
                      'Delete All',
                      theme.colorScheme.error,
                      () => ref.read(familyProvider.notifier).clearTransactionHistory(),
                      'Transaction history cleared and balances reset.',
                    ),
                  ),
                  const Divider(height: 1),
                  // Reset interest settings — moderate risk
                  ListTile(
                    leading: Icon(Icons.percent, color: Colors.orange[700]),
                    title: Text('Reset Interest Settings', style: TextStyle(color: Colors.orange[700])),
                    subtitle: const Text('Remove all interest & match rates'),
                    onTap: () => _confirmAndRun(
                      'Reset Interest Settings',
                      'This will delete all interest and parent-match settings for every savings bucket. You can reconfigure them in Interest Settings.',
                      'Reset',
                      Colors.orange[700]!,
                      () => ref.read(familyProvider.notifier).resetInterestSettings(),
                      'Interest settings reset.',
                    ),
                  ),
                ],
              ),
            ),

            // Account
            _sectionLabel('Account', theme),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.lock_reset),
                    title: const Text('Change Password'),
                    onTap: _showChangePasswordDialog,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: Icon(Icons.logout, color: theme.colorScheme.error),
                    title: Text('Sign Out', style: TextStyle(color: theme.colorScheme.error)),
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Sign Out'),
                          content: const Text('Are you sure you want to sign out?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                            ElevatedButton(
                              onPressed: () { Navigator.pop(ctx); _handleSignOut(); },
                              style: ElevatedButton.styleFrom(backgroundColor: theme.colorScheme.error),
                              child: const Text('Sign Out'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: Icon(Icons.delete_forever, color: theme.colorScheme.error),
                    title: Text('Delete Account', style: TextStyle(color: theme.colorScheme.error)),
                    onTap: _showDeleteAccountConfirmation,
                  ),
                ],
              ),
            ),

            // Legal & About
            _sectionLabel('Legal & About', theme),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  const ListTile(
                    leading: Icon(Icons.info_outline),
                    title: Text('Version'),
                    subtitle: Text('1.0.0'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.description_outlined),
                    title: const Text('Terms of Service'),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    onTap: () => _handleLaunchUrl('https://famfibank.app/terms'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.privacy_tip_outlined),
                    title: const Text('Privacy Policy'),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    onTap: () => _handleLaunchUrl('https://famfibank.app/privacy'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String label, ThemeData theme, {double topPadding = 0}) {
    return Padding(
      padding: EdgeInsets.only(left: 4, bottom: 8, top: topPadding),
      child: Text(label, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
    );
  }

  void _handleLaunchUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not launch $url')));
    }
  }
}
