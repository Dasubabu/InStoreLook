import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { createShop } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { User } from '../../constants/types';

export default function CreateShop() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name || !address) {
            Alert.alert('Error', 'Name and Address are required');
            return;
        }
        setLoading(true);
        try {
            // Get user ID
            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                Alert.alert('Error', 'User not found');
                return;
            }
            const user: User = JSON.parse(userData);

            // Mock Location or Get Real
            let lat = 0, lng = 0;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    lat = loc.coords.latitude;
                    lng = loc.coords.longitude;
                }
            } catch (e) {
                console.log("Location denied or error", e);
            }

            const result = await createShop({
                owner_id: user.id,
                name,
                address,
                description: desc,
                latitude: lat,
                longitude: lng
            });

            // Update local user data with shop_id
            const updatedUser: User = { ...user, shop_id: result.shopId };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            Alert.alert('Success', 'Shop Created!');
            // Replace the current screen with shopkeeper dashboard so back button doesn't return to create shop
            router.replace('/(shopkeeper)');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to create shop';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Create Your Shop</Text>

            <TextInput
                style={styles.input}
                placeholder="Shop Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Address"
                value={address}
                onChangeText={setAddress}
                multiline
            />

            <TextInput
                style={styles.input}
                placeholder="Description (Optional)"
                value={desc}
                onChangeText={setDesc}
                multiline
            />

            <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Shop</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
