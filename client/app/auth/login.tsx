import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../../constants/types';
import ScreenLayout from '../../components/ScreenLayout';
import TextInput from '../../components/TextInput';
import Button from '../../components/Button';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function Login() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mobileError, setMobileError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validate = () => {
        let valid = true;
        setMobileError('');
        setPasswordError('');

        if (!mobile.trim()) {
            setMobileError('Please enter your mobile number');
            valid = false;
        }
        if (!password.trim()) {
            setPasswordError('Please enter your password');
            valid = false;
        }

        return valid;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const data = await login(mobile, password);
            await AsyncStorage.setItem('token', data.token);
            await AsyncStorage.setItem('user', JSON.stringify(data.user));

            if (data.user.role === 'shopkeeper') {
                router.replace('/(shopkeeper)');
            } else {
                router.replace('/(buyer)');
            }
        } catch (error) {
            const apiError = error as ApiError;
            Alert.alert('Login Failed', apiError.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <Text style={[styles.header, { color: colors.text }]}>
                    Welcome Back
                </Text>
                <Text style={[styles.subheader, { color: colors.textSecondary }]}>
                    Sign in to continue
                </Text>

                <View style={styles.formContainer}>
                    <TextInput
                        label="Mobile Number"
                        placeholder="Enter your mobile number"
                        keyboardType="phone-pad"
                        value={mobile}
                        onChangeText={setMobile}
                        error={mobileError}
                    />

                    <TextInput
                        label="Password"
                        placeholder="Enter your password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        error={passwordError}
                    />

                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.linkContainer}>
        <Text style={[styles.linkText, { color: colors.textSecondary }]}>
          Do not have an account?
        </Text>
        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={[styles.link, { color: colors.tint }]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    header: {
        ...Typography.h1,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subheader: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    formContainer: {
        width: '100%',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    loginButton: {
        marginTop: Spacing.sm,
    },
    linkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    linkText: {
        ...Typography.bodySm,
    },
    link: {
        ...Typography.bodySm,
        fontWeight: '600',
    },
});
