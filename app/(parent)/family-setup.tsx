import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, HelperText, Card, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { spacing } from '@/constants/theme';

export default function FamilySetupScreen() {
  const theme = useTheme();
  const { createFamily, joinFamily, family, loading } = useFamilyStore();
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleCreate = async () => {
    setError(null);
    if (!familyName.trim()) {
      setError('Please enter a family name.');
      return;
    }

    const result = await createFamily(familyName.trim());
    if (result.error) {
      setError(result.error);
    }
  };

  const handleJoin = async () => {
    setError(null);
    if (!inviteCode.trim() || inviteCode.trim().length < 6) {
      setError('Please enter a valid 6-character invite code.');
      return;
    }

    const result = await joinFamily(inviteCode.trim());
    if (result.error) {
      setError(result.error);
    }
  };

  const handleContinue = () => {
    router.push('/(parent)/add-children');
  };

  // If family already exists, show it with the invite code
  if (family) {
    return (
      <ScreenContainer centered>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.celebration}>🎉</Text>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Family Created!
            </Text>
          </View>

          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.cardContent}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Family Name
              </Text>
              <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
                {family.name}
              </Text>
            </Card.Content>
          </Card>

          <View style={styles.successMessage}>
            <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              Your family bank is ready. Now let's add your children to get started with chores and savings!
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="arrow-right"
          >
            Add Children
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer centered>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>👨‍👩‍👧‍👦</Text>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Set Up Your Family
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Give your family bank a name to get started
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.tabContainer}>
            <Button 
              mode={mode === 'create' ? 'contained' : 'text'} 
              onPress={() => { setMode('create'); setError(null); }}
              style={styles.tabButton}
            >
              Create New
            </Button>
            <Button 
              mode={mode === 'join' ? 'contained' : 'text'} 
              onPress={() => { setMode('join'); setError(null); }}
              style={styles.tabButton}
            >
              Join Existing
            </Button>
          </View>

          {mode === 'create' ? (
            <>
              <TextInput
                label="Family Name"
                value={familyName}
                onChangeText={setFamilyName}
                mode="outlined"
                left={<TextInput.Icon icon="home-heart" />}
                placeholder="e.g. The Smiths"
                style={styles.input}
                textColor={theme.colors.onSurface}
              />
              <Button
                mode="contained"
                onPress={handleCreate}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Create Family
              </Button>
            </>
          ) : (
            <>
              <TextInput
                label="Invite Code"
                value={inviteCode}
                onChangeText={setInviteCode}
                mode="outlined"
                left={<TextInput.Icon icon="key" />}
                placeholder="6-character code"
                autoCapitalize="characters"
                maxLength={6}
                style={styles.input}
                textColor={theme.colors.onSurface}
              />
              <Button
                mode="contained"
                onPress={handleJoin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Join Family
              </Button>
            </>
          )}

          {error && (
            <HelperText type="error" visible={!!error} style={{ textAlign: 'center' }}>
              {error}
            </HelperText>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  celebration: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: 'transparent',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
  },
  card: {
    marginBottom: spacing.md,
  },
  successMessage: {
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  cardContent: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
    flexDirection: 'row-reverse',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
