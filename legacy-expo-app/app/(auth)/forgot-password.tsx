import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { Link, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/constants/theme';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { resetPassword, loading } = useAuthStore();
  const { showSuccess } = useSnackbar();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const result = await resetPassword(email.trim());
    if (result.error) {
      setError(result.error);
    } else {
      showSuccess('If an account exists, a reset link has been sent to your email.');
      router.back();
    }
  };

  return (
    <ScreenContainer centered>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text variant="displayMedium">🔐</Text>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
            Reset Password
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Enter your email to receive a password reset link.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            textColor={theme.colors.onSurface}
          />

          {error && (
            <HelperText type="error" visible={!!error} style={styles.error}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Send Reset Link
          </Button>

          <View style={styles.footer}>
            <Button
              mode="text"
              onPress={() => router.back()}
              textColor={theme.colors.primary}
            >
              Back to Sign In
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    textAlign: 'center',
  },
  title: {
    fontWeight: '800',
    marginTop: spacing.md,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  form: {
    gap: spacing.sm,
  },
  input: {},
  error: {
    paddingHorizontal: 0,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
