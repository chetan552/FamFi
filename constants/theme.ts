import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Custom color palette — warm, family-friendly
const palette = {
  // Primary: soft teal-blue
  primary: '#2B9EB3',
  primaryLight: '#5CC8DB',
  primaryDark: '#1A7A8A',
  onPrimary: '#FFFFFF',

  // Secondary: warm amber
  secondary: '#F5A623',
  secondaryLight: '#FFCA61',
  secondaryDark: '#C77E00',
  onSecondary: '#FFFFFF',

  // Tertiary: soft coral
  tertiary: '#E85D75',
  tertiaryLight: '#FF8FA2',
  tertiaryDark: '#B3344D',

  // Success / Error
  success: '#4CAF50',
  error: '#E53935',

  // Backgrounds
  background: '#F8FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF4F6',

  // Text
  text: '#1A2E35',
  textSecondary: '#5A7A85',
  textDisabled: '#9DB5BE',

  // Misc
  outline: '#C5D8DE',
  divider: '#E4EEF1',
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    primaryContainer: palette.primaryLight,
    onPrimaryContainer: palette.primaryDark,
    secondary: palette.secondary,
    onSecondary: palette.onSecondary,
    secondaryContainer: palette.secondaryLight,
    onSecondaryContainer: palette.secondaryDark,
    tertiary: palette.tertiary,
    tertiaryContainer: palette.tertiaryLight,
    onTertiaryContainer: palette.tertiaryDark,
    background: palette.background,
    onBackground: palette.text,
    surface: palette.surface,
    onSurface: palette.text,
    surfaceVariant: palette.surfaceVariant,
    onSurfaceVariant: palette.textSecondary,
    outline: palette.outline,
    error: palette.error,
    onError: '#FFFFFF',
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4DD0E1', // Brighter teal for dark
    onPrimary: '#00353E',
    primaryContainer: '#006064',
    onPrimaryContainer: '#B2EBF2',
    secondary: '#FFCC80', // Brighter amber for dark
    onSecondary: '#4A3200',
    secondaryContainer: '#6B4A00',
    onSecondaryContainer: '#FFE0B2',
    tertiary: '#FF8A9B', // Brighter coral for dark
    tertiaryContainer: '#880E2F',
    onTertiaryContainer: '#FFD1D9',
    background: '#0D1B1F', // Slightly deeper but still blue-tinted dark
    onBackground: '#E1E9EC',
    surface: '#15262C',
    onSurface: '#E1E9EC',
    surfaceVariant: '#22383F',
    onSurfaceVariant: '#B0C4CC', // More contrast than before
    outline: '#6D8A94',
    error: '#FF8A8A',
    onError: '#600000',
  },
};

export { palette };

// Responsive breakpoints
export const breakpoints = {
  sm: 480,   // large phone landscape
  md: 768,   // tablet / small desktop
  lg: 1024,  // desktop
  xl: 1280,  // wide desktop
} as const;

// Max content width — content never stretches past this on large screens
export const contentMaxWidth = 960;

// Sidebar width used on web desktop layout
export const sidebarWidth = 240;

// Spacing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Common emoji options for avatars
export const avatarEmojis = [
  '😊', '😎', '🤩', '🥳', '😇',
  '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐸', '🐵', '🦄', '🐯', '🐶',
  '🌟', '🌈', '🚀', '⭐', '💎',
];

// Preset colors for bucket templates
export const bucketColors = [
  '#2B9EB3', // teal
  '#4CAF50', // green
  '#F5A623', // amber
  '#E85D75', // coral
  '#7C4DFF', // purple
  '#FF7043', // deep orange
  '#26A69A', // teal-green
  '#5C6BC0', // indigo
  '#EC407A', // pink
  '#42A5F5', // blue
];

// Default bucket template suggestions
export const defaultBucketSuggestions = [
  { name: 'Savings', emoji: '💰', color: '#4CAF50' },
  { name: 'Fun Money', emoji: '🎮', color: '#7C4DFF' },
  { name: 'Giving', emoji: '🎁', color: '#E85D75' },
];
