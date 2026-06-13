import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, Chip, HelperText } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function DepositGiftScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { children, bucketTemplates, addGift, loading: storeLoading } = useFamilyStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Birthday Gift 🎁');
  const [childId, setChildId] = useState<string | null>(children.length === 1 ? children[0].id : null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return setError('Please enter a valid amount greater than 0.');
    if (!childId) return setError('Please select a child.');
    if (!templateId) return setError('Please select a destination bucket.');

    const { error: saveError } = await addGift(childId, templateId, parseFloat(amount), description);

    if (saveError) {
      setError(saveError);
      showError(saveError);
    } else {
      showSuccess(`Gift of $${parseFloat(amount).toFixed(2)} deposited! 🎁`);
      router.back();
    }
  };

  return (
    <ScreenContainer scrollable>
      <Stack.Screen options={{ title: 'Deposit Gift' }} />

      <Text variant="headlineMedium" style={{ fontWeight: '700', marginBottom: spacing.lg }}>
        Give a Gift 🎁
      </Text>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.formContent}>

          <TextInput
            label="Amount ($)"
            value={amount}
            onChangeText={setAmount}
            mode="outlined"
            keyboardType="decimal-pad"
            placeholder="e.g., 50.00"
            left={<TextInput.Icon icon="currency-usd" />}
            style={styles.input}
            textColor={theme.colors.onSurface}
          />

          <TextInput
            label="Note (Optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            placeholder="e.g., Grandparent's gift"
            style={styles.input}
            textColor={theme.colors.onSurface}
          />

          {children.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleSmall" style={{ marginBottom: spacing.sm }}>To Child</Text>
              <View style={styles.chipRow}>
                {children.map(child => (
                  <Chip
                    key={child.id}
                    selected={childId === child.id}
                    onPress={() => setChildId(child.id)}
                    style={styles.chip}
                    showSelectedOverlay
                  >
                    {child.avatar_emoji} {child.name}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {bucketTemplates.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleSmall" style={{ marginBottom: spacing.sm }}>Into Bucket</Text>
              <View style={styles.chipRow}>
                {bucketTemplates.map(bt => (
                  <Chip
                    key={bt.id}
                    selected={templateId === bt.id}
                    onPress={() => setTemplateId(bt.id)}
                    style={styles.chip}
                    showSelectedOverlay
                  >
                    {bt.emoji} {bt.name}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {(children.length === 0 || bucketTemplates.length === 0) && (
            <Text style={{ color: theme.colors.error, marginTop: spacing.md }}>
              You need to add both children and bucket templates first.
            </Text>
          )}

          {error && (
            <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={storeLoading}
            disabled={storeLoading || children.length === 0 || bucketTemplates.length === 0}
            style={styles.submitButton}
            contentStyle={{ paddingVertical: 8 }}
          >
            Deposit Gift
          </Button>
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xl },
  formContent: { gap: spacing.md },
  input: { marginBottom: spacing.xs },
  section: { marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { marginBottom: spacing.xs },
  submitButton: { marginTop: spacing.lg },
});
