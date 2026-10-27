import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export default function TextInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  style,
  inputStyle,
}: TextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, style] as ViewStyle[]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }] as TextStyle[]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error
              ? colors.error
              : isFocused
              ? colors.borderFocus
              : colors.border,
            backgroundColor: colors.background,
          },
        ] as ViewStyle[]}
      >
        <RNTextInput
          style={[styles.input, { color: colors.text }, inputStyle] as TextStyle[]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.passwordToggle as ViewStyle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text
              style={[styles.toggleText, { color: colors.textSecondary }] as TextStyle[]}
            >
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text
          style={[styles.errorText, { color: colors.error }] as TextStyle[]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  label: {
    ...Typography.bodySm,
    fontWeight: '600' as const,
    marginBottom: Spacing.xs,
  } as TextStyle,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Spacing.md,
  } as TextStyle,
  passwordToggle: {
    padding: Spacing.sm,
  } as ViewStyle,
  toggleText: {
    ...Typography.bodySm,
    fontWeight: '500' as const,
  } as TextStyle,
  errorText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  } as TextStyle,
});
