import { sidebarWidth, spacing } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, Tooltip, useTheme } from 'react-native-paper';

interface NavItem {
  label: string;
  /** expo-router push target */
  href: string;
  /** pathname prefix to match for active state */
  match: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/(parent)/dashboard', match: '/dashboard', icon: 'view-dashboard' },
  { label: 'Chores', href: '/(parent)/chores', match: '/chores', icon: 'clipboard-check' },
  { label: 'Task Board', href: '/(parent)/family-tasks-dashboard', match: '/family-tasks-dashboard', icon: 'view-dashboard-variant' },
  { label: 'Payday', href: '/(parent)/payday', match: '/payday', icon: 'cash-multiple' },
  { label: 'Activity', href: '/(parent)/activity', match: '/activity', icon: 'history' },
  { label: 'Settings', href: '/(parent)/settings', match: '/settings', icon: 'cog' },
];

const collapsedSidebarWidth = 76;

/**
 * Left-rail sidebar navigation shown on desktop web.
 * Uses expo-router's `usePathname` for active-state detection
 * and `router.push` for navigation.
 */
export function WebSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/dashboard", "/chores/new"

  return (
    <View
      style={[
        styles.sidebar,
        collapsed && styles.sidebarCollapsed,
        {
          backgroundColor: theme.colors.surface,
          borderRightColor: theme.colors.outline,
        },
      ]}
    >
      {/* Branding */}
      <View style={[styles.brand, collapsed && styles.brandCollapsed]}>
        {!collapsed ? (
          <Text variant="headlineSmall" style={[styles.brandText, { color: theme.colors.primary }]}>
            💰 FamFi
          </Text>
        ) : (
          <Text style={styles.brandIcon}>💰</Text>
        )}
        <Tooltip title={collapsed ? 'Open sidebar' : 'Minimize sidebar'}>
          <IconButton
            icon={collapsed ? 'menu-open' : 'menu'}
            mode="contained-tonal"
            size={18}
            onPress={() => onCollapsedChange(!collapsed)}
            style={styles.toggleButton}
          />
        </Tooltip>
      </View>

      {/* Navigation items */}
      <View style={[styles.nav, collapsed && styles.navCollapsed]}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.match || pathname.startsWith(item.match + '/');
          const navButton = (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.navItem,
                collapsed && styles.navItemCollapsed,
                isActive && { backgroundColor: theme.colors.primaryContainer },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityLabel={item.label}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              {!collapsed && (
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
              )}
            </Pressable>
          );

          return collapsed ? (
            <Tooltip key={item.href} title={item.label}>
              {navButton}
            </Tooltip>
          ) : navButton;
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
  sidebarCollapsed: {
    width: collapsedSidebarWidth,
  },
  brand: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brandCollapsed: {
    paddingHorizontal: spacing.xs,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  brandText: {
    fontWeight: '800',
  },
  brandIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  toggleButton: {
    margin: 0,
  },
  nav: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  navCollapsed: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
  },
  navItemCollapsed: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  navLabel: {
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
});
