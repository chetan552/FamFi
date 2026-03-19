import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sidebarWidth, spacing } from '@/constants/theme';

interface NavItem {
  label: string;
  /** expo-router push target */
  href: string;
  /** pathname prefix to match for active state */
  match: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',     href: '/(parent)/dashboard', match: '/dashboard', icon: 'view-dashboard'  },
  { label: 'Chores',   href: '/(parent)/chores',    match: '/chores',    icon: 'clipboard-check' },
  { label: 'Payday',   href: '/(parent)/payday',     match: '/payday',    icon: 'cash-multiple'   },
  { label: 'Activity', href: '/(parent)/activity',   match: '/activity',  icon: 'history'         },
  { label: 'Settings', href: '/(parent)/settings',   match: '/settings',  icon: 'cog'             },
];

/**
 * Left-rail sidebar navigation shown on desktop web.
 * Uses expo-router's `usePathname` for active-state detection
 * and `router.push` for navigation.
 */
export function WebSidebar() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/dashboard", "/chores/new"

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: theme.colors.surface,
          borderRightColor: theme.colors.outline,
        },
      ]}
    >
      {/* Branding */}
      <View style={styles.brand}>
        <Text variant="headlineSmall" style={[styles.brandText, { color: theme.colors.primary }]}>
          💰 Fam-Fi
        </Text>
      </View>

      {/* Navigation items */}
      <View style={styles.nav}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.match || pathname.startsWith(item.match + '/');
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.navItem,
                isActive && { backgroundColor: theme.colors.primaryContainer },
                pressed && { opacity: 0.75 },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text
                variant="labelLarge"
                style={[
                  styles.navLabel,
                  { color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: sidebarWidth,
    borderRightWidth: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brand: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  brandText: {
    fontWeight: '800',
  },
  nav: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
  },
  navLabel: {
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
});
