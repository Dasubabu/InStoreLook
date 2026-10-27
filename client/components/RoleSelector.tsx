import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

type Role = 'buyer' | 'shopkeeper';

interface RoleSelectorProps {
  selectedRole: Role;
  onRoleSelect: (role: Role) => void;
}

export default function RoleSelector({
  selectedRole,
  onRoleSelect,
}: RoleSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const roles = [
    {
      value: 'buyer' as Role,
      title: 'I am a Buyer',
      description: 'Discover products in local stores near you',
    },
    {
      value: 'shopkeeper' as Role,
      title: 'I am a Shopkeeper',
      description: 'List your products and manage your inventory',
    },
  ];

  return (
    <View style={styles.container as ViewStyle}>
      {roles.map((role) => {
        const isSelected = selectedRole === role.value;
        return (
          <TouchableOpacity
            key={role.value}
            style={[
              styles.roleButton,
              {
                borderColor: isSelected ? colors.tint : colors.border,
                backgroundColor: isSelected
                  ? `${colors.tint}10`
                  : colors.background,
                ...(Shadows.sm as ViewStyle),
              },
            ] as ViewStyle[]}
            onPress={() => onRoleSelect(role.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.roleTitle,
                { color: isSelected ? colors.tint : colors.text },
              ] as TextStyle[]}
            >
              {role.title}
            </Text>
            <Text
              style={[
                styles.roleDescription,
                { color: colors.textSecondary },
              ] as TextStyle[]}
            >
              {role.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.md,
  } as ViewStyle,
  roleButton: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  } as ViewStyle,
  roleTitle: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  } as TextStyle,
  roleDescription: {
    ...Typography.bodySm,
  } as TextStyle,
});
