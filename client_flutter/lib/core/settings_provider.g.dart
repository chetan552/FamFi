// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(Settings)
final settingsProvider = SettingsProvider._();

final class SettingsProvider
    extends $AsyncNotifierProvider<Settings, ThemeMode> {
  SettingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'settingsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$settingsHash();

  @$internal
  @override
  Settings create() => Settings();
}

String _$settingsHash() => r'1776a5bfb49099bb98f3bb3cca781a21d8a132ca';

abstract class _$Settings extends $AsyncNotifier<ThemeMode> {
  FutureOr<ThemeMode> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<ThemeMode>, ThemeMode>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<ThemeMode>, ThemeMode>,
              AsyncValue<ThemeMode>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(DefaultChoreAmount)
final defaultChoreAmountProvider = DefaultChoreAmountProvider._();

final class DefaultChoreAmountProvider
    extends $AsyncNotifierProvider<DefaultChoreAmount, double> {
  DefaultChoreAmountProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'defaultChoreAmountProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$defaultChoreAmountHash();

  @$internal
  @override
  DefaultChoreAmount create() => DefaultChoreAmount();
}

String _$defaultChoreAmountHash() =>
    r'11c5389e20732783fbace3028ed610a54a25e1db';

abstract class _$DefaultChoreAmount extends $AsyncNotifier<double> {
  FutureOr<double> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<double>, double>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<double>, double>,
              AsyncValue<double>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
