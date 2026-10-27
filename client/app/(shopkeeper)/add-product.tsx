import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../constants/types';

export default function AddProduct() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!name || !price) {
            Alert.alert('Error', 'Name and Price are required');
            return;
        }
        setLoading(true);
        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                Alert.alert('Error', 'User not found');
                return;
            }
            const user: User = JSON.parse(userData);

            if (!user.shop_id) {
                Alert.alert('Error', 'You need a shop first');
                return;
            }

            await api.post('/products', {
                shop_id: user.shop_id,
                name,
                price: parseFloat(price),
                category,
                stock_status: 'Available',
                description: '',
                image_url: 'https://via.placeholder.com/150'
            });

            Alert.alert('Success', 'Product Added');
            router.back();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to add product';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Add New Product</Text>

            <TextInput
                style={styles.input}
                placeholder="Product Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Price"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
            />

            <TextInput
                style={styles.input}
                placeholder="Category (e.g. Shirt, Saree)"
                value={category}
                onChangeText={setCategory}
            />

            <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add Product</Text>}
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
