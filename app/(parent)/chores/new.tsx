import React, { useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, Chip, HelperText } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import type { RecurrencePeriod } from '@/types/database';

const RECURRENCE_OPTIONS: { label: string; value: RecurrencePeriod; icon: string }[] = [
  { label: 'Daily', value: 'daily', icon: 'calendar-today' },
  { label: 'Weekly', value: 'weekly', icon: 'calendar-week' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar-month' },
];

export default function NewChoreScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const { children, createChore, loading: storeLoading } = useFamilyStore();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [childId, setChildId] = useState<string | null>(children.length === 1 ? children[0].id : null);
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('weekly');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) return setError('Please enter a chore title.');
    if (!value || isNaN(Number(value))) return setError('Please enter a valid amount.');
    if (!childId) return setError('Please select a child to assign this chore to.');

    let parsedDate: string | null = null;
    if (dueDate.trim()) {
      const d = new Date(dueDate.trim());
      if (isNaN(d.getTime())) return setError('Please enter a valid date as YYYY-MM-DD.');
      parsedDate = dueDate.trim();
    }

    const { error: saveError } = await createChore(
      childId,
      title.trim(),
      parseFloat(value),
      parsedDate,
      isRecurring,
      isRecurring ? recurrencePeriod : null
    );

    if (saveError) {
      setError(saveError);
      showError(saveError);
    } else {
      showSuccess(`Chore created${isRecurring ? ' (repeats ' + recurrencePeriod + ')' : ''}! 🎯`);
      router.back();
    }
  };

  return (
    <ScreenContainer scrollable>
      <Stack.Screen options={{ title: 'New Chore', headerShown: true }} />

      <Text variant="headlineMedium" style={{ fontWeight: '700', marginBottom: spacing.lg }}>
        Create a Chore
      </Text>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.formContent}>

          <TextInput
            label="Chore Title"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            placeholder="e.g., Wash the dishes"
            textColor={theme.colors.onSurface}
          />

          <TextInput
            label="Reward Value ($)"
            value={value}
            onChangeText={setValue}
            mode="outlined"
            keyboardType="decimal-pad"
            placeholder="e.g., 5.00"
            left={<TextInput.Icon icon="currency-usd" />}
            textColor={theme.colors.onSurface}
          />

          <TextInput
            label="Due Date — YYYY-MM-DD (Optional)"
            value={dueDate}
            onChangeText={setDueDate}
            mode="outlined"
            placeholder="e.g. 2025-12-31"
            left={<TextInput.Icon icon="calendar" />}
            textColor={theme.colors.onSurface}
          />

          {/* Assign To */}
          <View>
            <Text variant="titleSmall" style={{ marginBottom: spacing.sm }}>Assign To</Text>
            {children.length === 0 ? (
              <Text style={{ color: theme.colors.error }}>You need to add children to your family first.</Text>
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

          {/* Recurring Toggle */}
          <Card mode="outlined" style={styles.recurringCard}>
            <Card.Content>
              <View style={styles.recurringToggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.recurringLabelRow}>
                    <MaterialCommunityIcons name="repeat" size={20} color={isRecurring ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                    <Text variant="titleSmall" style={{ fontWeight: '700', marginLeft: spacing.sm }}>
                      Recurring Chore
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    Auto-creates a new copy after each approval
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>

              {isRecurring && (
                <View style={[styles.chipRow, { marginTop: spacing.md }]}>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <Chip
                      key={opt.value}
                      selected={recurrencePeriod === opt.value}
                      onPress={() => setRecurrencePeriod(opt.value)}
                      icon={opt.icon}
                      showSelectedOverlay
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>

          {error && (
            <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={storeLoading}
            disabled={storeLoading || children.length === 0}
            contentStyle={{ paddingVertical: 8 }}
          >
            Create Chore
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={storeLoading}
          >
            Cancel
          </Button>
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xl },
  formContent: { gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recurringCard: { borderRadius: 12 },
  recurringToggleRow: { flexDirection: 'row', alignItems: 'center' },
  recurringLabelRow: { flexDirection: 'row', alignItems: 'center' },
});
