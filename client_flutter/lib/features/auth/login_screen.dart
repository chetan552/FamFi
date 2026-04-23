import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'auth_provider.dart';
import 'social_login_buttons.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  String _email = '';
  String _password = '';
  String? _error;
  bool _showPassword = false;
  bool _isLoading = false;

  Future<void> _handleLogin() async {
    setState(() {
      _error = null;
      _isLoading = true;
    });

    final email = _email.trim();
    final password = _password;

    if (email.isEmpty) {
      setState(() { _error = 'Please enter your email.'; _isLoading = false; });
      return;
    }
    if (password.isEmpty) {
      setState(() { _error = 'Please enter your password.'; _isLoading = false; });
      return;
    }

    try {
      await ref.read(authProvider.notifier).signIn(email, password);
      TextInput.finishAutofillContext();
    } catch (e) {
      if (mounted) {
        setState(() => _error = _friendlyAuthError(e.toString()));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _friendlyAuthError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('invalid_credentials') || lower.contains('invalid login credentials')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (lower.contains('email not confirmed')) {
      return 'Please confirm your email address before signing in.';
    }
    if (lower.contains('user not found')) {
      return 'No account found with that email address.';
    }
    if (lower.contains('too many requests') || lower.contains('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (lower.contains('network') || lower.contains('socket') || lower.contains('connection')) {
      return 'Network error. Please check your connection and try again.';
    }
    // Strip noisy prefix and return a generic fallback
    final cleaned = raw.replaceAll('Exception: ', '').replaceAll('AuthApiException', '').trim();
    // If it still looks like a raw exception, show generic
    if (cleaned.startsWith('(') || cleaned.length > 120) {
      return 'Sign in failed. Please try again.';
    }
    return cleaned;
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authProvider);
    final theme = Theme.of(context);
    final isSmall = MediaQuery.sizeOf(context).width <= 380;
    final hPad = isSmall ? 16.0 : 24.0;
    final vPad = isSmall ? 16.0 : 28.0;
    final cardPad = isSmall ? 20.0 : 28.0;
    final bigGap = isSmall ? 16.0 : 28.0;
    final smallGap = isSmall ? 12.0 : 16.0;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              theme.colorScheme.primary.withValues(alpha: 0.08),
              theme.colorScheme.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                    side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3)),
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(cardPad),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ── Branding ──
                        Center(child: Text('🏦', style: TextStyle(fontSize: isSmall ? 40 : 52))),
                        SizedBox(height: isSmall ? 4 : 6),
                        Center(
                          child: Text(
                            'FamFi',
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                        if (!isSmall) ...[
                          const SizedBox(height: 4),
                          Center(
                            child: Text(
                              'Welcome back!',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                        ],
                        SizedBox(height: bigGap),

                        // ── Social Login ──
                        const SocialLoginButtons(actionLabel: 'Continue'),

                        // ── Form ──
                        AutofillGroup(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextFormField(
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.username, AutofillHints.email],
                                onChanged: (v) => _email = v,
                                decoration: const InputDecoration(
                                  labelText: 'Email',
                                  prefixIcon: Icon(Icons.email_outlined),
                                ),
                              ),
                              SizedBox(height: smallGap),
                              TextFormField(
                                obscureText: !_showPassword,
                                textInputAction: TextInputAction.done,
                                autofillHints: const [AutofillHints.password],
                                onChanged: (v) => _password = v,
                                onFieldSubmitted: (_) => _handleLogin(),
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  suffixIcon: IconButton(
                                    icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                                    onPressed: () => setState(() => _showPassword = !_showPassword),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(_error!, style: TextStyle(color: theme.colorScheme.error, fontSize: 12)),
                          ),

                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () async {
                              final email = _email.trim();
                              if (email.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Enter your email above first, then tap Forgot Password.')),
                                );
                                return;
                              }
                              try {
                                await ref.read(authProvider.notifier).resetPassword(email);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Password reset email sent! Check your inbox.'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}')),
                                  );
                                }
                              }
                            },
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(50, 36),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text('Forgot Password?', style: TextStyle(color: theme.colorScheme.primary, fontSize: 13)),
                          ),
                        ),
                        SizedBox(height: isSmall ? 4 : 8),

                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(minimumSize: Size.fromHeight(isSmall ? 48 : 52)),
                          child: _isLoading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                        SizedBox(height: smallGap),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text("Don't have an account? ", style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13)),
                            GestureDetector(
                              onTap: () => context.go('/signup'),
                              child: Text('Sign Up', style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                            ),
                          ],
                        ),
                        SizedBox(height: smallGap),

                        ElevatedButton.icon(
                          onPressed: () => context.go('/child-login'),
                          icon: Icon(Icons.child_care, color: theme.colorScheme.onTertiaryContainer),
                          label: const Text("I'm a Kid", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: theme.colorScheme.tertiaryContainer,
                            foregroundColor: theme.colorScheme.onTertiaryContainer,
                            minimumSize: Size.fromHeight(isSmall ? 46 : 50),
                            elevation: 0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
