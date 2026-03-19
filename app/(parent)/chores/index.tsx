import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Chip, IconButton, Surface } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import type { Chore } from '@/types/database';

type ChoreSection = { title: string; data: Chore[]; icon: string; color: string };

export default function ChoresScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { chores, children, updateChoreStatus, deleteChore, fetchChores, loading } = useFamilyStore();

  const getChildDetails = (childId: string) =>
    children.find(c => c.id === childId) || { name: 'Unknown', avatar_emoji: '👤' };

  const getStatusConfig = (status: Chore['status']) => {
    switch (status) {
      case 'assigned': return { color: theme.colors.primary, label: 'Active', icon: 'clock-outline' as const };
      case 'done': return { color: theme.colors.secondary, label: 'Review', icon: 'eye-outline' as const };
      case 'approved': return { color: theme.colors.tertiary, label: 'Pending Payment', icon: 'check-circle-outline' as const };
      case 'paid': return { color: theme.colors.outline, label: 'Paid', icon: 'cash-check' as const };
      default: return { color: theme.colors.outline, label: (status as string).toUpperCase(), icon: 'help-circle-outline' as const };
    }
  };

  const sections = useMemo(() => {
    const grouped: { [key: string]: Chore[] } = { review: [], active: [], completed: [] };
    chores.forEach(chore => {
      if (chore.status === 'done') grouped.review.push(chore);
      else if (chore.status === 'assigned') grouped.active.push(chore);
      else grouped.completed.push(chore);
    });

    const result: ChoreSection[] = [];
    if (grouped.review.length) result.push({ title: 'Pending Review', data: grouped.review, icon: 'alert-circle-outline', color: theme.colors.secondary });
    if (grouped.active.length) result.push({ title: 'Active Chores', data: grouped.active, icon: 'play-circle-outline', color: theme.colors.primary });
    if (grouped.completed.length) result.push({ title: 'Completed', data: grouped.completed, icon: 'checkbox-marked-circle-outline', color: theme.colors.tertiary });
    return result;
  }, [chores, theme]);

  const handleApprove = async (choreId: string) => {
    const { error } = await updateChoreStatus(choreId, 'approved');
    if (error) showError(error);
    else showSuccess('Chore approved! ✅');
  };

  const handleDelete = async (choreId: string) => {
    const { error } = await deleteChore(choreId);
    if (error) showError(error);
    else showSuccess('Chore deleted.');
  };

  const renderItem = ({ item }: { item: Chore }) => {
    const child = getChildDetails(item.assigned_to_child_id);
    const statusConfig = getStatusConfig(item.status);
    const isDone = item.status === 'done';
    const canEdit = item.status === 'assigned' || item.status === 'done';

    return (
      <Card
        mode="elevated"
        style={[styles.card, isDone && { backgroundColor: theme.colors.secondaryContainer + '20' }]}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleInfo}>
              <Text variant="titleMedium" style={[styles.choreTitle, { color: theme.colors.onSurface }]}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.iconText}>
                  <Text style={styles.emoji}>{child.avatar_emoji}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{child.name}</Text>
                </View>
                {item.due_date && (
                  <View style={styles.iconText}>
                    <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {new Date(item.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.valueContainer}>
              <Text variant="headlineSmall" style={[styles.valueText, { color: theme.colors.primary }]}>
                ${item.value.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.chipGroup}>
              <Chip
                icon={statusConfig.icon}
                selectedColor={statusConfig.color}
                style={[styles.statusChip, { backgroundColor: statusConfig.color + '15' }]}
                textStyle={styles.statusLabel}
                compact
              >
                {statusConfig.label}
              </Chip>
              {item.is_recurring && (
                <Chip
                  icon="repeat"
                  compact
                  style={styles.recurringChip}
                  textStyle={styles.statusLabel}
                >
                  {item.recurrence_period}
                </Chip>
              )}
              {item.source === 'google_tasks' && (
                <Chip
                  icon="google"
                  compact
                  style={styles.googleChip}
                  textStyle={styles.statusLabel}
                  selectedColor="#4285F4"
                >
                  Google Tasks
                </Chip>
              )}
            </View>

            <View style={styles.actions}>
              {canEdit && (
                <IconButton
                  icon="pencil"
                  size={18}
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={() => router.push(`/(parent)/chores/edit/${item.id}` as any)}
                  style={styles.smallAction}
                />
              )}
              {item.status !== 'paid' && (
                <IconButton
                  icon="delete-outline"
                  size={18}
                  iconColor={theme.colors.error}
                  onPress={() => handleDelete(item.id)}
                  style={styles.smallAction}
                />
              )}
              {isDone && (
                <Button
                  mode="contained"
                  onPress={() => handleApprove(item.id)}
                  loading={loading}
                  style={styles.approveButton}
                  labelStyle={styles.buttonLabel}
                  contentStyle={styles.buttonContent}
                >
                  Approve ✓
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSectionHeader = ({ section: { title, icon, color } }: { section: ChoreSection }) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text variant="titleSmall" style={[styles.sectionTitle, { color }]}>{title}</Text>
    </View>
  );

  return (
    <ScreenContainer scrollable={false}>
      <Stack.Screen options={{ title: 'Chores', headerBackVisible: true }} />

      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.headerTitle}>Family Chores</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {chores.length} total • {chores.filter(c => c.status === 'done').length} needs review
          </Text>
        </View>
        <IconButton
          icon="plus-circle"
          mode="contained-tonal"
          containerColor={theme.colors.primaryContainer}
          iconColor={theme.colors.onPrimaryContainer}
          size={32}
          onPress={() => router.push('/(parent)/chores/new')}
        />
      </View>

      {chores.length === 0 ? (
        <Surface style={styles.emptyContainer} elevation={0}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={theme.colors.outline} />
          <Text variant="titleMedium" style={styles.emptyTitle}>No chores yet</Text>
          <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Create chores to help your children earn rewards.
          </Text>
          <Button mode="contained" onPress={() => router.push('/(parent)/chores/new')} style={styles.emptyButton}>
            Create First Chore
          </Button>
        </Surface>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChores} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerTitle: { fontWeight: '800', letterSpacing: -0.5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  card: { marginBottom: spacing.sm, borderRadius: 16, overflow: 'hidden' },
  cardContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  titleInfo: { flex: 1, gap: spacing.xs },
  choreTitle: { fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  iconText: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emoji: { fontSize: 14 },
  valueContainer: { backgroundColor: 'rgba(43, 158, 179, 0.1)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8, marginLeft: spacing.sm },
  valueText: { fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  chipGroup: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  statusChip: { height: 28 },
  recurringChip: { height: 28, backgroundColor: '#7C4DFF15' },
  googleChip: { height: 28, backgroundColor: '#4285F415' },
  statusLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  smallAction: { margin: 0 },
  approveButton: { borderRadius: 8 },
  buttonContent: { height: 32, paddingHorizontal: spacing.sm },
  buttonLabel: { fontSize: 12, marginVertical: 0 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, marginTop: spacing.xxl, backgroundColor: 'transparent' },
  emptyTitle: { fontWeight: '700', marginTop: spacing.md },
  emptySubtitle: { textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  emptyButton: { width: '100%' },
});
