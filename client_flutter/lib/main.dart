import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/url_strategy.dart';
import 'core/env.dart';
import 'core/router.dart';
import 'core/settings_provider.dart';

void main() async {
  configureApp(); // Enable Path Strategy for Web
  WidgetsFlutterBinding.ensureInitialized();

  // Kick off font downloads before the first frame so the TextPainter
  // layout and paint sizes are consistent (prevents assert(debugSize == size)).
  GoogleFonts.outfit();
  GoogleFonts.inter();
  await GoogleFonts.pendingFonts();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  runApp(
    const ProviderScope(
      child: FamFiApp(),
    ),
  );
}

// ─── Color Palette ─────────────────────────────────────────────────────
const _teal       = Color(0xFF2B9EB3);
const _tealLight  = Color(0xFF5CC8DB);
const _tealDark   = Color(0xFF1A7A8A);
const _amber      = Color(0xFFF5A623);
const _amberLight = Color(0xFFFFCA61); // rgb(255, 202, 97) — kid button, secondary container
const _coral      = Color(0xFFE85D75);
const _amberDark  = Color(0xFFC77E00); //#c77e00

class FamFiApp extends ConsumerWidget {
  const FamFiApp({super.key});

  // Cache text themes to avoid recomputation on every build
  static final _lightTextTheme = GoogleFonts.interTextTheme();
  static final _darkTextTheme = GoogleFonts.interTextTheme(ThemeData.dark().textTheme);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final themeModeAsync = ref.watch(settingsProvider);

    return MaterialApp.router(
      title: 'FamFi',
      themeMode: themeModeAsync.when(
        data: (mode) => mode,
        loading: () => ThemeMode.system,
        error: (_, __) => ThemeMode.system,
      ),

      // ── Light Theme ──────────────────────────────────────────────────
      theme: ThemeData(
        useMaterial3: true,
        textTheme: _lightTextTheme,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _teal,
          primary: _teal,
          onPrimary: Colors.white,
          secondary: _amber,
          error: Colors.red.shade600,
          onSecondary: Colors.white,
          secondaryContainer: const Color(0xFFFFCA61),
          onSecondaryContainer: const Color(0xFFC77E00),
          tertiary: _coral,
          onTertiary: Colors.white,
          surface: const Color(0xFFF8FAFB),
          tertiaryContainer: _amberLight,
          onTertiaryContainer: _amberDark,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFB),
        appBarTheme: AppBarTheme(
          backgroundColor: const Color(0xFFF8FAFB),
          surfaceTintColor: Colors.transparent,
          scrolledUnderElevation: 0,
          elevation: 0,
          titleTextStyle: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            fontSize: 20,
            color: const Color(0xFF1A2E35),
          ),
          iconTheme: IconThemeData(color: Colors.blueGrey.shade600),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: Colors.white,
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.blueGrey.shade200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.blueGrey.shade200),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _teal, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        dividerTheme: DividerThemeData(
          color: Colors.blueGrey.shade100,
          thickness: 0.5,
        ),
        listTileTheme: const ListTileThemeData(
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: _teal,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            elevation: 0,
          ),
        ),
        chipTheme: ChipThemeData(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          side: BorderSide.none,
        ),
        navigationRailTheme: NavigationRailThemeData(
          backgroundColor: const Color(0xFFF8FAFB),
          indicatorColor: _teal.withValues(alpha: 0.12),
          indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          selectedIconTheme: const IconThemeData(color: _teal, size: 24),
          unselectedIconTheme: IconThemeData(color: Colors.blueGrey.shade400, size: 24),
          selectedLabelTextStyle: GoogleFonts.inter(color: _teal, fontWeight: FontWeight.bold, fontSize: 13),
          unselectedLabelTextStyle: GoogleFonts.inter(color: Colors.blueGrey.shade400, fontWeight: FontWeight.w600, fontSize: 13),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: _teal.withValues(alpha: 0.12),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return GoogleFonts.inter(color: _teal, fontWeight: FontWeight.bold, fontSize: 12);
            }
            return GoogleFonts.inter(color: Colors.blueGrey.shade400, fontWeight: FontWeight.w600, fontSize: 12);
          }),
        ),
      ),

      // ── Dark Theme ───────────────────────────────────────────────────
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        textTheme: _darkTextTheme,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _teal,
          brightness: Brightness.dark,
          primary: _tealLight,
          error: Colors.red.shade600,
          onPrimary: const Color(0xFF00353E),
          secondary: const Color(0xFFFFCC80),
          onSecondary: const Color(0xFF4A3200),
          tertiary: const Color(0xFFFF8A9B),
          onTertiary: const Color(0xFF600020),
          surface: const Color(0xFF15262C),
          onSurface: const Color(0xFFE1E9EC),
          surfaceContainerHighest: const Color(0xFF22383F),
          onSurfaceVariant: const Color(0xFFB0C4CC),
          outline: const Color(0xFF6D8A94),
          tertiaryContainer: _amberLight,
          onTertiaryContainer: _amberDark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0D1B1F),
        appBarTheme: AppBarTheme(
          backgroundColor: const Color(0xFF0D1B1F),
          surfaceTintColor: Colors.transparent,
          scrolledUnderElevation: 0,
          elevation: 0,
          titleTextStyle: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            fontSize: 20,
            color: const Color(0xFFE1E9EC),
          ),
          iconTheme: const IconThemeData(color: Color(0xFFB0C4CC)),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: const Color(0xFF15262C),
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1E333A),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF3A5560)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF3A5560)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _tealLight, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        dividerTheme: const DividerThemeData(
          color: Color(0xFF2A4450),
          thickness: 0.5,
        ),
        listTileTheme: const ListTileThemeData(
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: _teal,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            elevation: 0,
          ),
        ),
        chipTheme: ChipThemeData(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          side: BorderSide.none,
        ),
        navigationRailTheme: NavigationRailThemeData(
          backgroundColor: const Color(0xFF0D1B1F),
          indicatorColor: _tealLight.withValues(alpha: 0.18),
          indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          selectedIconTheme: const IconThemeData(color: _tealLight, size: 24),
          unselectedIconTheme: const IconThemeData(color: Color(0xFFB0C4CC), size: 24),
          selectedLabelTextStyle: GoogleFonts.inter(color: _tealLight, fontWeight: FontWeight.bold, fontSize: 13),
          unselectedLabelTextStyle: GoogleFonts.inter(color: const Color(0xFFB0C4CC), fontWeight: FontWeight.w600, fontSize: 13),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: const Color(0xFF15262C),
          indicatorColor: _tealLight.withValues(alpha: 0.18),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return GoogleFonts.inter(color: _tealLight, fontWeight: FontWeight.bold, fontSize: 12);
            }
            return GoogleFonts.inter(color: const Color(0xFFB0C4CC), fontWeight: FontWeight.w600, fontSize: 12);
          }),
        ),
      ),
      routerConfig: router,
    );
  }
}
