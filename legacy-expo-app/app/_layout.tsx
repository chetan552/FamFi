import { useEffect, useMemo } from 'react';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SnackbarProvider } from '@/components/ui/SnackbarProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover, 
    input:-webkit-autofill:focus, 
    input:-webkit-autofill:active {
      -webkit-background-clip: text;
      -webkit-text-fill-color: inherit;
      transition: background-color 5000s ease-in-out 0s;
      box-shadow: inset 0 0 20px 20px transparent;
    }
  `;
  document.head.appendChild(style);
}

import { usePushNotifications } from '@/hooks/usePushNotifications';

let pendingAuthRedirectPath: string | null = null;
const rootStackScreenOptions = { headerShown: false };

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, initialized, profile, profileStatus } = useAuthStore();
  const { expoPushToken } = usePushNotifications();
  const segments = useSegments();
  const segmentKey = (segments as string[]).join('/');
  const pathname = usePathname();

  useEffect(() => {
    pendingAuthRedirectPath = null;
  }, [pathname]);

  // Sync push token whenever authenticated state or token loads
  useEffect(() => {
    if (initialized && profile && expoPushToken && (profile as any).expo_push_token !== expoPushToken) {
      useAuthStore.getState().savePushToken(expoPushToken);
    }
  }, [initialized, profile, expoPushToken]);

  useEffect(() => {
    if (!initialized) return;

    const replaceIfNeeded = (
      href: Parameters<typeof router.replace>[0],
      targetPathname: string,
    ) => {
      const currentPathname =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.pathname
          : pathname;

      if (currentPathname === targetPathname || pendingAuthRedirectPath === targetPathname) {
        return;
      }

      pendingAuthRedirectPath = targetPathname;
      router.replace(href);
    };

    const inAuthGroup = segments[0] === '(auth)';
    const authRoute = (segments as string[])[1];
    const publicAuthRoutes = new Set(['welcome', 'login', 'signup', 'child-login', 'forgot-password']);
    const isPublicAuthRoute = inAuthGroup && publicAuthRoutes.has(authRoute);

    const inChildGroup  = segments[0] === '(child)';

    if (!session) {
      if (inAuthGroup && !isPublicAuthRoute) {
        replaceIfNeeded('/(auth)/welcome', '/welcome');
      } else if (!inAuthGroup && segments.length > 0) {
        replaceIfNeeded('/', '/');
      }
    } else if (profileStatus === 'loading' || profileStatus === 'idle') {
      return;
    } else if (profileStatus === 'missing') {
      if (authRoute !== 'complete-profile') {
        replaceIfNeeded('/(auth)/complete-profile', '/complete-profile');
      }
    } else if (profileStatus === 'error') {
      if (!inAuthGroup || authRoute === 'complete-profile') {
        replaceIfNeeded('/(auth)/login', '/login');
      }
    } else if (!profile) {
      return;
    } else if (profile && !profile.family_id) {
      if ((segments as string[])[1] !== 'family-setup') {
        replaceIfNeeded('/(parent)/family-setup', '/family-setup');
      }
    } else if (session && profile?.family_id) {
      if (inAuthGroup) {
        // Authenticated user in the auth group → go to their respective dashboard
        if (profile.role === 'child') {
          replaceIfNeeded({ pathname: '/(child)/child-dashboard', params: { id: profile.id } }, '/child-dashboard');
        } else {
          replaceIfNeeded('/(parent)/dashboard', '/dashboard');
        }
      } else if (profile.role === 'child' && !inChildGroup) {
        // Securely lock children into the (child) route group
        replaceIfNeeded({ pathname: '/(child)/child-dashboard', params: { id: profile.id } }, '/child-dashboard');
      } else if (inChildGroup && profile.role === 'parent') {
        // Parents can preview a child dashboard with an explicit child id.
        // Otherwise keep them in the parent route group.
        const searchParams = typeof window !== 'undefined'
          ? new URL(window.location.href).searchParams
          : null;
        if (!searchParams?.get('id')) {
          replaceIfNeeded('/(parent)/dashboard', '/dashboard');
        }
      }
    }
  }, [session, initialized, profile, profileStatus, segmentKey, pathname]);

  // Show nothing while initializing or while a guarded redirect is about to run.
  if (!initialized) return null;

  const inAuthGroup = segments[0] === '(auth)';
  // Cast segments to string[] to resolve Expo router type inferences
  const isRoot = (segments as string[]).length === 0;
  const isCompleteProfile = inAuthGroup && (segments as string[])[1] === 'complete-profile';
  const publicAuthRoutes = new Set(['welcome', 'login', 'signup', 'child-login', 'forgot-password']);
  const isPublicAuthRoute = inAuthGroup && publicAuthRoutes.has((segments as string[])[1]);
  
  // If unauthenticated, only public auth screens are renderable.
  // The root path (index.tsx) must be allowed to render so it can redirect users!
  if (!session && !isRoot && (!inAuthGroup || !isPublicAuthRoute)) return null;
  if (session && (profileStatus === 'loading' || profileStatus === 'idle')) return null;
  if (session && profileStatus === 'missing' && !isCompleteProfile) return null;
  if (session && profileStatus === 'error' && (!inAuthGroup || isCompleteProfile)) return null;
  if (session && profileStatus === 'ready' && !profile) return null;
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

    // Fix Chrome autofill background/text color issues on Web Dark Mode
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px transparent inset !important;
          -webkit-text-fill-color: inherit !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const isDark = theme.dark;

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <SnackbarProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AuthGuard>
            <Stack screenOptions={rootStackScreenOptions}>
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
