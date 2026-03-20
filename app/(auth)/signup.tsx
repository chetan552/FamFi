import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { Link, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/constants/theme';

export default function SignUpScreen() {
  const theme = useTheme();
  const { signUp, loading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim()) return 'Please enter your email.';
    if (!email.includes('@')) return 'Please enter a valid email.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSignUp = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = await signUp(email.trim(), password, name.trim());
    if (result.error) {
      setError(result.error);
    }
    // Auth state change will handle navigation
  };

  return (
    <ScreenContainer centered>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🏦</Text>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            FamFi
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Your Family&apos;s Virtual Bank
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Your Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            autoCapitalize="words"
            textColor={theme.colors.onSurface}
          />

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

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            secureTextEntry={!showPassword}
            style={styles.input}
            textColor={theme.colors.onSurface}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            left={<TextInput.Icon icon="lock-check" />}
            secureTextEntry={!showPassword}
            style={styles.input}
            textColor={theme.colors.onSurface}
          />

          {error && (
            <HelperText type="error" visible={!!error} style={styles.error}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Create Account
          </Button>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md, lineHeight: 18 }}>
            By signing up, you agree to our{' '}
            <Text 
              style={{ color: theme.colors.primary, fontWeight: '600' }} 
              onPress={() => {
                import('expo-web-browser').then(wb => wb.openBrowserAsync('https://famfi.app/terms'));
              }}
            >Terms of Service</Text>
            {' '}and{' '}
            <Text 
              style={{ color: theme.colors.primary, fontWeight: '600' }} 
              onPress={() => {
                import('expo-web-browser').then(wb => wb.openBrowserAsync('https://famfi.app/privacy'));
              }}
            >Privacy Policy</Text>.
          </Text>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.primary, fontWeight: '600' }}
              >
                Sign In
              </Text>
            </Link>
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
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.sm,
  },
  input: {
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
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});
