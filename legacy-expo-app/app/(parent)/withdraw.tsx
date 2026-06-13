import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, Chip, HelperText } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function WithdrawScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { childId: preselectedChildId } = useLocalSearchParams<{ childId?: string }>();

  const {
    children,
    bucketTemplates,
    allFamilyBuckets,
    bucketBalances,
    withdrawFromBucket,
    fetchAllFamilyBuckets,
    loading: storeLoading,
  } = useFamilyStore();

  const [childId, setChildId] = useState<string | null>(
    preselectedChildId ?? (children.length === 1 ? children[0].id : null)
  );
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllFamilyBuckets();
  }, []);

  // Reset bucket selection when child changes
  useEffect(() => {
    setTemplateId(null);
    setAmount('');
    setError(null);
  }, [childId]);

  const getBucketBalance = (childIdParam: string, templateIdParam: string): number => {
    return (
      bucketBalances[`${childIdParam}:${templateIdParam}`] ??
      allFamilyBuckets
        .filter(b => b.child_id === childIdParam && b.template_id === templateIdParam)
        .reduce((sum, b) => sum + (b.cached_balance || 0), 0)
    );
  };

  const selectedChild = children.find(c => c.id === childId);
  const selectedBucketBalance = childId && templateId
    ? getBucketBalance(childId, templateId)
    : null;

  const bucketsWithBalance = childId
    ? bucketTemplates.filter(bt => getBucketBalance(childId, bt.id) > 0)
    : [];

  const handleWithdraw = async () => {
    setError(null);

    if (!childId) return setError('Please select a child.');
    if (!templateId) return setError('Please select a bucket to withdraw from.');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return setError('Please enter a valid amount greater than $0.');
    }

    const parsedAmount = parseFloat(parseFloat(amount).toFixed(2));

    if (selectedBucketBalance !== null && parsedAmount > selectedBucketBalance) {
      return setError(
        `Amount exceeds available balance of $${selectedBucketBalance.toFixed(2)}.`
      );
    }

    const { error: saveError } = await withdrawFromBucket(
      childId,
      templateId,
      parsedAmount,
      description.trim() || 'Withdrawal'
    );

    if (saveError) {
      setError(saveError);
      showError(saveError);
    } else {
      showSuccess(`$${parsedAmount.toFixed(2)} withdrawn successfully! 💸`);
      router.back();
    }
  };

  return (
    <ScreenContainer scrollable>
      <Stack.Screen options={{ title: 'Withdraw / Spend', headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="bank-transfer-out" size={40} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
          Record a Spend 💸
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Deduct money from a child's savings bucket when they spend it.
        </Text>
      </View>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.formContent}>

          {/* Step 1 — Pick child */}
          <View>
            <Text variant="titleSmall" style={styles.label}>1. Which child?</Text>
            {children.length === 0 ? (
              <Text style={{ color: theme.colors.error }}>No children added yet.</Text>
            ) : (
              <View style={styles.chipRow}>
                {children.map(child => (
                  <Chip
                    key={child.id}
                    selected={childId === child.id}
                    onPress={() => setChildId(child.id)}
                    showSelectedOverlay
                  >
                    {child.avatar_emoji} {child.name}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          {/* Step 2 — Pick bucket (only show buckets with balance > 0) */}
          {childId && (
            <View>
              <Text variant="titleSmall" style={styles.label}>2. From which bucket?</Text>
              {bucketsWithBalance.length === 0 ? (
                <Card mode="outlined" style={styles.emptyBuckets}>
                  <Card.Content style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                    <MaterialCommunityIcons
                      name="piggy-bank-outline"
                      size={36}
                      color={theme.colors.outline}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm, textAlign: 'center' }}
                    >
                      {selectedChild?.name} has no savings to withdraw from yet.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <View style={styles.chipRow}>
                  {bucketsWithBalance.map(bt => {
                    const balance = getBucketBalance(childId, bt.id);
                    return (
                      <Chip
                        key={bt.id}
                        selected={templateId === bt.id}
                        onPress={() => setTemplateId(bt.id)}
                        showSelectedOverlay
                      >
                        {bt.emoji} {bt.name} · ${balance.toFixed(2)}
                      </Chip>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Step 3 — Available balance indicator */}
          {childId && templateId && selectedBucketBalance !== null && (
            <Card
              mode="contained"
              style={[styles.balanceCard, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <Card.Content style={styles.balanceCardContent}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  Available balance
                </Text>
                <Text
                  variant="titleLarge"
                  style={{ fontWeight: '800', color: theme.colors.onPrimaryContainer }}
                >
                  ${selectedBucketBalance.toFixed(2)}
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Step 4 — Amount */}
          {childId && templateId && (
            <>
              <TextInput
                label="Amount to Withdraw ($)"
                value={amount}
                onChangeText={(v) => { setAmount(v); setError(null); }}
                mode="outlined"
                keyboardType="decimal-pad"
                placeholder="e.g. 5.00"
                left={<TextInput.Icon icon="currency-usd" />}
                textColor={theme.colors.onSurface}
              />

              <TextInput
                label="What's it for? (Optional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                placeholder="e.g. New toy, Snacks, School supplies…"
                left={<TextInput.Icon icon="shopping" />}
                textColor={theme.colors.onSurface}
              />
            </>
          )}

          {error && (
            <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleWithdraw}
            loading={storeLoading}
            disabled={
              storeLoading ||
              !childId ||
              !templateId ||
              !amount ||
              bucketsWithBalance.length === 0
            }
            contentStyle={{ paddingVertical: 8 }}
            icon="bank-transfer-out"
          >
            Confirm Withdrawal
          </Button>

        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.xl,
    borderRadius: 16,
  },
  formContent: {
    gap: spacing.lg,
  },
  label: {
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emptyBuckets: {
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  balanceCard: {
    borderRadius: 12,
  },
  balanceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
