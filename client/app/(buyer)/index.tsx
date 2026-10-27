import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchShops, fetchProducts } from '../../services/api';
import { Shop, Product } from '../../constants/types';

type ResultItem = Shop | Product;

export default function BuyerHome() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]); // Can be shops or products
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'shops' | 'products'>('shops'); // 'shops' or 'products'

    const handleSearch = useCallback(async () => {
        setLoading(true);
        try {
            if (mode === 'shops') {
                const data = await fetchShops(search);
                setResults(data);
            } else {
                const data = await fetchProducts(search);
                setResults(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [mode, search]);

    useEffect(() => {
        handleSearch();
    }, [mode, handleSearch]); // Re-search when mode changes

    const handleLogout = async () => {
        await AsyncStorage.clear();
        router.replace('/auth/login');
    };

    const renderItem = ({ item }: { item: ResultItem }) => {
        if (mode === 'shops') {
            const shop = item as Shop;
            return (
                <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/(buyer)/shop/${shop.id}`)}>
                    <Text style={styles.itemName}>{shop.name}</Text>
                    <Text style={styles.itemSub}>{shop.address}</Text>
                    <Text style={styles.itemDesc}>{shop.description}</Text>
                </TouchableOpacity>
            );
        } else {
            const product = item as Product;
            return (
                <TouchableOpacity style={styles.itemCard}>
                    <Text style={styles.itemName}>{product.name}</Text>
                    <Text style={styles.itemSub}>₹{product.price} - {product.stock_status}</Text>
                    <Text style={styles.itemDesc}>{product.description}</Text>
                </TouchableOpacity>
            );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search clothes, shops..."
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, mode === 'shops' && styles.activeTab]} onPress={() => setMode('shops')}>
                    <Text style={[styles.tabText, mode === 'shops' && styles.activeTabText]}>Shops</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, mode === 'products' && styles.activeTab]} onPress={() => setMode('products')}>
                    <Text style={[styles.tabText, mode === 'products' && styles.activeTabText]}>Clothes</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#007AFF" />
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>No results found</Text>}
                />
            )}
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
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutText: {
        color: 'red',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 15,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    searchButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#ddd',
    },
    activeTab: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        color: '#333',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    list: {
        padding: 15,
    },
    itemCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        elevation: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    itemSub: {
        color: '#666',
        marginVertical: 4,
    },
    itemDesc: {
        color: '#888',
        fontSize: 12,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#999',
    },
});
