import 'package:flutter/material.dart';

const List<String> avatarEmojis = [
  '😊', '😎', '🤩', '🥳', '😇',
  '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐸', '🐵', '🦄', '🐯', '🐶',
  '🌟', '🌈', '🚀', '⭐', '💎',
];

class EmojiPicker extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelect;
  final List<String> emojis;
  final int columns;

  const EmojiPicker({
    super.key,
    required this.selected,
    required this.onSelect,
    this.emojis = avatarEmojis,
    this.columns = 5,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
      ),
      itemCount: emojis.length,
      itemBuilder: (context, index) {
        final emoji = emojis[index];
        final isSelected = emoji == selected;

        return InkWell(
          onTap: () => onSelect(emoji),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: BoxDecoration(
              color: isSelected ? theme.colorScheme.primaryContainer : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? theme.colorScheme.primary : Colors.transparent,
                width: 2,
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              emoji,
              style: const TextStyle(fontSize: 28),
            ),
          ),
        );
      },
    );
  }
}
