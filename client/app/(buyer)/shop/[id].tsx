import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api, { fetchProducts } from '../../../services/api';
import { Shop, Product, FetchShopsResponse } from '../../../constants/types';

export default function ShopDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        const shopId = Array.isArray(id) ? id[0] : id;
        if (shopId) {
            // Fetch specific shop details (mock implementation for single shop fetch: finding from list or adding endpoint)
            // For MVP, we'll just fetch all shops and find, or assume we pass data. 
            // Better: Fetch shops list and filter, or add single shop endpoint.
            // Let's rely on list logic from api for now, assuming we fetched it.
            // Actually, let's just make a quick endpoint call if we were rigorous, but for speed, 
            // I will assume I can fetch all and find it, OR add GET /shops/:id

            // Let's add GET /shops/:id logic to backend? 
            // Or simpler: fetchShops().find().
            api.get<FetchShopsResponse>('/shops').then(res => {
                const found = res.data.shops.find((s: Shop) => s.id === Number(shopId));
                setShop(found || null);
            });

            fetchProducts('', Number(shopId)).then(setProducts);
        }
    }, [id]);

    const openMap = () => {
        if (shop) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
            Linking.openURL(url);
        }
    };

    if (!shop) return <Text style={{ padding: 20 }}>Loading...</Text>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{shop.name}</Text>
                <Text style={styles.address}>{shop.address}</Text>
                <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                    <Text style={styles.mapButtonText}>Get Directions</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Items</Text>
                <View style={styles.grid}>
                    {products.map(p => (
                        <View key={p.id} style={styles.productCard}>
                            <View style={styles.placeholderImg} />
                            <Text style={styles.productName}>{p.name}</Text>
                            <Text style={styles.productPrice}>₹{p.price}</Text>
                            <Text style={styles.stock}>{p.stock_status}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    address: {
        color: '#666',
        marginTop: 5,
        marginBottom: 15,
    },
    mapButton: {
        backgroundColor: '#34A853', // Google Maps Green
        padding: 10,
        borderRadius: 5,
        alignSelf: 'flex-start',
    },
    mapButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    productCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    placeholderImg: {
        height: 100,
        backgroundColor: '#ddd',
        borderRadius: 5,
        marginBottom: 5,
    },
    productName: {
        fontWeight: 'bold',
    },
    productPrice: {
        color: '#007AFF',
    },
    stock: {
        fontSize: 12,
        color: 'green',
    },
});
