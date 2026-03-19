import React from 'react';
import { ScrollView, StyleSheet, View, RefreshControlProps, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { spacing } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import OfflineBanner from '@/components/ui/OfflineBanner';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  centered?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/**
 * Standard screen wrapper with:
 * - Safe area insets
 * - Optional scroll + pull-to-refresh
 * - Consistent padding
 * - **Responsive max-width + centering** on wide web screens
 * - Global offline banner overlay
 */
export default function ScreenContainer({
  children,
  scrollable = true,
  padded = true,
  centered = false,
  refreshControl,
}: ScreenContainerProps) {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const { isDesktop, contentMaxWidth } = useBreakpoint();

  const inner = (
    <View
      style={[
        styles.inner,
        padded && styles.padded,
        centered && styles.centered,
        { backgroundColor: theme.colors.background },
        // On desktop web: center content and cap its width
        isDesktop && {
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center' as const,
        },
      ]}
    >
      {children}
    </View>
  );

  // On web desktop, skip SafeAreaView edges that conflict with the sidebar layout
  const safeEdges = Platform.OS === 'web'
    ? (['top', 'bottom'] as const)
    : (['left', 'right', 'top', 'bottom'] as const);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={safeEdges}
    >
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            // On desktop, add horizontal padding to the scroll container
            isDesktop && styles.scrollContentDesktop,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}

      {/* Offline banner — floats above all content, only visible when disconnected */}
      <OfflineBanner visible={!isOnline} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  scrollContentDesktop: {
    paddingHorizontal: spacing.lg,
  },
  inner: { flex: 1 },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
