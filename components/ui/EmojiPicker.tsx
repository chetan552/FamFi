import React from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '@/constants/theme';
import { avatarEmojis } from '@/constants/theme';

interface EmojiPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
  emojis?: string[];
  columns?: number;
}

/**
 * A grid of emojis for picking an avatar or bucket icon.
 */
export default function EmojiPicker({
  selected,
  onSelect,
  emojis = avatarEmojis,
  columns = 5,
}: EmojiPickerProps) {
  const theme = useTheme();

  return (
    <FlatList
      data={emojis}
      numColumns={columns}
      scrollEnabled={false}
      keyExtractor={(item) => item}
      contentContainerStyle={styles.grid}
      renderItem={({ item }) => {
        const isSelected = item === selected;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            style={[
              styles.emojiCell,
              isSelected && {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text style={styles.emoji}>{item}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  emojiCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    margin: 2,
  },
  emoji: {
    fontSize: 28,
  },
});
