import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const baseColor = theme.dark ? '#ffffff' : '#000000';

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: baseColor, opacity },
        style,
      ]}
    />
  );
}

export function ChildCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <SkeletonBox width={56} height={56} borderRadius={28} />
      <View style={skeletonStyles.info}>
        <SkeletonBox width="60%" height={16} borderRadius={8} />
        <SkeletonBox width="40%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={64} height={28} borderRadius={8} />
    </View>
  );
}

export function ChoreCardSkeleton() {
  return (
    <View style={skeletonStyles.choreCard}>
      <View style={skeletonStyles.info}>
        <SkeletonBox width="70%" height={16} borderRadius={8} />
        <SkeletonBox width="40%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
        <SkeletonBox width="50%" height={10} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={48} height={32} borderRadius={8} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    marginBottom: 8,
  },
  choreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    marginBottom: 10,
  },
  info: { flex: 1 },
});
