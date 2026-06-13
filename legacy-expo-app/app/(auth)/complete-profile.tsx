import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function CompleteProfileScreen() {
  const theme = useTheme();
  const { authUser, completeProfile, loading } = useAuthStore();
  const suggestedName = useMemo(() => {
    const metadata = authUser?.user_metadata ?? {};
    return (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? '';
  }, [authUser?.user_metadata]);

  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }

    setError(null);
    const result = await completeProfile(trimmed);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/(parent)/family-setup');
  };

  return (
    <ScreenContainer centered>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.content}>
            <Text style={styles.wave}>👋</Text>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Almost There
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              What should we call you?
            </Text>

            <TextInput
              label="Your Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" />}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              style={styles.input}
            />

            {error && (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleContinue}
              loading={loading}
              disabled={loading}
              contentStyle={styles.buttonContent}
              style={styles.button}
            >
              Continue
            </Button>
          </Card.Content>
        </Card>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 24,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  wave: {
    fontSize: 56,
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    marginTop: spacing.sm,
  },
  error: {
    paddingHorizontal: 0,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
