import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, Chip, HelperText, Surface } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { RecurrencePeriod } from '@/types/database';

const RECURRENCE_OPTIONS: { label: string; value: RecurrencePeriod; icon: string }[] = [
  { label: 'Daily', value: 'daily', icon: 'calendar-today' },
  { label: 'Weekly', value: 'weekly', icon: 'calendar-week' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar-month' },
];

export default function NewChoreScreen() {
  const theme = useTheme();
  const { isWide } = useBreakpoint();
  const { showSuccess, showError } = useSnackbar();
  const { children, createChore, fetchFamily, loading: storeLoading } = useFamilyStore();
  const { defaultChoreAmount } = useSettingsStore();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState(defaultChoreAmount > 0 ? defaultChoreAmount.toFixed(2) : '');
  const [childId, setChildId] = useState<string | null>(children.length === 1 ? children[0].id : null);
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('weekly');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (children.length === 0) {
      fetchFamily();
    }
  }, [children.length, fetchFamily]);

  useEffect(() => {
    if (!childId && children.length === 1) {
      setChildId(children[0].id);
    }
  }, [childId, children]);

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
      <Stack.Screen options={{ title: 'New Chore', headerShown: false }} />

      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="clipboard-plus-outline" size={32} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={styles.headerText}>
          <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
            Create a Chore
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Assign a task, reward amount, due date, and repeat schedule.
          </Text>
        </View>
      </View>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.formContent}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="format-list-checks" size={20} color={theme.colors.primary} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Chore Details
            </Text>
          </View>

          <View style={[styles.fieldGrid, isWide ? styles.fieldGridWide : styles.fieldGridStacked]}>
            <TextInput
              label="Chore Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              placeholder="e.g., Wash the dishes"
              textColor={theme.colors.onSurface}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              style={[styles.input, isWide && styles.titleInput]}
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
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              style={[styles.input, isWide && styles.amountInput]}
            />
          </View>

          <TextInput
            label="Due Date (Optional)"
            value={dueDate}
            onChangeText={setDueDate}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            left={<TextInput.Icon icon="calendar" />}
            textColor={theme.colors.onSurface}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            style={styles.input}
          />

          {/* Assign To */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-child-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Assign To
              </Text>
            </View>
            {children.length === 0 ? (
              <Surface
                elevation={0}
                style={[
                  styles.emptyChildren,
                  { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={28} color={theme.colors.outline} />
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Add a child before creating chores.
                </Text>
              </Surface>
            ) : (
              <View style={styles.chipRow}>
                {children.map(child => (
                  <Chip
                    key={child.id}
                    selected={childId === child.id}
                    onPress={() => setChildId(child.id)}
                    showSelectedOverlay
                    selectedColor={theme.colors.onPrimaryContainer}
                    style={[
                      styles.personChip,
                      childId === child.id && { backgroundColor: theme.colors.primaryContainer },
                    ]}
                  >
                    {child.avatar_emoji} {child.name}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          {/* Recurring Toggle */}
          <View
            style={[
              styles.recurringPanel,
              { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.recurringToggleRow}>
              <View style={styles.recurringText}>
                <View style={styles.recurringLabelRow}>
                  <MaterialCommunityIcons name="repeat" size={20} color={isRecurring ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Recurring Chore
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                  Auto-creates a new copy after each approval.
                </Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
                thumbColor={isRecurring ? theme.colors.onPrimary : theme.colors.outline}
              />
            </View>

            {isRecurring && (
              <View style={[styles.chipRow, styles.recurrenceOptions]}>
                {RECURRENCE_OPTIONS.map(opt => (
                  <Chip
                    key={opt.value}
                    selected={recurrencePeriod === opt.value}
                    onPress={() => setRecurrencePeriod(opt.value)}
                    icon={opt.icon}
                    showSelectedOverlay
                    selectedColor={theme.colors.onPrimaryContainer}
                    style={[
                      styles.optionChip,
                      recurrencePeriod === opt.value && { backgroundColor: theme.colors.primaryContainer },
                    ]}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          {error && (
            <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
              {error}
            </HelperText>
          )}

          <View style={[styles.actionRow, isWide ? styles.actionRowWide : styles.actionRowStacked]}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={storeLoading}
              style={[styles.actionButton, isWide && styles.secondaryAction]}
              contentStyle={styles.actionContent}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={storeLoading}
              disabled={storeLoading || children.length === 0}
              icon="plus-circle"
              style={[styles.actionButton, isWide && styles.primaryAction]}
              contentStyle={styles.actionContent}
            >
              Create Chore
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: spacing.xs },
  headerTitle: { fontWeight: '800' },
  card: { marginBottom: spacing.xl },
  formContent: { gap: spacing.lg, paddingVertical: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontWeight: '800' },
  fieldGrid: { gap: spacing.md },
  fieldGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  fieldGridStacked: { flexDirection: 'column' },
  input: { backgroundColor: 'transparent' },
  titleInput: { flex: 1 },
  amountInput: { width: 220 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personChip: { borderRadius: 999 },
  optionChip: { borderRadius: 999 },
  emptyChildren: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recurringPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  recurringToggleRow: { flexDirection: 'row', alignItems: 'center' },
  recurringText: { flex: 1, paddingRight: spacing.md },
  recurringLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recurrenceOptions: { marginTop: spacing.xs },
  actionRow: { gap: spacing.md },
  actionRowWide: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  actionRowStacked: { flexDirection: 'column-reverse' },
  actionButton: { borderRadius: 999 },
  primaryAction: { minWidth: 180 },
  secondaryAction: { minWidth: 130 },
  actionContent: { paddingVertical: spacing.sm },
});
