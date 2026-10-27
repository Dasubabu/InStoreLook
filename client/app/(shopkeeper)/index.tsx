import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProducts } from '../../services/api';
import { User, Product } from '../../constants/types';

export default function ShopkeeperDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser: User = JSON.parse(userData);
                setUser(parsedUser);
                if (parsedUser.shop_id) {
                    const prods = await fetchProducts('', parsedUser.shop_id);
                    setProducts(prods);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleLogout = async () => {
        await AsyncStorage.clear();
        router.replace('/auth/login');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Shop Dashboard</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {!user?.shop_id ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>You have not set up a shop yet.</Text>
                        <TouchableOpacity style={styles.button} onPress={() => router.push('/(shopkeeper)/create-shop')}>
                            <Text style={styles.buttonText}>Create Shop</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>My Inventory</Text>
                            <Text>Total Products: {products.length}</Text>
                            <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={() => router.push('/(shopkeeper)/add-product')}>
                                <Text style={styles.buttonText}>+ Add New Product</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.productList}>
                            {products.map(p => (
                                <View key={p.id} style={styles.productItem}>
                                    <Text style={styles.productName}>{p.name}</Text>
                                    <Text style={styles.productStatus}>{p.stock_status}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50, // Safe area
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    logoutText: {
        color: 'red',
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    productList: {
        marginTop: 10,
    },
    productItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    productName: {
        fontSize: 16,
    },
    productStatus: {
        color: 'green', // or dynamic based on status
    },
});
