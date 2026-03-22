import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Card, Button, useTheme, IconButton } from 'react-native-paper';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/constants/theme';
import type { Chore } from '@/types/database';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function ChildDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { session, initialized, signOut } = useAuthStore();
  const {
    children,
    buckets,
    bucketTemplates,
    chores,
    transactions,
    fetchChildBuckets,
    fetchChildren,
    fetchBucketTemplates,
    fetchChores,
    fetchChildTransactions,
    markChoreDone,
    loading,
  } = useFamilyStore();

  const child = children.find(c => c.id === id);

  // Guard 1: Handle missing `id` param
  useEffect(() => {
    if (initialized && !id) {
      const currentProfile = useAuthStore.getState().profile;
      if (currentProfile?.role === 'child') {
        router.replace({ pathname: '/(child)/dashboard', params: { id: currentProfile.id } });
      } else {
        router.replace('/(parent)/dashboard');
      }
    }
  }, [initialized, id]);

  // Guard 2: Redirect to login if session expired or missing
  useEffect(() => {
    if (initialized && !session) {
      router.replace('/(auth)/login');
    }
  }, [initialized, session]);

  useEffect(() => {
    if (id && session) {
      fetchChildren();
      fetchBucketTemplates();
      fetchChildBuckets(id);
      fetchChores();
      fetchChildTransactions(id);
    }
  }, [id, session]);

  // Show loading spinner while auth is being determined
  if (!initialized) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenContainer>
    );
  }

  // Session has expired — show a friendly redirect message instead of "Child not found"
  if (!session) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Session Expired' }} />
        <View style={styles.centeredMessage}>
          <Text variant="titleMedium" style={styles.sessionExpiredText}>
            ⏰ Your session has expired.
          </Text>
          <Text variant="bodyMedium" style={styles.sessionExpiredSubtext}>
            Redirecting to login…
          </Text>
          <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.lg }}>
            Go to Login
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  if (!child) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Who are you?' }} />
        <View style={styles.centeredMessage}>
          <Text variant="titleMedium">Child not found.</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Please ask a parent for help!
          </Text>
          <Button mode="outlined" onPress={() => router.replace('/(parent)/dashboard')} style={{ marginTop: spacing.lg }}>
            Back to Parent Dashboard
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  const totalBalance = buckets.reduce((sum, b) => sum + (b.cached_balance || 0), 0);
  const myChores = chores.filter(c => c.assigned_to_child_id === child.id && c.status === 'assigned');

  const handleDone = async (choreId: string, choreName: string) => {
    const { error } = await markChoreDone(choreId);
    if (error) showError(error);
    else showSuccess(`"${choreName}" marked done! 🎉`);
  };

  return (
    <ScreenContainer scrollable={false}>
      <Stack.Screen options={{
        title: `${child.name}'s Bank`,
        headerLeft: () => (
          <IconButton icon="logout" onPress={async () => { await signOut(); router.replace('/(auth)/login'); }} />
        )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Big Balance Header */}
        <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primaryContainer }]} mode="elevated">
          <Card.Content style={styles.balanceContent}>
            <Text style={styles.bigEmoji}>{child.avatar_emoji}</Text>
            <Text variant="titleLarge" style={[styles.balanceLabel, { color: theme.colors.onPrimaryContainer }]}>
              {child.name}'s TOTAL SAVINGS
            </Text>
            <Text variant="displayMedium" style={[styles.balanceAmount, { color: theme.colors.onPrimaryContainer }]}>
              ${totalBalance.toFixed(2)}
            </Text>
          </Card.Content>
        </Card>

        {/* Mentor Banner */}
        <Pressable onPress={() => router.push(`/(child)/mentor?id=${child.id}` as any)}>
          <Card 
            style={[styles.mentorCard, { backgroundColor: '#6200ee15', borderColor: '#6200ee50', borderWidth: 1 }]} 
            mode="contained"
          >
            <Card.Content style={styles.mentorContent}>
              <View style={styles.mentorAvatar}>
                <Text style={{ fontSize: 32 }}>🤖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
                  Talk to your Money Mentor!
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Get advice on how to save up for your goals!
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </Card.Content>
          </Card>
        </Pressable>

        {/* Buckets Section */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>My Buckets</Text>
          {bucketTemplates.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  No buckets set up yet.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.bucketGrid}>
              {bucketTemplates.map(template => {
                const bucket = buckets.find(b => b.template_id === template.id);
                const balance = bucket?.cached_balance || 0;
                return (
                  <Card
                    key={template.id}
                    style={[styles.bucketCard, { borderTopColor: template.color, borderTopWidth: 4 }]}
                    mode="elevated"
                  >
                    <Card.Content style={styles.bucketInner}>
                      <Text style={styles.bucketEmoji}>{template.emoji}</Text>
                      <Text variant="labelLarge" numberOfLines={1} style={{ fontWeight: '700' }}>
                        {template.name}
                      </Text>
                      <Text variant="titleLarge" style={{ fontWeight: '800', marginTop: 4 }}>
                        ${balance.toFixed(2)}
                      </Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Chores Section */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>My Chores</Text>
          {myChores.length === 0 ? (
            <Card mode="outlined" style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text variant="bodyLarge" style={{ textAlign: 'center' }}>All done! Nice work! 🎉</Text>
              </Card.Content>
            </Card>
          ) : (
            myChores.map(chore => (
              <Card key={chore.id} style={[styles.choreCard, { backgroundColor: theme.colors.secondaryContainer }]} mode="elevated">
                <Card.Content style={styles.choreContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSecondaryContainer }}>{chore.title}</Text>
                    <Text variant="bodyLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                      Earn ${chore.value.toFixed(2)}
                    </Text>
                    {chore.due_date && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Due: {new Date(chore.due_date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Button
                    mode="contained"
                    onPress={() => handleDone(chore.id, chore.title)}
                    loading={loading}
                    style={styles.doneButton}
                    labelStyle={{ fontSize: 16, fontWeight: '800' }}
                  >
                    I DID IT! ✓
                  </Button>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        {/* Want to Spend? */}
        {totalBalance > 0 && (
          <View style={styles.section}>
            <Card style={styles.spendCard} mode="outlined">
              <Card.Content style={styles.spendContent}>
                <Text style={styles.spendEmoji}>🛍️</Text>
                <Text variant="titleMedium" style={{ fontWeight: '800', marginBottom: spacing.xs }}>
                  Want to buy something?
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Ask a parent to withdraw money from your savings bucket!
                </Text>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>Recent Activity</Text>
            <Card mode="elevated">
              <Card.Content>
                {transactions.slice(0, 5).map((tx, index) => {
                  const template = bucketTemplates.find(bt => {
                    const b = buckets.find(bb => bb.id === tx.bucket_id);
                    return b && bt.id === b.template_id;
                  });
                  const isNegative = tx.amount < 0;
                  const txEmoji = tx.type === 'withdrawal' ? '🛍️' : (template?.emoji ?? '💰');
                  return (
                    <View key={tx.id} style={[styles.txRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }]}>
                      <Text style={{ fontSize: 22 }}>{txEmoji}</Text>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                          {tx.description || tx.type.replace('_', ' ')}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text variant="titleMedium" style={{ fontWeight: '700', color: isNegative ? theme.colors.error : '#4CAF50' }}>
                        {isNegative ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.xxl },
  balanceCard: { marginBottom: spacing.xl, marginTop: spacing.sm, borderRadius: 24 },
  balanceContent: { alignItems: 'center', paddingVertical: spacing.xl },
  bigEmoji: { fontSize: 56, marginBottom: spacing.sm },
  balanceLabel: { fontWeight: '800', letterSpacing: 0.5, opacity: 0.7 },
  balanceAmount: { fontWeight: '900', marginTop: 4 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontWeight: '800', marginBottom: spacing.md },
  bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  bucketCard: { width: '47%', borderRadius: 16 },
  bucketInner: { alignItems: 'center', paddingVertical: spacing.md },
  bucketEmoji: { fontSize: 32, marginBottom: spacing.xs },
  choreCard: { marginBottom: spacing.md, borderRadius: 16 },
  choreContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  doneButton: { borderRadius: 12 },
  emptyCard: { borderStyle: 'dashed', borderRadius: 16 },
  emptyContent: { paddingVertical: spacing.xl },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  centeredMessage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  sessionExpiredText: { fontWeight: '700', textAlign: 'center', marginBottom: spacing.xs },
  sessionExpiredSubtext: { textAlign: 'center', opacity: 0.6 },
  spendCard: { borderRadius: 16, borderStyle: 'dashed' },
  spendContent: { alignItems: 'center', paddingVertical: spacing.lg },
  spendEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  mentorCard: {
    marginBottom: spacing.xl,
    marginHorizontal: spacing.sm,
    borderRadius: 16,
  },
  mentorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  mentorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff80',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
