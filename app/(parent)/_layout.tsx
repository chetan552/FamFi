import { WebSidebar } from "@/components/ui/WebSidebar";
import { breakpoints } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ParentLayout() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Sidebar/desktop mode on web only
  const isDesktop = Platform.OS === "web" && width >= breakpoints.md;

  return (
    // Always a single row wrapper — on mobile the sidebar is absent so Tabs
    // fills 100 % of the width. This avoids remounting the navigator when
    // the breakpoint changes, which was causing the tab bar to break.
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Sidebar — only rendered on desktop web */}
      {isDesktop && <WebSidebar />}

      {/* Single Tabs navigator — always mounted regardless of breakpoint */}
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.onSurfaceVariant,

            // Hide tab bar on desktop (sidebar takes over)
            // Show styled tab bar on mobile/narrow web
            tabBarStyle: isDesktop
              ? { display: "none" }
              : {
                  backgroundColor: theme.colors.surface,
                  borderTopColor: theme.colors.outlineVariant,
                  borderTopWidth: 1,
                  height: 60 + insets.bottom,
                  paddingBottom: Math.max(8, insets.bottom),
                  paddingTop: 6,
                },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "500",
            },
          }}
        >
          {/* ── Visible tabs ──────────────────────────────────────── */}
          <Tabs.Screen
            name="dashboard"
            options={{
              title: "Overview",
              tabBarLabel: "Home",
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="view-dashboard"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="chores/index"
            options={{
              title: "Chores",
              tabBarLabel: "Chores",
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="clipboard-check"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="payday"
            options={{
              title: "Payday",
              tabBarLabel: "Payday",
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              title: "Activity",
              tabBarLabel: "Activity",
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="history"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarLabel: "Settings",
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="cog" size={size} color={color} />
              ),
            }}
          />

          {/* ── Hidden (routing only, not in the tab bar) ─────────── */}
          <Tabs.Screen name="family-setup" options={{ href: null }} />
          <Tabs.Screen name="add-children" options={{ href: null }} />
          <Tabs.Screen name="bucket-templates" options={{ href: null }} />
          <Tabs.Screen name="deposit-gift" options={{ href: null }} />
          <Tabs.Screen name="chores/new" options={{ href: null }} />
          <Tabs.Screen name="chores/edit/[id]" options={{ href: null }} />
          <Tabs.Screen name="child/[id]" options={{ href: null }} />
          <Tabs.Screen name="interest-settings" options={{ href: null }} />
          <Tabs.Screen name="google-tasks" options={{ href: null }} />
          <Tabs.Screen name="withdraw" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
});
