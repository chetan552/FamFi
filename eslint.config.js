// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      '.next/**',
      '.vercel/**',
      'dist/**',
      'client_flutter/**',
      'legacy-expo-app/**',
      'supabase/functions/**',
      'components/ui/**',
      'hooks/**',
      'store/**',
      'lib/supabase.ts',
      'lib/googleTasks.ts',
      'lib/googleTasksSync.ts',
      'lib/notifications.ts',
    ],
  },
  expoConfig,
]);
