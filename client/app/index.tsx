import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenLayout from '../components/ScreenLayout';
import Button from '../components/Button';
import { Colors, Spacing, Typography, Shadows } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScreenLayout>
      <View style={styles.container as ViewStyle}>
        <Text style={[styles.logo, { color: colors.tint }] as TextStyle[]}>
          InStoreLook
        </Text>

        <Text style={[styles.tagline, { color: colors.text }] as TextStyle[]}>
          Find it nearby. Buy it locally.
        </Text>

        <Text
          style={[
            styles.description,
            { color: colors.textSecondary },
          ] as TextStyle[]}
        >
          Discover products available in local stores before you step outside.
        </Text>

        <View style={styles.benefitsContainer as ViewStyle}>
          <View
            style={[
              styles.benefitCard,
              { backgroundColor: colors.backgroundSecondary, ...(Shadows.sm as ViewStyle) },
            ] as ViewStyle[]}
          >
            <Text
              style={[styles.benefitTitle, { color: colors.text }] as TextStyle[]}
            >
              For Buyers
            </Text>
            <Text
              style={[
                styles.benefitText,
                { color: colors.textSecondary },
              ] as TextStyle[]}
            >
              Explore local shops and find products you need
            </Text>
          </View>

          <View
            style={[
              styles.benefitCard,
              { backgroundColor: colors.backgroundSecondary, ...(Shadows.sm as ViewStyle) },
            ] as ViewStyle[]}
          >
            <Text
              style={[styles.benefitTitle, { color: colors.text }] as TextStyle[]}
            >
              For Shopkeepers
            </Text>
            <Text
              style={[
                styles.benefitText,
                { color: colors.textSecondary },
              ] as TextStyle[]}
            >
              Showcase your products and manage your inventory
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer as ViewStyle}>
          <Button
            title="Get Started"
            onPress={() => router.push('/auth/register')}
            variant="primary"
            size="lg"
          />
          <Button
            title="Sign In"
            onPress={() => router.push('/auth/login')}
            variant="secondary"
            size="lg"
          />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  } as ViewStyle,
  logo: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  } as TextStyle,
  tagline: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  } as TextStyle,
  description: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  } as TextStyle,
  benefitsContainer: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  } as ViewStyle,
  benefitCard: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: 12,
  } as ViewStyle,
  benefitTitle: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  } as TextStyle,
  benefitText: {
    ...Typography.bodySm,
  } as TextStyle,
  buttonContainer: {
    width: '100%',
    gap: Spacing.md,
  } as ViewStyle,
});
