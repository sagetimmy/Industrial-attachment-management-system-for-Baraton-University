import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';

/**
 * Reusable Button Component
 * Supports multiple variants and loading states
 */
export default function Button({
  label,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'success'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  icon = null,
  colors = {},
}) {
  const primaryColor = colors.primary || '#C87941';
  const white = colors.white || '#FFFFFF';
  const gray = colors.gray || '#CCCCCC';

  const variants = {
    primary: {
      backgroundColor: primaryColor,
      textColor: white,
    },
    secondary: {
      backgroundColor: '#1E3A5F',
      textColor: white,
    },
    danger: {
      backgroundColor: '#C62828',
      textColor: white,
    },
    success: {
      backgroundColor: '#2E7D32',
      textColor: white,
    },
    outline: {
      backgroundColor: 'transparent',
      textColor: primaryColor,
      borderColor: primaryColor,
    },
  };

  const sizes = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 12,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      fontSize: 14,
    },
    large: {
      paddingVertical: 15,
      paddingHorizontal: 30,
      fontSize: 16,
    },
  };

  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.medium;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? gray : variantStyle.backgroundColor,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderColor: variantStyle.borderColor || 'transparent',
          borderWidth: variantStyle.borderColor ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text
            style={[
              styles.text,
              {
                color: variantStyle.textColor,
                fontSize: sizeStyle.fontSize,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
    fontSize: 16,
  },
});
