import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/env.dart';

class SocialAuthService {
  final _supabase = Supabase.instance.client;

  /// Signs in with Google.
  /// Returns `true` if the user is new (no `users` table row yet).
  /// On web, this triggers a redirect and returns `false` (the page will reload).
  Future<bool> signInWithGoogle() async {
    if (kIsWeb) {
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: Uri.base.origin,
        authScreenLaunchMode: LaunchMode.inAppWebView,
      );
      // Web redirects away — this line is only reached if popup mode is used
      return false;
    }

    // Native (iOS / Android) — use ID token flow
    final googleSignIn = GoogleSignIn(
      clientId: Env.googleIosClientId,
      serverClientId: Env.googleWebClientId,
    );

    final googleUser = await googleSignIn.signIn();
    if (googleUser == null) {
      throw Exception('Google sign-in was cancelled');
    }

    final googleAuth = await googleUser.authentication;
    final idToken = googleAuth.idToken;
    final accessToken = googleAuth.accessToken;

    if (idToken == null) {
      throw Exception('Could not retrieve Google ID token');
    }

    await _supabase.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      accessToken: accessToken,
    );

    // Check if this is a new user (no profile row yet)
    return await _isNewUser();
  }

  /// Returns true if the current auth user has no row in the `users` table.
  Future<bool> _isNewUser() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return true;

    final result = await _supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

    return result == null;
  }
}
