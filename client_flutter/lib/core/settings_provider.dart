import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'settings_provider.g.dart';

@riverpod
class Settings extends _$Settings {
  static const _themeKey = 'theme_mode';

  @override
  FutureOr<ThemeMode> build() async {
    final prefs = await SharedPreferences.getInstance();
    final savedMode = prefs.getString(_themeKey);

    if (savedMode == 'light') return ThemeMode.light;
    if (savedMode == 'dark') return ThemeMode.dark;
    return ThemeMode.system;
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = AsyncValue.data(mode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeKey, mode.name);
  }
}

@riverpod
class SetupChecklistDismissed extends _$SetupChecklistDismissed {
  static const _key = 'setup_checklist_dismissed';

  @override
  FutureOr<bool> build() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key) ?? false;
  }

  Future<void> dismiss() async {
    state = const AsyncValue.data(true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
  }
}

@riverpod
class DefaultChoreAmount extends _$DefaultChoreAmount {
  static const _key = 'default_chore_amount';

  @override
  FutureOr<double> build() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_key) ?? 5.0;
  }

  Future<void> setAmount(double amount) async {
    state = AsyncValue.data(amount);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_key, amount);
  }
}
