import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, HelperText } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import type { Chore, User, BucketTemplate } from '@/types/database';

export default function PaydayScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { children, chores, bucketTemplates, processPayday, loading: storeLoading } = useFamilyStore();

  const childrenWithPay = children.filter(child =>
    chores.some(c => c.assigned_to_child_id === child.id && c.status === 'approved')
  ).map(child => {
    const childChores = chores.filter(c => c.assigned_to_child_id === child.id && c.status === 'approved');
    const total = childChores.reduce((sum, c) => sum + c.value, 0);
    return { child, chores: childChores, total };
  });

  const [distributions, setDistributions] = useState<Record<string, Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (bucketTemplates.length === 0) return;
    const initialDists: Record<string, Record<string, string>> = {};
    childrenWithPay.forEach(({ child, total }) => {
      const splitAmount = (total / bucketTemplates.length).toFixed(2);
      const childDist: Record<string, string> = {};
      bucketTemplates.forEach(bt => { childDist[bt.id] = splitAmount; });
      const sumExceptLast = parseFloat(splitAmount) * (bucketTemplates.length - 1);
      childDist[bucketTemplates[bucketTemplates.length - 1].id] = (total - sumExceptLast).toFixed(2);
      initialDists[child.id] = childDist;
    });
    setDistributions(initialDists);
  }, [chores.length, bucketTemplates.length]);

  const handleUpdateAmount = (childId: string, templateId: string, value: string) => {
    setDistributions(prev => ({ ...prev, [childId]: { ...prev[childId], [templateId]: value } }));
    if (errors[childId]) {
      setErrors(prev => ({ ...prev, [childId]: '' }));
    }
  };

  const handleProcessPayday = async (childId: string, total: number, choreIds: string[], childName: string) => {
    const childDist = distributions[childId];
    if (!childDist) return;

    let calculatedTotal = 0;
    const numberDist: Record<string, number> = {};
    for (const [tId, valStr] of Object.entries(childDist)) {
      const val = parseFloat(valStr) || 0;
      calculatedTotal += val;
      numberDist[tId] = val;
    }

    if (Math.abs(calculatedTotal - total) > 0.01) {
      setErrors(prev => ({ ...prev, [childId]: `Amounts must equal $${total.toFixed(2)}. Currently: $${calculatedTotal.toFixed(2)}` }));
      return;
    }

    const { error: saveError } = await processPayday(childId, numberDist, choreIds);
    if (saveError) {
      setErrors(prev => ({ ...prev, [childId]: saveError }));
      showError(saveError);
    } else {
      setPaid(prev => new Set([...prev, childId]));
      showSuccess(`Paid $${total.toFixed(2)} to ${childName}! 🎉`);
    }
  };

  if (childrenWithPay.length === 0) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Payday' }} />
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>Payday 💸</Text>
        </View>
        <Card mode="outlined" style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              No one is owed payday right now!
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
              Chores must be marked as 'Approved' before they appear here.
            </Text>
            <Button mode="contained-tonal" onPress={() => router.push('/(parent)/chores')} style={{ marginTop: spacing.lg }}>
              Go to Chores
            </Button>
          </Card.Content>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Stack.Screen options={{ title: 'Payday' }} />
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: '700' }}>Run Payday 💸</Text>
      </View>

      {childrenWithPay.map(({ child, chores: childChores, total }) => {
        const dist = distributions[child.id] || {};
        const childError = errors[child.id];
        const isPaid = paid.has(child.id);

        return (
          <Card key={child.id} mode="elevated" style={[styles.card, isPaid && { opacity: 0.6 }]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.childInfo}>
                  <Text style={styles.emoji}>{child.avatar_emoji}</Text>
                  <Text variant="titleLarge" style={{ fontWeight: '700' }}>{child.name}</Text>
                  {isPaid && <Text variant="bodySmall" style={{ color: '#4CAF50', fontWeight: '700' }}>✓ Paid</Text>}
                </View>
                <View style={styles.totalBadge}>
                  <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.onPrimaryContainer }}>
                    ${total.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.md }}>
                From {childChores.length} approved chore(s). How should this be split?
              </Text>

              {bucketTemplates.length === 0 ? (
                <Text style={{ color: theme.colors.error }}>No buckets created for your family.</Text>
              ) : (
                <View style={styles.bucketsContainer}>
                  {bucketTemplates.map(bt => (
                    <View key={bt.id} style={styles.bucketRow}>
                      <View style={styles.bucketLabelRow}>
                        <View style={[styles.bucketDot, { backgroundColor: bt.color }]} />
                        <Text variant="bodyMedium">{bt.emoji} {bt.name}</Text>
                      </View>
                      <TextInput
                        mode="outlined"
                        value={dist[bt.id] || ''}
                        onChangeText={(val) => handleUpdateAmount(child.id, bt.id, val)}
                        keyboardType="decimal-pad"
                        style={styles.amountInput}
                        left={<TextInput.Icon icon="currency-usd" />}
                        textColor={theme.colors.onSurface}
                        editable={!isPaid}
                      />
                    </View>
                  ))}
                </View>
              )}

              {childError && (
                <HelperText type="error" visible style={{ paddingHorizontal: 0, marginTop: spacing.sm }}>
                  {childError}
                </HelperText>
              )}

              {!isPaid && (
                <Button
                  mode="contained"
                  style={styles.processButton}
                  loading={storeLoading}
                  disabled={storeLoading || bucketTemplates.length === 0}
                  onPress={() => handleProcessPayday(child.id, total, childChores.map(c => c.id), child.name)}
                >
                  Pay ${total.toFixed(2)} to {child.name}
                </Button>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  childInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 28 },
  totalBadge: { backgroundColor: '#FFEECC', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  bucketsContainer: { gap: spacing.sm },
  bucketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bucketLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bucketDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.sm },
  amountInput: { width: 120, backgroundColor: 'transparent' },
  processButton: { marginTop: spacing.lg },
  emptyCard: { borderStyle: 'dashed' },
  emptyContent: { paddingVertical: spacing.xl },
});
