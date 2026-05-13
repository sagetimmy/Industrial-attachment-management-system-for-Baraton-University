import { View, Text, StyleSheet } from 'react-native';

/**
 * Reusable Status Badge Component
 * Shows status with appropriate color
 */
export default function StatusBadge({
  status = 'pending',
  size = 'medium',
  style = {},
}) {
  const statusStyles = {
    pending: {
      backgroundColor: '#FFF3E0',
      textColor: '#C87941',
    },
    ongoing: {
      backgroundColor: '#E8F5E9',
      textColor: '#2E7D32',
    },
    completed: {
      backgroundColor: '#E3F2FD',
      textColor: '#1E3A5F',
    },
    approved: {
      backgroundColor: '#E8F5E9',
      textColor: '#2E7D32',
    },
    rejected: {
      backgroundColor: '#FFEBEE',
      textColor: '#C62828',
    },
    default: {
      backgroundColor: '#F4F4F4',
      textColor: '#CCCCCC',
    },
  };

  const sizeStyles = {
    small: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 11,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 13,
    },
    large: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
    },
  };

  const badgeStyle = statusStyles[status] || statusStyles.default;
  const sizeStyle = sizeStyles[size] || sizeStyles.medium;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeStyle.backgroundColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: badgeStyle.textColor,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
