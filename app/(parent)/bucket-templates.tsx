import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import {
  Text, TextInput, Button, Card, IconButton, FAB, Portal,
  Modal, Chip, useTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import ColorPicker from '@/components/ui/ColorPicker';
import { useFamilyStore } from '@/store/familyStore';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { spacing, defaultBucketSuggestions, bucketColors } from '@/constants/theme';
import type { BucketTemplate } from '@/types/database';

const BUCKET_EMOJIS = ['💰', '🎮', '🎁', '📚', '🎨', '⚽', '🎵', '🍕', '🐾', '✈️', '🏠', '💝'];

export default function BucketTemplatesScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { bucketTemplates, fetchBucketTemplates, createBucketTemplate, updateBucketTemplate, deleteBucketTemplate, loading } = useFamilyStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BucketTemplate | null>(null);
  const [bucketName, setBucketName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [selectedColor, setSelectedColor] = useState(bucketColors[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBucketTemplates();
  }, []);

  const openAddModal = () => {
    setEditingTemplate(null);
    setBucketName('');
    setSelectedEmoji('💰');
    setSelectedColor(bucketColors[0]);
    setError(null);
    setModalVisible(true);
  };

  const openEditModal = (template: BucketTemplate) => {
    setEditingTemplate(template);
    setBucketName(template.name);
    setSelectedEmoji(template.emoji);
    setSelectedColor(template.color);
    setError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!bucketName.trim()) {
      setError('Please enter a bucket name.');
      return;
    }

    let result;
    if (editingTemplate) {
      result = await updateBucketTemplate(editingTemplate.id, {
        name: bucketName.trim(),
        emoji: selectedEmoji,
        color: selectedColor,
      });
    } else {
      result = await createBucketTemplate(bucketName.trim(), selectedEmoji, selectedColor);
    }

    if (result.error) {
      setError(result.error);
    } else {
      showSuccess(editingTemplate ? 'Bucket updated!' : 'Bucket created!');
      setModalVisible(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Bucket', `Are you sure you want to remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await deleteBucketTemplate(id);
        if (error) showError(error);
        else showSuccess(`${name} removed.`);
      }},
    ]);
  };

  const handleAddSuggestion = async (suggestion: typeof defaultBucketSuggestions[0]) => {
    const { error } = await createBucketTemplate(suggestion.name, suggestion.emoji, suggestion.color);
    if (!error) showSuccess(`${suggestion.name} added!`);
  };

  const handleFinish = () => {
    router.replace('/(parent)/dashboard');
  };

  const unusedSuggestions = defaultBucketSuggestions.filter(
    (s) => !bucketTemplates.some((bt) => bt.name.toLowerCase() === s.name.toLowerCase())
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🪣</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Spending Buckets
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Create categories for how your children save and spend
        </Text>
      </View>

      {/* Quick-add suggestions */}
      {unusedSuggestions.length > 0 && (
        <View style={styles.suggestions}>
          <Text variant="labelLarge" style={{ marginBottom: spacing.sm }}>Quick Add:</Text>
          <View style={styles.chipRow}>
            {unusedSuggestions.map((s) => (
              <Chip key={s.name} icon={() => <Text>{s.emoji}</Text>} onPress={() => handleAddSuggestion(s)} style={styles.chip}>
                {s.name}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {bucketTemplates.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text style={{ fontSize: 48 }}>🪣</Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No buckets yet.{'\n'}Use the quick-adds above or tap + to create custom ones.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={bucketTemplates}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={[styles.bucketCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]} mode="elevated">
              <Card.Content style={styles.bucketCardContent}>
                <Text style={styles.bucketEmoji}>{item.emoji}</Text>
                <View style={styles.bucketInfo}>
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
                  onPress={() => handleDelete(item.id, item.name)}
                />
              </Card.Content>
            </Card>
          )}
        />
      )}

      {bucketTemplates.length > 0 && (
        <Button
          mode="contained"
          onPress={handleFinish}
          style={styles.finishButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          icon="check"
        >
          Finish Setup
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
            {editingTemplate ? 'Edit Bucket' : 'Create a Bucket'}
          </Text>

          <TextInput
            label="Bucket Name"
            value={bucketName}
            onChangeText={setBucketName}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
            textColor={theme.colors.onSurface}
          />

          <Text variant="titleSmall" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
            Pick an Icon
          </Text>
          <View style={styles.emojiRow}>
            {BUCKET_EMOJIS.map((emoji) => (
              <Card
                key={emoji}
                style={[
                  styles.emojiOption,
                  selectedEmoji === emoji && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Card>
            ))}
          </View>

          <Text variant="titleSmall" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
            Pick a Color
          </Text>
          <ColorPicker selected={selectedColor} onSelect={setSelectedColor} />

          {error && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
              {error}
            </Text>
          )}

          <View style={styles.modalActions}>
            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading}>
              {editingTemplate ? 'Save' : 'Create'}
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
  suggestions: { marginBottom: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { marginBottom: 4 },
  emptyCard: { marginTop: spacing.md },
  emptyContent: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  list: { gap: spacing.sm },
  bucketCard: { marginBottom: 4, borderRadius: 12 },
  bucketCardContent: { flexDirection: 'row', alignItems: 'center' },
  bucketEmoji: { fontSize: 28, marginRight: spacing.md },
  bucketInfo: { flex: 1 },
  finishButton: { marginTop: spacing.xl, borderRadius: 12, marginBottom: 80 },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  modal: { margin: spacing.lg, padding: spacing.lg, borderRadius: 16, maxHeight: '80%' },
  input: { marginBottom: spacing.xs },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiOption: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  emojiText: { fontSize: 24, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});
