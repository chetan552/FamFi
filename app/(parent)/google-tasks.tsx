import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, FlatList } from 'react-native';
import {
  Text, Card, Button, TextInput, useTheme, IconButton,
  Portal, Modal, Chip, Divider, ActivityIndicator,
} from 'react-native-paper';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { useGoogleAuth, exchangeCodeForTokens, fetchTaskLists, type GoogleTaskList } from '@/lib/googleTasks';
import { getValidAccessTokenForUser } from '@/lib/googleTasksSync';
import { useAuthStore } from '@/store/authStore';

export default function GoogleTasksScreen() {
  const theme = useTheme();
  const { showSuccess, showError, showInfo } = useSnackbar();
  const {
    children,
    googleConnected,
    googleMappings,
    loading,
    checkGoogleConnection,
    fetchGoogleMappings,
    saveGoogleTokens,
    disconnectGoogle,
    saveGoogleMapping,
    deleteGoogleMapping,
    syncGoogleTasks,
  } = useFamilyStore();

  const { request, response, promptAsync, redirectUri } = useGoogleAuth();
  const profile = useAuthStore(s => s.profile);

  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedList, setSelectedList] = useState<GoogleTaskList | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [defaultReward, setDefaultReward] = useState('1.00');

  useEffect(() => {
    checkGoogleConnection();
    fetchGoogleMappings();
  }, []);

  // Auto-load task lists when already connected (e.g., returning to screen)
  useEffect(() => {
    if (googleConnected && profile?.id && taskLists.length === 0) {
      loadTaskLists();
    }
  }, [googleConnected]);

  // Handle OAuth callback
  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      handleTokenExchange(response.params.code);
    } else if (response?.type === 'error') {
      showError('Google sign-in failed.');
    }
  }, [response]);

  const handleTokenExchange = async (code: string) => {
    try {
      const codeVerifier = request?.codeVerifier;
      if (!codeVerifier) throw new Error('Missing code verifier');

      const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
      const { error } = await saveGoogleTokens(
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in
      );
      if (error) throw new Error(error);
      showSuccess('Google account connected! ✅');
      // Load lists right after connect using the fresh token
      loadTaskLists(tokens.access_token);
    } catch (e: any) {
      showError(e.message);
    }
  };

  const loadTaskLists = async (accessToken?: string) => {
    setLoadingLists(true);
    try {
      let token = accessToken;
      if (!token && profile?.id) {
        // Fetch token from DB (handles refresh if expired)
        token = await getValidAccessTokenForUser(profile.id);
      }
      if (token) {
        const lists = await fetchTaskLists(token);
        setTaskLists(lists);
      }
    } catch (e: any) {
      showError(`Failed to load task lists: ${e.message}`);
    }
    setLoadingLists(false);
  };

  const handleConnect = () => {
    promptAsync();
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google',
      'This will stop syncing tasks. Your existing chores from Google Tasks will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            const { error } = await disconnectGoogle();
            if (error) showError(error);
            else showSuccess('Google disconnected.');
          },
        },
      ]
    );
  };

  const openMapModal = (list: GoogleTaskList) => {
    setSelectedList(list);
    setSelectedChildId(children.length === 1 ? children[0].id : null);
    setDefaultReward('1.00');
    setMapModalVisible(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedList || !selectedChildId) return;
    const { error } = await saveGoogleMapping(
      selectedList.id,
      selectedList.title,
      selectedChildId,
      parseFloat(defaultReward) || 1.0
    );
    if (error) showError(error);
    else {
      showSuccess(`"${selectedList.title}" mapped!`);
      setMapModalVisible(false);
    }
  };

  const handleRemoveMapping = (id: string, title: string) => {
    Alert.alert('Remove Mapping', `Stop syncing "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteGoogleMapping(id);
          if (error) showError(error);
          else showSuccess('Mapping removed.');
        },
      },
    ]);
  };

  const handleSync = async () => {
    const result = await syncGoogleTasks();
    if (result.errors.length > 0) {
      showError(result.errors[0]);
    } else {
      showSuccess(`Synced ${result.synced} task(s)! 🔄`);
    }
  };

  const getChildForMapping = (childId: string) =>
    children.find(c => c.id === childId);

  return (
    <ScreenContainer scrollable>
      <Stack.Screen options={{ title: 'Google Tasks', headerShown: true }} />

      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="google" size={40} color="#4285F4" />
        <Text variant="headlineMedium" style={{ fontWeight: '700', marginTop: spacing.sm }}>
          Google Tasks
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Sync your Google Task Lists as chores
        </Text>
      </View>

      {/* Connection Status */}
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.connectionCard}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {googleConnected ? 'Connected ✅' : 'Not Connected'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {googleConnected
                ? 'Your Google account is linked. Tasks will sync as chores.'
                : 'Connect your Google account to start syncing task lists.'}
            </Text>
          </View>
          {googleConnected ? (
            <Button
              mode="outlined"
              textColor={theme.colors.error}
              onPress={handleDisconnect}
              compact
            >
              Disconnect
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleConnect}
              disabled={!request}
              icon="google"
              buttonColor="#4285F4"
            >
              Connect
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Available Task Lists (shown after first connect) */}
      {googleConnected && taskLists.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Available Task Lists</Text>
          {loadingLists ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} />
          ) : (
            taskLists.map(list => {
              const isMapped = googleMappings.some(m => m.google_tasklist_id === list.id);
              return (
                <Card key={list.id} mode="outlined" style={styles.listCard}>
                  <Card.Content style={styles.listRow}>
                    <MaterialCommunityIcons
                      name={isMapped ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={24}
                      color={isMapped ? theme.colors.primary : theme.colors.outline}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text variant="bodyLarge" style={{ fontWeight: '600' }}>{list.title}</Text>
                    </View>
                    {!isMapped && (
                      <Button mode="contained-tonal" compact onPress={() => openMapModal(list)}>
                        Map
                      </Button>
                    )}
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* Active Mappings */}
      {googleConnected && googleMappings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Active Mappings</Text>
            <Button mode="contained" onPress={handleSync} loading={loading} icon="sync" compact>
              Sync Now
            </Button>
          </View>

          {googleMappings.map(mapping => {
            const child = getChildForMapping(mapping.child_id);
            return (
              <Card key={mapping.id} mode="elevated" style={styles.mappingCard}>
                <Card.Content style={styles.mappingRow}>
                  <MaterialCommunityIcons name="google" size={24} color="#4285F4" />
                  <View style={styles.mappingInfo}>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                      {mapping.google_tasklist_title}
                    </Text>
                    <View style={styles.mappingMeta}>
                      <Chip compact icon="account">
                        {child?.avatar_emoji} {child?.name ?? 'Unknown'}
                      </Chip>
                      <Chip compact icon="currency-usd">
                        ${mapping.default_reward.toFixed(2)} each
                      </Chip>
                    </View>
                    {mapping.last_synced_at && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        Last synced: {new Date(mapping.last_synced_at).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon="close"
                    iconColor={theme.colors.error}
                    size={20}
                    onPress={() => handleRemoveMapping(mapping.id, mapping.google_tasklist_title)}
                  />
                </Card.Content>
              </Card>
            );
          })}
        </View>
      )}

      {/* Empty state for connected but no task lists loaded yet */}
      {googleConnected && googleMappings.length === 0 && taskLists.length === 0 && (
        <Card mode="outlined" style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={48} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
              Google account connected! Load your task lists to start mapping them to your children.
            </Text>
            <Button
              mode="contained"
              onPress={() => loadTaskLists()}
              loading={loadingLists}
              icon="format-list-checkbox"
              style={{ marginTop: spacing.lg }}
            >
              Load Task Lists
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Map Task List Modal */}
      <Portal>
        <Modal
          visible={mapModalVisible}
          onDismiss={() => setMapModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            Map "{selectedList?.title}"
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
            Choose which child these tasks belong to and the default reward per task.
          </Text>

          <Text variant="titleSmall" style={{ marginBottom: spacing.sm }}>Assign To Child</Text>
          <View style={styles.chipRow}>
            {children.map(child => (
              <Chip
                key={child.id}
                selected={selectedChildId === child.id}
                onPress={() => setSelectedChildId(child.id)}
                showSelectedOverlay
              >
                {child.avatar_emoji} {child.name}
              </Chip>
            ))}
          </View>

          <TextInput
            label="Default Reward ($)"
            value={defaultReward}
            onChangeText={setDefaultReward}
            mode="outlined"
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon="currency-usd" />}
            style={{ marginTop: spacing.md }}
            textColor={theme.colors.onSurface}
          />

          <View style={styles.modalActions}>
            <Button onPress={() => setMapModalVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSaveMapping}
              loading={loading}
              disabled={!selectedChildId}
            >
              Save Mapping
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  connectionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  listCard: { marginBottom: spacing.xs },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  mappingCard: { marginBottom: spacing.sm },
  mappingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  mappingInfo: { flex: 1 },
  mappingMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modal: { margin: spacing.lg, padding: spacing.lg, borderRadius: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  emptyCard: { marginTop: spacing.lg },
  emptyContent: { alignItems: 'center', paddingVertical: spacing.xl },
});
