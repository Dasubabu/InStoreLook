import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        size === 'lg' ? styles.lg : styles.md,
        disabled || loading ? styles.disabled : null,
        style,
      ] as ViewStyle[]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.white : colors.tint}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary ? styles.primaryText : styles.secondaryText,
            textStyle,
          ] as TextStyle[]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.sm as ViewStyle),
  } as ViewStyle,
  primary: {
    backgroundColor: Colors.light.tint,
  } as ViewStyle,
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  lg: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  md: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  text: {
    ...Typography.button,
  } as TextStyle,
  primaryText: {
    color: Colors.light.white,
  } as TextStyle,
  secondaryText: {
    color: Colors.light.tint,
  } as TextStyle,
});
