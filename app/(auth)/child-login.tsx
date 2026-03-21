import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme, Card } from 'react-native-paper';
import { router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/constants/theme';
import type { User } from '@/types/database';

export default function ChildLoginScreen() {
  const theme = useTheme();
  const { fetchChildrenByInvite, childLogin, loading } = useAuthStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState('');
  const [children, setChildren] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLookupFamily = async () => {
    setError(null);
    if (!inviteCode.trim()) {
      setError('Please enter your Family Link Code.');
      return;
    }

    const { data, error } = await fetchChildrenByInvite(inviteCode.trim());
    if (error) {
      setError(error);
      return;
    }

    if (!data || data.length === 0) {
      setError('No kids found for this family link code!');
      return;
    }

    setChildren(data);
    setStep(2);
  };

  const handleSelectChild = async (childId: string) => {
    setError(null);
    const result = await childLogin(inviteCode.trim(), childId);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <ScreenContainer centered>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text variant="displayMedium">🎮</Text>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            Kid Login
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {step === 1 ? "Enter your family link code." : "Who's playing?"}
          </Text>
        </View>

        {step === 1 ? (
          <View style={styles.form}>
            <TextInput
              label="Family Link Code"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              mode="outlined"
              left={<TextInput.Icon icon="link-variant" />}
              style={styles.input}
              autoCapitalize="characters"
              maxLength={6}
            />

            {error && (
              <HelperText type="error" visible={!!error} style={styles.error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleLookupFamily}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Find My Family
            </Button>

            <View style={styles.footer}>
              <Button mode="text" onPress={() => router.push('/(auth)/login')} textColor={theme.colors.onSurfaceVariant}>
                Wait, I'm a Parent
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {error && (
              <HelperText type="error" visible={!!error} style={styles.error}>
                {error}
              </HelperText>
            )}

            <View style={styles.childrenGrid}>
              {children.map((child) => (
                <Card 
                  key={child.id} 
                  style={styles.childCard} 
                  mode="elevated" 
                  onPress={() => handleSelectChild(child.id)}
                  disabled={loading}
                >
                  <Card.Content style={styles.childCardContent}>
                    <Text style={styles.childEmoji}>{child.avatar_emoji}</Text>
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                      {child.name}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </View>

            <View style={styles.footer}>
              <Button mode="text" onPress={() => setStep(1)} textColor={theme.colors.primary} disabled={loading}>
                Back
              </Button>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  title: {
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
    gap: spacing.sm,
  },
  input: {},
  error: {
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 16,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  gridContainer: {
    gap: spacing.md,
  },
  childrenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  childCard: {
    width: '45%',
    borderRadius: 16,
    padding: spacing.xs,
  },
  childCardContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  childEmoji: {
    fontSize: 48,
  },
});
