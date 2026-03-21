import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

const ONBOARDING_DATA = [
  {
    key: '1',
    title: 'Welcome to FamFi',
    description: 'Empower your kids with lifelong financial literacy through fun, engaged family banking.',
    emoji: '🚀',
  },
  {
    key: '2',
    title: 'Track Allowance',
    description: 'Set up chores, approve payouts, and watch their savings grow automatically.',
    emoji: '💵',
  },
  {
    key: '3',
    title: 'Grow With Interest',
    description: 'Teach compound interest by setting up parent-matched savings buckets.',
    emoji: '📈',
  },
  {
    key: '4',
    title: 'Financial Responsibility',
    description: 'Help your children understand the value of money by giving them ownership of their savings and spending decisions.',
    emoji: '🎯',
  },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width, 600);
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setHasSeenOnboarding } = useSettingsStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setHasSeenOnboarding(true);
    router.replace('/(auth)/login');
  };

  const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => {
    return (
      <View style={[styles.slide, { width: slideWidth }]}>
        <View style={[styles.imageContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>
        <Text 
          variant="headlineMedium" 
          style={[styles.title, { color: theme.colors.primary }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer centered scrollable={false}>
      <View style={styles.container}>
        <FlatList
          style={{ flex: 1 }}
          ref={flatListRef}
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          initialNumToRender={3}
          windowSize={5}
          getItemLayout={(_, index) => ({
            length: slideWidth,
            offset: slideWidth * index,
            index,
          })}
        />

        <View style={styles.footer}>
          <View style={styles.indicatorContainer}>
            {ONBOARDING_DATA.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  { backgroundColor: index === currentIndex ? theme.colors.primary : theme.colors.surfaceVariant },
                  index === currentIndex && { width: 24 }, // Active dot is wider
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            {currentIndex < ONBOARDING_DATA.length - 1 ? (
              <>
                <Button mode="text" onPress={handleFinish} style={styles.skipButton} textColor={theme.colors.onSurfaceVariant}>
                  Skip
                </Button>
                <Button mode="contained" onPress={handleNext} style={styles.nextButton}>
                  Next
                </Button>
              </>
            ) : (
              <Button mode="contained" onPress={handleFinish} style={styles.getStartedButton}>
                Let's Get Started!
              </Button>
            )}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 24,
  },
  footer: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nextButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  getStartedButton: {
    flex: 1,
    paddingVertical: 4,
  },
});
