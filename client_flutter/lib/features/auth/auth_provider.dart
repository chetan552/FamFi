import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'auth_provider.g.dart';

/// Represents the global authentication state
@riverpod
class Auth extends _$Auth {
  final _supabase = Supabase.instance.client;

  @override
  User? build() {
    // Listen to auth state changes to keep the provider updated
    _supabase.auth.onAuthStateChange.listen((data) {
      if (state != data.session?.user) {
        state = data.session?.user;
      }
    });
    return _supabase.auth.currentUser;
  }

  Future<void> signIn(String email, String password) async {
    await _supabase.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signUp(String email, String password, String name) async {
    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {'name': name},
    );

    // If needed, insert into users table similar to the React Native version
    if (response.user != null) {
      await _supabase.from('users').insert({
        'auth_id': response.user!.id,
        'role': 'parent',
        'name': name,
        'avatar_emoji': '😊',
      });
    }
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  Future<void> resetPassword(String email) async {
    await _supabase.auth.resetPasswordForEmail(email);
  }

  Future<void> updatePassword(String newPassword, {String? currentPassword}) async {
    if (currentPassword != null && state?.email != null) {
      // Re-authenticate to verify the current password
      await _supabase.auth.signInWithPassword(
        email: state!.email!,
        password: currentPassword,
      );
    }
    await _supabase.auth.updateUser(UserAttributes(password: newPassword));
  }

  Future<void> deleteAccount() async {
    await _supabase.rpc('delete_user');
    await signOut();
  }
}
