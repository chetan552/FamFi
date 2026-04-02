import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'auth_provider.dart';

class SocialLoginButtons extends ConsumerStatefulWidget {
  /// Label prefix: "Continue" for login, "Sign up" for signup
  final String actionLabel;

  const SocialLoginButtons({super.key, this.actionLabel = 'Continue'});

  @override
  ConsumerState<SocialLoginButtons> createState() => _SocialLoginButtonsState();
}

class _SocialLoginButtonsState extends ConsumerState<SocialLoginButtons> {
  bool _googleLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _googleLoading = true);

    try {
      final isNewUser = await ref.read(authProvider.notifier).signInWithGoogle();
      if (mounted && isNewUser) {
        context.go('/complete-profile');
      }
      // If not a new user, the auth state change will trigger router redirect to /
    } catch (e) {
      if (mounted) {
        final message = e.toString().replaceAll('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Google Sign-In Button
        OutlinedButton(
          onPressed: _googleLoading ? null : _handleGoogleSignIn,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            side: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
          child: _googleLoading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Google "G" logo using a simple text approach
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('G', style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF4285F4),
                      )),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${widget.actionLabel} with Google',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
        ),

        const SizedBox(height: 24),

        // Divider with "or"
        Row(
          children: [
            Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('or', style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13)),
            ),
            Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
          ],
        ),

        const SizedBox(height: 24),
      ],
    );
  }
}
