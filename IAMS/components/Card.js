import { View, Text, StyleSheet } from 'react-native';

/**
 * Reusable Card Component
 * Displays content in a styled card container
 */
export default function Card({
  children,
  title = null,
  style = {},
  contentStyle = {},
  elevation = 2,
  borderColor = null,
  borderLeftColor = null,
}) {
  return (
    <View
      style={[
        styles.card,
        {
          elevation,
          borderColor: borderColor || 'transparent',
          borderLeftColor: borderLeftColor || 'transparent',
          borderLeftWidth: borderLeftColor ? 4 : 0,
        },
        style,
      ]}
    >
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      <View style={[styles.cardContent, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'column',
  },
});
