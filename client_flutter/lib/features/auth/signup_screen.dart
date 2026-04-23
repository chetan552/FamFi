import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'auth_provider.dart';
import 'social_login_buttons.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  String _name = '';
  String _email = '';
  String _password = '';
  String _confirmPassword = '';
  String? _error;
  bool _showPassword = false;
  bool _isLoading = false;

  Future<void> _handleSignup() async {
    setState(() => _error = null);

    final name = _name.trim();
    final email = _email.trim();
    final password = _password;
    final confirmPassword = _confirmPassword;

    if (name.isEmpty) { setState(() => _error = 'Please enter your name.'); return; }
    if (email.isEmpty) { setState(() => _error = 'Please enter your email.'); return; }
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) { setState(() => _error = 'Please enter a valid email.'); return; }
    if (password.length < 6) { setState(() => _error = 'Password must be at least 6 characters.'); return; }
    if (password != confirmPassword) { setState(() => _error = 'Passwords do not match.'); return; }

    setState(() => _isLoading = true);
    try {
      await ref.read(authProvider.notifier).signUp(email, password, name);
      TextInput.finishAutofillContext(shouldSave: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Signup successful! Welcome to FamFi.')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = _friendlySignupError(e.toString()));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _friendlySignupError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('user already registered') || lower.contains('already been registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (lower.contains('weak password') || lower.contains('password should be')) {
      return 'Password is too weak. Please choose a stronger password.';
    }
    if (lower.contains('invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (lower.contains('too many requests') || lower.contains('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (lower.contains('network') || lower.contains('socket') || lower.contains('connection')) {
      return 'Network error. Please check your connection and try again.';
    }
    final cleaned = raw.replaceAll('Exception: ', '').trim();
    if (cleaned.startsWith('(') || cleaned.length > 120) {
      return 'Sign up failed. Please try again.';
    }
    return cleaned;
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
    final isSmall = MediaQuery.sizeOf(context).width <= 380;
    final hPad = isSmall ? 16.0 : 24.0;
    final vPad = isSmall ? 12.0 : 24.0;
    final cardPad = isSmall ? 20.0 : 28.0;
    final bigGap = isSmall ? 16.0 : 24.0;
    final smallGap = isSmall ? 10.0 : 14.0;

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
                        Center(child: Text('🏦', style: TextStyle(fontSize: isSmall ? 36 : 48))),
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
                              "Your Family's Virtual Bank",
                              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                            ),
                          ),
                        ],
                        SizedBox(height: bigGap),

                        // ── Social Login ──
                        const SocialLoginButtons(actionLabel: 'Sign up'),

                        // ── Form ──
                        AutofillGroup(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextFormField(
                                decoration: const InputDecoration(labelText: 'Your Name', prefixIcon: Icon(Icons.person_outline)),
                                textCapitalization: TextCapitalization.words,
                                autofillHints: const [AutofillHints.name],
                                textInputAction: TextInputAction.next,
                                onChanged: (v) => _name = v,
                              ),
                              SizedBox(height: smallGap),
                              TextFormField(
                                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)),
                                keyboardType: TextInputType.emailAddress,
                                autofillHints: const [AutofillHints.username, AutofillHints.email],
                                textInputAction: TextInputAction.next,
                                onChanged: (v) => _email = v,
                              ),
                              SizedBox(height: smallGap),
                              TextFormField(
                                obscureText: !_showPassword,
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  suffixIcon: IconButton(
                                    icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                                    onPressed: () => setState(() => _showPassword = !_showPassword),
                                  ),
                                ),
                                autofillHints: const [AutofillHints.newPassword],
                                textInputAction: TextInputAction.next,
                                onChanged: (v) => _password = v,
                              ),
                              SizedBox(height: smallGap),
                              TextFormField(
                                obscureText: !_showPassword,
                                decoration: const InputDecoration(labelText: 'Confirm Password', prefixIcon: Icon(Icons.lock_clock_outlined)),
                                autofillHints: const [AutofillHints.newPassword],
                                textInputAction: TextInputAction.done,
                                onChanged: (v) => _confirmPassword = v,
                                onFieldSubmitted: (_) => _handleSignup(),
                              ),
                            ],
                          ),
                        ),

                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(_error!, style: TextStyle(color: theme.colorScheme.error, fontSize: 12)),
                          ),
                        SizedBox(height: smallGap + 4),

                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleSignup,
                          style: ElevatedButton.styleFrom(minimumSize: Size.fromHeight(isSmall ? 48 : 52)),
                          child: _isLoading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Create Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                        SizedBox(height: smallGap),

                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text.rich(
                            TextSpan(
                              text: 'By signing up, you agree to our ',
                              style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 11, height: 1.5),
                              children: [
                                WidgetSpan(
                                  child: InkWell(
                                    onTap: () => _launchUrl('https://famfibank.app/terms'),
                                    child: Text('Terms of Service', style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w600, fontSize: 11)),
                                  ),
                                ),
                                const TextSpan(text: ' and '),
                                WidgetSpan(
                                  child: InkWell(
                                    onTap: () => _launchUrl('https://famfibank.app/privacy'),
                                    child: Text('Privacy Policy', style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w600, fontSize: 11)),
                                  ),
                                ),
                                const TextSpan(text: '.'),
                              ],
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        SizedBox(height: smallGap + 4),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text("Already have an account? ", style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13)),
                            GestureDetector(
                              onTap: () => context.go('/login'),
                              child: Text('Sign In', style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                            ),
                          ],
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
