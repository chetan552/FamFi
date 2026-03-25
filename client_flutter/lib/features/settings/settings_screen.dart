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

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not launch $url')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = ref.watch(authProvider);
    final familyState = ref.watch(familyProvider);

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
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text('My Profile', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
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
                        gradient: LinearGradient(
                          colors: [
                            theme.colorScheme.primary.withOpacity(0.15),
                            theme.colorScheme.primary.withOpacity(0.05),
                          ],
                        ),
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
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Edit Profile coming soon')));
                      },
                    ),
                  ],
                ),
              ),
            ),
            
            // Appearance
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text('Appearance', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
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
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 8),
                child: Text('Family', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ),
              Card(
                elevation: 0,
                color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
                margin: const EdgeInsets.only(bottom: 24),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(familyState.family!.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text('Members can join with your code', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 12)),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(8)),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SelectableText(
                                  familyState.family!.inviteCode, 
                                  style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2, color: theme.colorScheme.onPrimaryContainer, fontSize: 18)
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
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rename Family coming soon')));
                          },
                          icon: const Icon(Icons.edit, size: 18),
                          label: const Text('Rename'),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Regenerate Code coming soon')));
                          },
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
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8, top: 8),
              child: Text('Integrations', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.4),
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

            // Account
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text('Account', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.4),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.lock_reset),
                    title: const Text('Change Password'),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Change Password coming soon')));
                    },
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
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Delete Account coming soon')));
                    },
                  ),
                ],
              ),
            ),

            // About & Legal
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text('Legal & About', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.4),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
              margin: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.info_outline),
                    title: const Text('Version'),
                    subtitle: const Text('1.0.0'),
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

  void _handleLaunchUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not launch $url')));
    }
  }
}
