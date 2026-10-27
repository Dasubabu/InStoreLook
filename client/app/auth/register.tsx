import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { register, login } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../../constants/types';
import ScreenLayout from '../../components/ScreenLayout';
import TextInput from '../../components/TextInput';
import Button from '../../components/Button';
import RoleSelector from '../../components/RoleSelector';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function Register() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'buyer' | 'shopkeeper'>('buyer');
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

    const handleRegister = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await register(mobile, password, role);
            const loginData = await login(mobile, password);
            await AsyncStorage.setItem('token', loginData.token);
            await AsyncStorage.setItem('user', JSON.stringify(loginData.user));

            Alert.alert('Success', 'Registered successfully!');

            if (loginData.user.role === 'shopkeeper') {
                router.replace('/(shopkeeper)');
            } else {
                router.replace('/(buyer)');
            }
        } catch (error) {
            const apiError = error as ApiError;
            Alert.alert('Registration Failed', apiError.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <Text style={[styles.header, { color: colors.text }]}>
                    Create Account
                </Text>
                <Text style={[styles.subheader, { color: colors.textSecondary }]}>
                    Join InStoreLook to start shopping or selling
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
                        placeholder="Create a password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        error={passwordError}
                    />

                    <RoleSelector
                        selectedRole={role}
                        onRoleSelect={setRole}
                    />

                    <Button
                        title="Create Account"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.registerButton}
                    />
                </View>

                <View style={styles.linkContainer}>
                    <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                        Already have an account?
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/auth/login')}>
                        <Text style={[styles.link, { color: colors.tint }]}>
                            Sign In
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
    registerButton: {
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
