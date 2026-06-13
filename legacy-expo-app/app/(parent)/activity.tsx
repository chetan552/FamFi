import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { Text, Chip, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import type { Transaction } from '@/types/database';

type FilterType = 'all' | 'chore_earning' | 'gift' | 'interest' | 'parent_match';

function getTypeConfig(type: Transaction['type'], tintColor: string) {
  switch (type) {
    case 'chore_earning': return { icon: 'broom', color: '#4CAF50', label: 'Chore Earning' };
    case 'gift': return { icon: 'gift', color: '#E85D75', label: 'Gift' };
    case 'interest': return { icon: 'percent', color: '#7C4DFF', label: 'Interest' };
    case 'parent_match': return { icon: 'handshake', color: '#2B9EB3', label: 'Parent Match' };
    case 'adjustment': return { icon: 'pencil', color: '#F5A623', label: 'Adjustment' };
    default: return { icon: 'cash', color: tintColor, label: type };
  }
}

function groupByDate(transactions: Transaction[]): { title: string; data: Transaction[] }[] {
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach(tx => {
    const date = new Date(tx.created_at);
    const key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function ActivityScreen() {
  const theme = useTheme();
  const { children, allTransactions, fetchAllFamilyTransactions, fetchChildren, loading } = useFamilyStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const loadData = useCallback(async () => {
    await fetchChildren();
    await fetchAllFamilyTransactions();
  }, []);

  useEffect(() => { loadData(); }, []);

  const filtered = filter === 'all'
    ? allTransactions
    : allTransactions.filter(tx => tx.type === filter);

  const sections = groupByDate(filtered);

  const getChildName = (childId: string) => {
    const child = children.find(c => c.id === childId);
    return child ? `${child.avatar_emoji} ${child.name}` : '👤 Unknown';
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const config = getTypeConfig(item.type, theme.colors.primary);
    return (
      <View style={styles.txRow}>
        <View style={[styles.txIcon, { backgroundColor: config.color + '20' }]}>
          <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
            {item.description || config.label}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {getChildName(item.child_id)} · {config.label}
          </Text>
        </View>
        <Text
          variant="titleMedium"
          style={{ fontWeight: '800', color: item.amount >= 0 ? '#4CAF50' : theme.colors.error }}
        >
          {item.amount >= 0 ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <ScreenContainer scrollable={false}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Activity</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {allTransactions.length} total transactions
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {([
          ['all', 'All', 'format-list-bulleted'],
          ['chore_earning', 'Chores', 'broom'],
          ['gift', 'Gifts', 'gift'],
          ['interest', 'Interest', 'percent'],
          ['parent_match', 'Match', 'handshake'],
        ] as [FilterType, string, string][]).map(([key, label, icon]) => (
          <Chip
            key={key}
            selected={filter === key}
            onPress={() => setFilter(key)}
            icon={icon}
            style={styles.filterChip}
            compact
          >
            {label}
          </Chip>
        ))}
      </View>

      {allTransactions.length === 0 ? (
        <Surface style={styles.emptyState} elevation={0}>
          <MaterialCommunityIcons name="history" size={64} color={theme.colors.outline} />
          <Text variant="titleMedium" style={{ fontWeight: '700', marginTop: spacing.md }}>
            No activity yet
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
            Transactions will appear here after payday, gifts, or interest processing.
          </Text>
        </Surface>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
          )}
          renderSectionFooter={() => <View style={styles.sectionFooterSpacer} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  headerTitle: { fontWeight: '800', letterSpacing: -0.5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: {},
  sectionHeader: { paddingVertical: spacing.sm, paddingHorizontal: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.md },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  separator: { height: 1, marginLeft: 76 },
  sectionFooterSpacer: { height: spacing.md },
  emptyState: { flex: 1, alignItems: 'center', paddingVertical: spacing.xxl, backgroundColor: 'transparent' },
});
