// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Represents the global authentication state

@ProviderFor(Auth)
final authProvider = AuthProvider._();

/// Represents the global authentication state
final class AuthProvider extends $NotifierProvider<Auth, User?> {
  /// Represents the global authentication state
  AuthProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'authProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$authHash();

  @$internal
  @override
  Auth create() => Auth();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(User? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<User?>(value),
    );
  }
}

String _$authHash() => r'40fb80f763bb021a63984c3562e9d35445048142';

/// Represents the global authentication state

abstract class _$Auth extends $Notifier<User?> {
  User? build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<User?, User?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<User?, User?>,
              User?,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
