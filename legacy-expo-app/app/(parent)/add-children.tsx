import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import {
  Text, TextInput, Button, Card, IconButton, FAB, Portal,
  Modal, useTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import EmojiPicker from '@/components/ui/EmojiPicker';
import { useFamilyStore } from '@/store/familyStore';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { spacing } from '@/constants/theme';
import type { User } from '@/types/database';

export default function AddChildrenScreen() {
  const theme = useTheme();
  const { children, fetchChildren, addChild, updateChild, removeChild, loading } = useFamilyStore();
  const { showSuccess, showError } = useSnackbar();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState<User | null>(null);
  const [childName, setChildName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  const openAddModal = () => {
    setEditingChild(null);
    setChildName('');
    setSelectedEmoji('😊');
    setError(null);
    setModalVisible(true);
  };

  const openEditModal = (child: User) => {
    setEditingChild(child);
    setChildName(child.name);
    setSelectedEmoji(child.avatar_emoji);
    setError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!childName.trim()) {
      setError('Please enter a name.');
      return;
    }

    let result;
    if (editingChild) {
      result = await updateChild(editingChild.id, childName.trim(), selectedEmoji);
    } else {
      result = await addChild(childName.trim(), selectedEmoji);
    }

    if (result.error) {
      setError(result.error);
    } else {
      setModalVisible(false);
      setTimeout(() => {
        showSuccess(editingChild ? `${childName} updated!` : `${childName} added!`);
      }, 100);
    }
  };

  const handleRemoveChild = (childId: string, name: string) => {
    Alert.alert('Remove Child', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await removeChild(childId);
        if (error) showError(error);
        else showSuccess(`${name} removed.`);
      }},
    ]);
  };

  const handleContinue = () => {
    router.push('/(parent)/bucket-templates');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>👶</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Add Your Children
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Add each child who will have a virtual account
        </Text>
      </View>

      {children.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text style={{ fontSize: 48 }}>🧒</Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No children added yet.{'\n'}Tap the + button to add your first child.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.childCard} mode="elevated">
              <Card.Content style={styles.childCardContent}>
                <Text style={styles.childEmoji}>{item.avatar_emoji}</Text>
                <View style={styles.childInfo}>
                  <Text variant="titleMedium" style={{ fontWeight: '600' }}>{item.name}</Text>
                </View>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => openEditModal(item)}
                />
                <IconButton
                  icon="close"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => handleRemoveChild(item.id, item.name)}
                />
              </Card.Content>
            </Card>
          )}
        />
      )}

      {children.length > 0 && (
        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.continueButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          icon="arrow-right"
        >
          Set Up Buckets
        </Button>
      )}

      <FAB
        icon="plus"
        onPress={openAddModal}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: '700', marginBottom: spacing.md }}>
            {editingChild ? `Edit ${editingChild.name}` : 'Add a Child'}
          </Text>
          <TextInput
            label="Child's Name"
            value={childName}
            onChangeText={setChildName}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            autoCapitalize="words"
            textColor={theme.colors.onSurface}
          />
          <Text variant="titleSmall" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
            Pick an Avatar
          </Text>
          <EmojiPicker selected={selectedEmoji} onSelect={setSelectedEmoji} />

          {error && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
              {error}
            </Text>
          )}

          <View style={styles.modalActions}>
            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading}>
              {editingChild ? 'Save' : 'Add'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg },
  headerEmoji: { fontSize: 48, marginBottom: spacing.sm },
  title: { fontWeight: '700' },
  emptyCard: { marginTop: spacing.lg },
  emptyContent: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  list: { gap: spacing.sm },
  childCard: { marginBottom: 4 },
  childCardContent: { flexDirection: 'row', alignItems: 'center' },
  childEmoji: { fontSize: 36, marginRight: spacing.md },
  childInfo: { flex: 1 },
  continueButton: { marginTop: spacing.xl, borderRadius: 12, marginBottom: 80 },
  buttonContent: { paddingVertical: 6, flexDirection: 'row-reverse' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  modal: { margin: spacing.lg, padding: spacing.lg, borderRadius: 16 },
  input: {},
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});
