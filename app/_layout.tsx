import { useEffect, useMemo } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SnackbarProvider } from '@/components/ui/SnackbarProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, initialized, profile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    const inChildGroup  = segments[0] === '(child)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (profile && !profile.family_id) {
      if ((segments as string[])[1] !== 'family-setup') {
        router.replace('/(parent)/family-setup');
      }
    } else if (session && profile?.family_id) {
      if (inAuthGroup) {
        // Authenticated parent in the auth group → go to parent dashboard
        router.replace('/(parent)/dashboard');
      } else if (inChildGroup) {
        // On a browser hard-refresh expo-router can resolve /dashboard to the
        // (child) group instead of (parent) because (child) sorts first.
        // If there is no ?id search param the child dashboard will also redirect,
        // but catching it here first avoids any flash of the wrong screen.
        const searchParams = typeof window !== 'undefined'
          ? new URL(window.location.href).searchParams
          : null;
        if (!searchParams?.get('id')) {
          router.replace('/(parent)/dashboard');
        }
      }
    }
  }, [session, initialized, profile, segments]);

  // Show nothing while initializing or if we're about to redirect.
  // Also wait for the profile to finish loading after a session is restored
  // (initialize() sets initialized:true before fetchProfile completes, so
  //  profile can be null for a brief moment on browser refresh).
  if (!initialized) return null;
  if (session && !profile) return null;     // ← profile still loading, wait

  const inAuthGroup = segments[0] === '(auth)';
  if (!session && !inAuthGroup) return null;
  if (session && profile?.family_id && inAuthGroup) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { initialize } = useAuthStore();

  const theme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  useEffect(() => {
    initialize();
  }, []);

  const isDark = theme.dark;

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <SnackbarProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(parent)" />
              <Stack.Screen name="(child)" />
              <Stack.Screen name="index" />
            </Stack>
          </AuthGuard>
        </SnackbarProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
