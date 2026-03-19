import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { bucketColors, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
  colors?: string[];
}

/**
 * A row of color swatches for picking a bucket template color.
 */
export default function ColorPicker({
  selected,
  onSelect,
  colors = bucketColors,
}: ColorPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {colors.map((color) => {
        const isSelected = color === selected;
        return (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            style={[
              styles.swatch,
              { backgroundColor: color },
              isSelected && {
                borderColor: theme.colors.onBackground,
                borderWidth: 3,
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
