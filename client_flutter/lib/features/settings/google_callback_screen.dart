import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/services/google_tasks_service.dart';
import '../family/family_provider.dart';

class GoogleCallbackScreen extends ConsumerStatefulWidget {
  final String? code;
  final String? error;

  const GoogleCallbackScreen({super.key, this.code, this.error});

  @override
  ConsumerState<GoogleCallbackScreen> createState() => _GoogleCallbackScreenState();
}

class _GoogleCallbackScreenState extends ConsumerState<GoogleCallbackScreen> {
  bool _isProcessing = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _processCode();
  }

  Future<void> _processCode() async {
    if (widget.error != null) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Authorization failed: ${widget.error}';
        });
      }
      return;
    }

    if (widget.code == null) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'No authorization code received.';
        });
      }
      return;
    }

    try {
      final supabase = Supabase.instance.client;
      final service = GoogleTasksService(supabase);
      final redirectUri = '${Uri.base.origin}/google-callback';

      // We didn't use PKCE for manual web flow since we are securely exchanging anyway.
      // Wait, Google REQUIRES PKCE or Client Secret. We have client_secret.
      // If codeVerifier is required by our service method, we can pass a dummy one if we didn't use PKCE or pass 'nouser' if not strictly validated.
      // Expo used PKCE, but server-side with client_secret doesn't strictly need it if we omited it in the auth URL.
      
      final tokens = await service.exchangeCodeForTokens(
        widget.code!,
        redirectUri,
      );

      final accessToken = tokens['access_token'] as String;
      final refreshToken = tokens['refresh_token'] as String?;
      final expiresIn = tokens['expires_in'] as int;

      await ref.read(familyProvider.notifier).saveGoogleTokens(accessToken, refreshToken, expiresIn);

      if (mounted) {
        context.go('/google-tasks');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Token exchange failed: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isProcessing) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Connecting to Google...'),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text('Connection Failed', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(_errorMessage ?? '', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/google-tasks'),
              child: const Text('Return to Settings'),
            ),
          ],
        ),
      ),
    );
  }
}
