import { useSnackbar } from "@/components/ui/SnackbarProvider";
import { spacing } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useFamilyStore } from "@/store/familyStore";
import type { Chore, BucketTemplate, User } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  ProgressBar,
  Surface,
  Text,
  Tooltip,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type ChoreUrgency = {
  isOverdue: boolean;
  isDueToday: boolean;
};

function getChoreUrgency(dueDate: string | null): ChoreUrgency {
  if (!dueDate) return { isOverdue: false, isDueToday: false };

  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    isOverdue: due < today,
    isDueToday: due.getTime() === today.getTime(),
  };
}

function getUrgencyRank(chore: Chore) {
  const urgency = getChoreUrgency(chore.due_date);
  if (urgency.isOverdue) return 0;
  if (urgency.isDueToday) return 1;
  return 2;
}

function formatTime(date: Date, includeSeconds: boolean) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  if (includeSeconds) options.second = "2-digit";
  return date.toLocaleTimeString(undefined, options);
}

function formatSyncTime(date: Date | null) {
  if (!date) return "Not synced yet";
  return `Synced ${date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatFamilyTitle(name?: string) {
  if (!name) return "The Family Dashboard";
  return name.toLowerCase().startsWith("the ")
    ? `${name} Family Dashboard`
    : `The ${name} Family Dashboard`;
}

async function setBrowserFullscreen(nextFullscreen: boolean) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  if (nextFullscreen && !document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.();
  } else if (!nextFullscreen && document.fullscreenElement) {
    await document.exitFullscreen?.();
  }
}

export default function FamilyTasksDashboardScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { width, isDesktop, isWide } = useBreakpoint();
  const {
    family,
    children,
    chores,
    bucketTemplates,
    allFamilyBuckets,
    bucketBalances,
    childBalances,
    googleConnected,
    loading,
    fetchFamily,
    fetchAllFamilyBuckets,
    updateChoreStatus,
    syncGoogleTasks,
  } = useFamilyStore();

  const [busyChores, setBusyChores] = useState<Record<string, boolean>>({});
  const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({});
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const crossAxisCount = width >= 1400 ? 3 : isDesktop || isWide ? 2 : 1;
  const isCompact = width < 980;

  const loadFamily = useCallback(async () => {
    await fetchFamily();
    await fetchAllFamilyBuckets();
    setLastUpdated(new Date());
  }, [fetchFamily, fetchAllFamilyBuckets]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(() => {
      loadFamily();
    }, 30000);

    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [loadFamily]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const activeChores = useMemo(
    () => chores.filter((chore) => chore.status === "assigned"),
    [chores],
  );

  const pendingReview = chores.filter((chore) => chore.status === "done").length;
  const totalSavings =
    Object.keys(childBalances).length > 0
      ? children.reduce((sum, child) => sum + (childBalances[child.id] ?? 0), 0)
      : allFamilyBuckets.reduce((sum, bucket) => sum + (bucket.cached_balance || 0), 0);

  const getChildBalance = (childId: string) =>
    childBalances[childId] ??
    allFamilyBuckets
      .filter((bucket) => bucket.child_id === childId)
      .reduce((sum, bucket) => sum + (bucket.cached_balance || 0), 0);

  const getBucketBalance = (childId: string, templateId: string) =>
    bucketBalances[`${childId}:${templateId}`] ??
    allFamilyBuckets
      .filter((bucket) => bucket.child_id === childId && bucket.template_id === templateId)
      .reduce((sum, bucket) => sum + (bucket.cached_balance || 0), 0);

  const handleRefresh = async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);

    try {
      await loadFamily();
      if (googleConnected) {
        const result = await syncGoogleTasks();
        if (result.errors.length > 0) {
          const message = result.errors[0].includes("google_auth_expired")
            ? "Google authorization expired. Reconnect in Settings."
            : result.errors[0];
          showError(message);
        } else {
          showSuccess(result.synced > 0 ? `Synced ${result.synced} task${result.synced === 1 ? "" : "s"} from Google` : "Synced with Google Tasks");
        }
      }
      setLastUpdated(new Date());
    } catch (error: any) {
      showError(error?.message ?? "Refresh failed.");
    } finally {
      setManualRefreshing(false);
    }
  };

  const handleToggleFullscreen = async () => {
    const nextFullscreen = !isFullscreen;
    try {
      await setBrowserFullscreen(nextFullscreen);
      setIsFullscreen(nextFullscreen);
    } catch {
      showError("Fullscreen is not available in this browser.");
    }
  };

  const handleExit = () => {
    Alert.alert(
      "Exit Dashboard?",
      "Are you sure you want to exit the family dashboard?",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => router.replace("/(parent)/dashboard"),
        },
      ],
    );
  };

  const handleMarkDone = async (choreId: string) => {
    setBusyChores((current) => ({ ...current, [choreId]: true }));
    const result = await updateChoreStatus(choreId, "done");

    if (result.error) {
      showError(result.error);
    } else {
      setLastUpdated(new Date());
      showSuccess("Chore marked done!");
    }

    setBusyChores((current) => {
      const next = { ...current };
      delete next[choreId];
      return next;
    });
  };

  const toggleChild = (childId: string) => {
    setExpandedChildren((current) => ({
      ...current,
      [childId]: !(current[childId] ?? true),
    }));
  };

  const renderChild = ({ item }: { item: User }) => {
    const isExpanded = expandedChildren[item.id] ?? true;
    const assignedChores = activeChores
      .filter((chore) => chore.assigned_to_child_id === item.id)
      .sort((a, b) => {
        const urgency = getUrgencyRank(a) - getUrgencyRank(b);
        if (urgency !== 0) return urgency;
        if (!a.due_date && !b.due_date) return a.created_at.localeCompare(b.created_at);
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    const doneCount = chores.filter(
      (chore) => chore.assigned_to_child_id === item.id && chore.status === "done",
    ).length;
    const totalCount = assignedChores.length + doneCount;
    const progress = totalCount === 0 ? 0 : doneCount / totalCount;

    return (
      <ChildTaskCard
        child={item}
        balance={getChildBalance(item.id)}
        chores={assignedChores}
        bucketTemplates={bucketTemplates}
        getBucketBalance={getBucketBalance}
        completedChores={doneCount}
        totalChores={totalCount}
        isExpanded={isExpanded}
        isWide={crossAxisCount > 1}
        isCompact={isCompact}
        progress={progress}
        onToggleExpand={() => toggleChild(item.id)}
        onMarkChoreDone={handleMarkDone}
        busyChores={busyChores}
      />
    );
  };

  if (loading && children.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: "Family Task Board", headerShown: false }} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading family dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Family Task Board", headerShown: false }} />

      <Surface
        elevation={3}
        style={[
          styles.kioskHeader,
          isCompact && styles.kioskHeaderCompact,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <View style={[styles.brandCluster, isCompact && styles.brandClusterCompact]}>
          <Text style={styles.bankEmoji}>🏦</Text>
          <View style={styles.headerCopy}>
            <Text
              variant={isCompact ? "titleMedium" : "titleLarge"}
              numberOfLines={1}
              style={styles.headerTitle}
            >
              {formatFamilyTitle(family?.name)}
            </Text>
            <Text variant={isCompact ? "bodyMedium" : "titleMedium"} style={styles.headerTotal}>
              Family Total: ${totalSavings.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={[styles.headerTools, isCompact && styles.headerToolsCompact]}>
          <View style={styles.clockCluster}>
            <Text style={[styles.clockText, isCompact && styles.clockTextCompact]}>
              {formatTime(now, !isCompact)}
            </Text>
            <Text style={styles.syncText}>{formatSyncTime(lastUpdated)}</Text>
          </View>

          {pendingReview > 0 && (
            <View style={styles.reviewBadge}>
              <MaterialCommunityIcons name="bell" size={15} color="#FFFFFF" />
              <Text style={styles.reviewBadgeText}>{pendingReview}</Text>
            </View>
          )}

          <Tooltip title="Refresh">
            <IconButton
              icon={manualRefreshing ? "loading" : "refresh"}
              iconColor="#FFFFFF"
              disabled={manualRefreshing}
              onPress={handleRefresh}
            />
          </Tooltip>

          {Platform.OS === "web" && (
            <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              <IconButton
                icon={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                iconColor="#FFFFFF"
                onPress={handleToggleFullscreen}
              />
            </Tooltip>
          )}

          <Tooltip title="Exit">
            <IconButton icon="exit-to-app" iconColor="#FFFFFF" onPress={handleExit} />
          </Tooltip>
        </View>
      </Surface>

      {children.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-child" size={80} color={theme.colors.outline} />
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No children yet
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Add children in the parent dashboard
          </Text>
          <Button mode="contained" icon="account-plus" onPress={() => router.push("/(parent)/add-children")}>
            Add Child
          </Button>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(child) => child.id}
          renderItem={renderChild}
          numColumns={crossAxisCount}
          key={`columns-${crossAxisCount}`}
          columnWrapperStyle={crossAxisCount > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.gridContent}
          refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ChildTaskCard({
  child,
  balance,
  chores,
  bucketTemplates,
  getBucketBalance,
  completedChores,
  totalChores,
  isExpanded,
  isWide,
  isCompact,
  progress,
  onToggleExpand,
  onMarkChoreDone,
  busyChores,
}: {
  child: User;
  balance: number;
  chores: Chore[];
  bucketTemplates: BucketTemplate[];
  getBucketBalance: (childId: string, templateId: string) => number;
  completedChores: number;
  totalChores: number;
  isExpanded: boolean;
  isWide: boolean;
  isCompact: boolean;
  progress: number;
  onToggleExpand: () => void;
  onMarkChoreDone: (choreId: string) => void;
  busyChores: Record<string, boolean>;
}) {
  const theme = useTheme();
  const progressLabel = totalChores === 0 ? "No chores" : `${completedChores}/${totalChores} done`;

  return (
    <Card mode="elevated" style={[styles.childCard, isWide && styles.childCardWide]}>
      <Card.Content style={styles.childContent}>
        <View style={[styles.childHeader, isCompact && styles.childHeaderCompact]}>
          <View style={[styles.childAvatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={styles.childEmoji}>{child.avatar_emoji}</Text>
          </View>

          <View style={styles.childNameBlock}>
            <Text variant="titleLarge" numberOfLines={1} style={styles.childName}>
              {child.name}
            </Text>
          </View>

          <View style={[styles.balanceBadge, isCompact && styles.balanceBadgeCompact, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.balanceText}>${balance.toFixed(2)}</Text>
          </View>

          <Tooltip title={isExpanded ? "Collapse" : "Expand"}>
            <IconButton
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              onPress={onToggleExpand}
              style={styles.expandButton}
            />
          </Tooltip>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text variant="labelMedium" style={[styles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>
              Chore Progress
            </Text>
            <View style={[styles.progressPill, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text
                variant="labelMedium"
                numberOfLines={1}
                style={[styles.progressPillText, { color: theme.colors.onSurfaceVariant }]}
              >
                {progressLabel}
              </Text>
            </View>
          </View>
          <ProgressBar progress={progress} color="#4CAF50" style={styles.progressBar} />
        </View>

        {!isExpanded && bucketTemplates.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collapsedBuckets}
          >
            {bucketTemplates.map((template) => (
              <BucketPill
                key={template.id}
                template={template}
                balance={getBucketBalance(child.id, template.id)}
                compact
              />
            ))}
          </ScrollView>
        )}

        {isExpanded && (
          <View style={styles.expandedContent}>
            {chores.length === 0 ? (
              <Surface elevation={0} style={styles.noChoresBox}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No active chores! 🎉
                </Text>
              </Surface>
            ) : (
              <View style={styles.choreList}>
                {chores.map((chore) => (
                  <ChoreRow
                    key={chore.id}
                    chore={chore}
                    compact={isCompact}
                    isBusy={busyChores[chore.id] ?? false}
                    onMarkDone={() => onMarkChoreDone(chore.id)}
                  />
                ))}
              </View>
            )}

            {bucketTemplates.length > 0 && (
              <View style={styles.bucketSection}>
                <Text variant="titleMedium" style={styles.bucketTitle}>
                  Savings Buckets
                </Text>
                <View style={styles.bucketWrap}>
                  {bucketTemplates.map((template) => (
                    <BucketPill
                      key={template.id}
                      template={template}
                      balance={getBucketBalance(child.id, template.id)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function ChoreRow({
  chore,
  compact,
  isBusy,
  onMarkDone,
}: {
  chore: Chore;
  compact: boolean;
  isBusy: boolean;
  onMarkDone: () => void;
}) {
  const theme = useTheme();
  const urgency = getChoreUrgency(chore.due_date);
  const statusColor = urgency.isOverdue ? theme.colors.error : urgency.isDueToday ? "#F57C00" : theme.colors.onSurfaceVariant;

  return (
    <Surface
      elevation={0}
      style={[
        styles.choreRow,
        compact && styles.choreRowCompact,
        { borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.choreInfo}>
        <Text variant="titleSmall" style={styles.choreTitle}>
          {chore.title}
        </Text>

        <View style={styles.metaLine}>
          {chore.is_recurring && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="repeat" size={13} color="#7C4DFF" />
              <Text style={[styles.metaText, { color: "#7C4DFF" }]}>
                {chore.recurrence_period ?? "recurring"}
              </Text>
            </View>
          )}

          {chore.due_date && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={13} color={statusColor} />
              <Text style={[styles.metaText, { color: statusColor }]}>
                {chore.due_date}
              </Text>
            </View>
          )}
        </View>

        {(urgency.isOverdue || urgency.isDueToday) && (
          <View
            style={[
              styles.urgencyBadge,
              {
                borderColor: urgency.isOverdue ? theme.colors.error : "#F57C00",
                backgroundColor: urgency.isOverdue ? theme.colors.errorContainer : "#FFF3E0",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={urgency.isOverdue ? "alert" : "timer-outline"}
              size={12}
              color={statusColor}
            />
            <Text style={[styles.urgencyText, { color: statusColor }]}>
              {urgency.isOverdue ? "Overdue" : "Due today"}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.rewardBadge, compact && styles.rewardBadgeCompact, { backgroundColor: `${theme.colors.primary}18` }]}>
        <Text style={[styles.rewardText, { color: theme.colors.primary }]}>
          ${chore.value.toFixed(2)}
        </Text>
      </View>

      <Button
        mode="contained"
        icon="check-bold"
        loading={isBusy}
        disabled={isBusy}
        onPress={onMarkDone}
        buttonColor="#4CAF50"
        textColor="#FFFFFF"
        style={[styles.doneButton, compact && styles.doneButtonCompact]}
        contentStyle={styles.doneButtonContent}
        labelStyle={styles.doneButtonLabel}
      >
        Done
      </Button>
    </Surface>
  );
}

function BucketPill({
  template,
  balance,
  compact = false,
}: {
  template: BucketTemplate;
  balance: number;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.bucketPill,
        compact && styles.bucketPillCompact,
        {
          backgroundColor: `${template.color}18`,
          borderColor: `${template.color}55`,
        },
      ]}
    >
      <Text>{template.emoji}</Text>
      <Text
        style={[
          styles.bucketPillText,
          compact && styles.bucketPillTextCompact,
          { color: template.color },
        ]}
      >
        {compact ? `$${balance.toFixed(0)}` : `${template.name} $${balance.toFixed(2)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  kioskHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  kioskHeaderCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brandCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandClusterCompact: {
    flexBasis: "100%",
  },
  bankEmoji: {
    fontSize: 36,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  headerTotal: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
  },
  headerTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerToolsCompact: {
    flex: 1,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    width: "100%",
  },
  clockCluster: {
    alignItems: "flex-end",
    marginRight: spacing.xs,
  },
  clockText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  clockTextCompact: {
    fontSize: 18,
  },
  syncText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
  },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5A623",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reviewBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  gridContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  childCard: {
    flex: 1,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  childCardWide: {
    minHeight: 440,
  },
  childContent: {
    gap: spacing.md,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  childHeaderCompact: {
    flexWrap: "wrap",
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  childEmoji: {
    fontSize: 28,
  },
  childNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  childName: {
    fontWeight: "800",
  },
  balanceBadge: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  balanceBadgeCompact: {
    paddingHorizontal: spacing.sm,
  },
  balanceText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 20,
  },
  expandButton: {
    margin: 0,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressLabel: {
    flex: 1,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 999,
  },
  progressPill: {
    maxWidth: 120,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    alignItems: "center",
    flexShrink: 0,
  },
  progressPillText: {
    fontWeight: "800",
    textAlign: "center",
  },
  collapsedBuckets: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  expandedContent: {
    flex: 1,
    gap: spacing.md,
  },
  noChoresBox: {
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.12)",
  },
  choreList: {
    gap: spacing.sm,
  },
  choreRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "transparent",
  },
  choreRowCompact: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: spacing.sm,
  },
  choreInfo: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  choreTitle: {
    fontWeight: "800",
  },
  metaLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  urgencyBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rewardBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rewardBadgeCompact: {
    alignSelf: "flex-start",
  },
  rewardText: {
    fontSize: 16,
    fontWeight: "900",
  },
  doneButton: {
    borderRadius: 12,
    minWidth: 112,
  },
  doneButtonCompact: {
    alignSelf: "stretch",
  },
  doneButtonContent: {
    height: 52,
    paddingHorizontal: spacing.sm,
  },
  doneButtonLabel: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  bucketSection: {
    gap: spacing.sm,
  },
  bucketTitle: {
    fontWeight: "800",
  },
  bucketWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bucketPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bucketPillCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bucketPillText: {
    fontWeight: "800",
  },
  bucketPillTextCompact: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyTitle: {
    fontWeight: "800",
  },
});
