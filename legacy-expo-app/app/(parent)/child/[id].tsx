import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Card, useTheme, Button, Divider, List,
  IconButton, Modal, Portal, TextInput,
} from 'react-native-paper';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import EmojiPicker from '@/components/ui/EmojiPicker';

export default function ChildProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const {
    children,
    buckets,
    bucketBalances,
    childBalances,
    transactions,
    bucketTemplates,
    fetchChildBuckets,
    fetchChildTransactions,
    updateChild,
    removeChild,
    loading,
  } = useFamilyStore();

  const child = children.find(c => c.id === id);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('😊');

  useEffect(() => {
    if (id) {
      fetchChildBuckets(id);
      fetchChildTransactions(id);
    }
  }, [id]);

  const openEditModal = () => {
    if (!child) return;
    setEditName(child.name);
    setEditEmoji(child.avatar_emoji);
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!child || !editName.trim()) return;
    const { error } = await updateChild(child.id, editName.trim(), editEmoji);
    if (error) {
      showError(error);
    } else {
      showSuccess('Profile updated! ✏️');
      setEditVisible(false);
    }
  };

  const handleDelete = () => {
    if (!child) return;
    Alert.alert(
      `Remove ${child.name}?`,
      'This will permanently remove this child and all their data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeChild(child.id);
            if (error) showError(error);
            else {
              showSuccess(`${child.name} removed.`);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (!child) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.notFoundContainer}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>Child not found.</Text>
          <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
            Go Back
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  const totalBalance =
    childBalances[child.id] ??
    buckets.reduce((sum, b) => sum + (b.cached_balance || 0), 0);

  return (
    <ScreenContainer scrollable={false}>
      <Stack.Screen
        options={{
          title: `${child.name}'s Profile`,
          headerRight: () => (
            <IconButton icon="pencil" onPress={openEditModal} />
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>{child.avatar_emoji}</Text>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>
            {child.name}
          </Text>
          <Text
            variant="displaySmall"
            style={{ fontWeight: '800', color: theme.colors.primary, marginTop: spacing.sm }}
          >
            ${totalBalance.toFixed(2)}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Total Family Bank Balance
          </Text>
        </View>

        {/* Buckets Grid */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Buckets</Text>
          {bucketTemplates.length === 0 ? (
            <Card mode="outlined" style={styles.emptyCard}>
              <Card.Content>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
                >
                  No buckets set up yet.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.bucketGrid}>
              {bucketTemplates.map(template => {
                const balance =
                  bucketBalances[`${child.id}:${template.id}`] ??
                  buckets
                    .filter(b => b.template_id === template.id)
                    .reduce((sum, b) => sum + (b.cached_balance || 0), 0);
                return (
                  <Card
                    key={template.id}
                    style={[styles.bucketCard, { borderTopColor: template.color, borderTopWidth: 3 }]}
                    mode="contained"
                  >
                    <Card.Content style={styles.bucketContent}>
                      <Text style={styles.bucketEmoji}>{template.emoji}</Text>
                      <Text variant="labelMedium" numberOfLines={1}>{template.name}</Text>
                      <Text variant="titleLarge" style={{ fontWeight: '700' }}>${balance.toFixed(2)}</Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Transactions Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Recent Activity</Text>
          {transactions.length === 0 ? (
            <Card mode="outlined" style={styles.emptyCard}>
              <Card.Content>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
                >
                  No transactions yet.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <Card mode="elevated">
              {transactions.map((tx, index) => (
                <View key={tx.id}>
                  <List.Item
                    title={tx.description || tx.type.replace('_', ' ')}
                    description={new Date(tx.created_at).toLocaleDateString()}
                    right={() => (
                      <Text
                        variant="titleMedium"
                        style={{
                          alignSelf: 'center',
                          fontWeight: '700',
                          color: tx.amount >= 0 ? theme.colors.primary : theme.colors.error,
                        }}
                      >
                        {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                      </Text>
                    )}
                    left={props => (
                      <List.Icon {...props} icon={tx.type === 'gift' ? 'gift' : 'cash'} />
                    )}
                  />
                  {index < transactions.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.section, styles.actionsSection]}>
          <Button
            mode="contained"
            icon="bank-transfer-out"
            onPress={() => router.push(`/(parent)/withdraw?childId=${child.id}` as any)}
            style={styles.withdrawButton}
            contentStyle={{ paddingVertical: 4 }}
          >
            Record a Spend
          </Button>
          <Button
            mode="outlined"
            textColor={theme.colors.error}
            icon="account-remove"
            onPress={handleDelete}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          >
            Remove {child.name} from Family
          </Button>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Edit Profile</Text>

          <TextInput
            label="Child's Name"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            textColor={theme.colors.onSurface}
            style={{ marginBottom: spacing.md }}
          />

          <Text variant="titleSmall" style={{ marginBottom: spacing.sm }}>
            Pick an Avatar
          </Text>
          <EmojiPicker selected={editEmoji} onSelect={setEditEmoji} />

          <View style={styles.modalActions}>
            <Button onPress={() => setEditVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={!editName.trim() || loading}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  actionsSection: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  withdrawButton: {
    width: '100%',
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bucketCard: {
    width: '48%',
    borderRadius: 12,
  },
  bucketContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  bucketEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  emptyCard: {
    borderStyle: 'dashed',
  },
  modal: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
