import { router, usePathname } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useMemo } from 'react';

let pendingIndexRedirectPath: string | null = null;

export default function Index() {
  const { initialized, session, profile, profileStatus } = useAuthStore();
  const pathname = usePathname();

  const redirectTarget = useMemo(() => {
    if (!initialized) return null;
    if (!session) return { href: '/(auth)/welcome' as const, pathname: '/welcome' };
    if (profileStatus === 'loading' || profileStatus === 'idle') return null;
    if (profileStatus === 'missing') return { href: '/(auth)/complete-profile' as const, pathname: '/complete-profile' };
    if (profileStatus === 'error') return { href: '/(auth)/login' as const, pathname: '/login' };
    if (profile && !profile.family_id) return { href: '/(parent)/family-setup' as const, pathname: '/family-setup' };
    return { href: '/(parent)/dashboard' as const, pathname: '/dashboard' };
  }, [initialized, session, profile, profileStatus]);

  useEffect(() => {
    pendingIndexRedirectPath = null;
  }, [pathname]);

  useEffect(() => {
    if (!redirectTarget) return;

    const currentPathname =
      typeof window !== 'undefined' ? window.location.pathname : pathname;

    if (currentPathname === redirectTarget.pathname || pendingIndexRedirectPath === redirectTarget.pathname) {
      return;
    }

    pendingIndexRedirectPath = redirectTarget.pathname;
    router.replace(redirectTarget.href);
  }, [pathname, redirectTarget]);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
