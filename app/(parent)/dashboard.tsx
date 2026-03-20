import ScreenContainer from "@/components/ui/ScreenContainer";
import { ChildCardSkeleton } from "@/components/ui/Skeleton";
import { spacing } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useAuthStore } from "@/store/authStore";
import { useFamilyStore } from "@/store/familyStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

export default function DashboardScreen() {
  const theme = useTheme();
  const { isDesktop, gridColumns } = useBreakpoint();
  const { profile } = useAuthStore();
  const {
    family,
    children,
    members,
    bucketTemplates,
    chores,
    allFamilyBuckets,
    loading,
    fetchFamily,
    fetchAllFamilyBuckets,
  } = useFamilyStore();

  const [initialLoading, setInitialLoading] = useState(true);

  const loadAll = useCallback(async () => {
    await fetchFamily();
    await fetchAllFamilyBuckets();
    setInitialLoading(false);
  }, [fetchFamily, fetchAllFamilyBuckets]);

  // Depend on profile.family_id instead of [] so that on browser refresh —
  // where initialize() sets initialized:true before fetchProfile() completes —
  // we still trigger a full load once the profile (and family_id) is available.
  useEffect(() => {
    if (profile?.family_id) {
      loadAll();
    }
  }, [profile?.family_id, loadAll]);

  // After children load, fetch all buckets
  useEffect(() => {
    if (children.length > 0) {
      fetchAllFamilyBuckets();
    }
  }, [children.length, fetchAllFamilyBuckets]);

  const getChildBalance = (childId: string) => {
    return allFamilyBuckets
      .filter((b) => b.child_id === childId)
      .reduce((sum, b) => sum + (b.cached_balance || 0), 0);
  };

  const familyTotal = children.reduce(
    (sum, c) => sum + getChildBalance(c.id),
    0,
  );
  const activeChores = chores.filter((c) => c.status !== "paid").length;
  const pendingReview = chores.filter((c) => c.status === "done").length;

  return (
    <ScreenContainer
      scrollable
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadAll} />
      }
    >
      {/* Header */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text
            variant="headlineSmall"
            style={{ fontWeight: "700", color: theme.colors.primary }}
          >
            🏦 FamFi
          </Text>
          {family && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {family.name} Family Bank
            </Text>
          )}
        </View>
      </View>

      {/* Welcome */}
      <View style={styles.welcome}>
        <Text variant="headlineMedium" style={{ fontWeight: "700" }}>
          Hi, {profile?.name}! 👋
        </Text>
      </View>

      {/* Family Total Savings Hero Card */}
      <Card
        style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}
        mode="contained"
      >
        <Card.Content style={styles.heroContent}>
          <Text
            variant="labelLarge"
            style={{
              color: theme.colors.onPrimary,
              opacity: 0.8,
              letterSpacing: 1,
            }}
          >
            FAMILY TOTAL SAVINGS
          </Text>
          <Text
            variant="displaySmall"
            style={{
              color: theme.colors.onPrimary,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            ${familyTotal.toFixed(2)}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text
                variant="headlineSmall"
                style={{ color: theme.colors.onPrimary, fontWeight: "800" }}
              >
                {children.length}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onPrimary, opacity: 0.8 }}
              >
                Children
              </Text>
            </View>
            <View
              style={[
                styles.heroStatDivider,
                { backgroundColor: theme.colors.onPrimary + "40" },
              ]}
            />
            <View style={styles.heroStat}>
              <Text
                variant="headlineSmall"
                style={{ color: theme.colors.onPrimary, fontWeight: "800" }}
              >
                {activeChores}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onPrimary, opacity: 0.8 }}
              >
                Active Chores
              </Text>
            </View>
            <View
              style={[
                styles.heroStatDivider,
                { backgroundColor: theme.colors.onPrimary + "40" },
              ]}
            />
            <View style={styles.heroStat}>
              <Text
                variant="headlineSmall"
                style={{
                  color: pendingReview > 0 ? "#FFE082" : theme.colors.onPrimary,
                  fontWeight: "800",
                }}
              >
                {pendingReview}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onPrimary, opacity: 0.8 }}
              >
                Needs Review
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Children List with Balances */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ fontWeight: "700" }}>
            Children
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => router.push("/(parent)/add-children")}
          >
            Manage
          </Button>
        </View>

        {initialLoading ? (
          <>
            <ChildCardSkeleton />
            <ChildCardSkeleton />
            <ChildCardSkeleton />
          </>
        ) : children.length === 0 ? (
          <Surface style={styles.emptyState} elevation={0}>
            <MaterialCommunityIcons
              name="account-child"
              size={64}
              color={theme.colors.outline}
            />
            <Text
              variant="titleMedium"
              style={{ fontWeight: "700", marginTop: spacing.md }}
            >
              No children yet
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: spacing.xs,
                paddingHorizontal: spacing.md,
              }}
            >
              Add your children so they can earn and save money through chores!
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push("/(parent)/add-children")}
              icon="account-plus"
              style={{ marginTop: spacing.lg }}
            >
              Add First Child
            </Button>
          </Surface>
        ) : (
          <FlatList
            numColumns={isDesktop ? 2 : 1}
            key={isDesktop ? 'desktop' : 'mobile'}
            columnWrapperStyle={isDesktop ? { gap: spacing.sm } : undefined}
            data={children}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingVertical: spacing.xs, gap: isDesktop ? spacing.sm : 0 }}
            renderItem={({ item }) => {
              const balance = getChildBalance(item.id);
              return (
                <Card
                  style={[styles.childCard, isDesktop && { flex: 1, marginHorizontal: 0 }]}
                  mode="elevated"
                  elevation={2}
                  onPress={() => router.push(`/(parent)/child/${item.id}`)}
                >
                  <Card.Content style={styles.childCardContent}>
                    <Text style={styles.childEmoji}>{item.avatar_emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: "600" }}>
                        {item.name}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {
                          chores.filter(
                            (c) =>
                              c.assigned_to_child_id === item.id &&
                              c.status === "assigned",
                          ).length
                        }{" "}
                        active chores
                      </Text>
                    </View>
                    <View style={styles.balanceBadge}>
                      <Text
                        variant="titleMedium"
                        style={{
                          fontWeight: "800",
                          color: theme.colors.primary,
                        }}
                      >
                        ${balance.toFixed(2)}
                      </Text>
                    </View>
                    <IconButton
                      icon="account-switch"
                      iconColor={theme.colors.secondary}
                      size={20}
                      onPress={() =>
                        router.replace(`/(child)/dashboard?id=${item.id}`)
                      }
                    />
                    <IconButton icon="chevron-right" size={20} />
                  </Card.Content>
                </Card>
              );
            }}
            ItemSeparatorComponent={() => (
              <View style={{ height: spacing.sm }} />
            )}
          />
        )}
      </View>

      {/* Family Members */}
      {members.length > 0 && (
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: "700", marginBottom: spacing.sm }}
          >
            Parents
          </Text>
          <Card mode="outlined" style={styles.membersCard}>
            <Card.Content>
              {members.map((member, index) => (
                <React.Fragment key={member.id}>
                  <View style={styles.memberItem}>
                    <Text style={styles.memberEmoji}>
                      {member.avatar_emoji}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: "600" }}>
                        {member.name} {member.id === profile?.id ? "(You)" : ""}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Parent
                      </Text>
                    </View>
                  </View>
                  {index < members.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Bucket Templates */}
      {bucketTemplates.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Savings Buckets
            </Text>
            <Button
              mode="text"
              compact
              onPress={() => router.push("/(parent)/bucket-templates")}
            >
              Edit
            </Button>
          </View>
          <View style={styles.bucketList}>
            {bucketTemplates.map((bt) => (
              <Card key={bt.id} style={styles.bucketChip}>
                <Card.Content style={styles.bucketChipContent}>
                  <View
                    style={[styles.bucketDot, { backgroundColor: bt.color }]}
                  />
                  <Text style={{ marginRight: 4 }}>{bt.emoji}</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: "500" }}>
                    {bt.name}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text
          variant="titleMedium"
          style={{ fontWeight: "700", marginBottom: spacing.md }}
        >
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          <Card
            style={styles.actionCard}
            mode="elevated"
            onPress={() => router.push("/(parent)/chores")}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons
                name="broom"
                size={28}
                color={theme.colors.primary}
              />
              <Text
                variant="labelLarge"
                style={{ marginTop: spacing.xs, fontWeight: "700" }}
              >
                Chores
              </Text>
              {pendingReview > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.secondary },
                  ]}
                >
                  <Text style={styles.badgeText}>{pendingReview}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
          <Card
            style={styles.actionCard}
            mode="elevated"
            onPress={() => router.push("/(parent)/payday")}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={28}
                color={theme.colors.tertiary}
              />
              <Text
                variant="labelLarge"
                style={{ marginTop: spacing.xs, fontWeight: "700" }}
              >
                Payday
              </Text>
            </Card.Content>
          </Card>
          <Card
            style={styles.actionCard}
            mode="elevated"
            onPress={() => router.push("/(parent)/deposit-gift")}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons
                name="gift"
                size={28}
                color={theme.colors.secondary}
              />
              <Text
                variant="labelLarge"
                style={{ marginTop: spacing.xs, fontWeight: "700" }}
              >
                Gift
              </Text>
            </Card.Content>
          </Card>
          <Card
            style={styles.actionCard}
            mode="elevated"
            onPress={() => router.push("/(parent)/withdraw")}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons
                name="bank-transfer-out"
                size={28}
                color={theme.colors.error}
              />
              <Text
                variant="labelLarge"
                style={{ marginTop: spacing.xs, fontWeight: "700" }}
              >
                Withdraw
              </Text>
            </Card.Content>
          </Card>
          <Card
            style={styles.actionCard}
            mode="elevated"
            onPress={() => router.push("/(parent)/interest-settings")}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons
                name="percent"
                size={28}
                color="#7C4DFF"
              />
              <Text
                variant="labelLarge"
                style={{ marginTop: spacing.xs, fontWeight: "700" }}
              >
                Interest
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  welcome: { marginBottom: spacing.lg },
  heroCard: { borderRadius: 20, marginBottom: spacing.xl, overflow: "hidden" },
  heroContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  heroStats: {
    flexDirection: "row",
    marginTop: spacing.lg,
    alignItems: "center",
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatDivider: { width: 1, height: 40 },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    backgroundColor: "transparent",
  },
  childCard: {
    borderRadius: 14,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  childCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  childEmoji: { fontSize: 32, marginRight: spacing.sm },
  balanceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#2B9EB320",
    borderRadius: 8,
  },
  membersCard: { borderRadius: 12 },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  memberEmoji: { fontSize: 24, marginRight: spacing.md },
  bucketList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bucketChip: {},
  bucketChipContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  bucketDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionCard: { width: 100, flexGrow: 1, borderRadius: 16 },
  actionContent: {
    alignItems: "center",
    paddingVertical: spacing.md,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
