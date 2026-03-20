import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { Link, router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/constants/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    const result = await signIn(email.trim(), password);
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
          <Text style={styles.logo}>🏦</Text>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            FamFi
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Welcome back!
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

          {error && (
            <HelperText type="error" visible={!!error} style={styles.error}>
              {error}
            </HelperText>
          )}

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/forgot-password')}
            textColor={theme.colors.primary}
            style={{ alignSelf: 'flex-end', marginTop: -spacing.sm }}
            labelStyle={{ fontSize: 13 }}
            compact
          >
            Forgot Password?
          </Button>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Sign In
          </Button>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.primary, fontWeight: '600' }}
              >
                Sign Up
              </Text>
            </Link>
          </View>

          <View style={[styles.footer, { marginTop: spacing.md }]}>
            <Button
              mode="contained-tonal"
              onPress={() => router.push('/(auth)/child-login')}
              icon="face-man-profile"
              style={{ borderRadius: 12, width: '100%' }}
              contentStyle={{ paddingVertical: 6 }}
            >
              I'm a Kid
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
