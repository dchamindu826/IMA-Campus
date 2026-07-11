import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import COLORS from '../constants/colors';
import api from '../services/api';

const StaffDashboardScreen = ({ navigation }) => {
    const { userInfo, logout } = useContext(AuthContext);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/mobile/chat/businesses');
            if (res.data && res.data.businesses) {
                setBusinesses(res.data.businesses);
            }
        } catch (e) {
            console.log("Error loading businesses", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <LinearGradient colors={[COLORS.primary, '#9B1B1B']} style={styles.header}>
                <View style={styles.topRow}>
                    <View style={styles.userInfoRow}>
                        <Icon name="shield-account" size={40} color="white" />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.greetingText}>Staff Dashboard</Text>
                            <Text style={styles.usernameText}>{userInfo?.firstName} {userInfo?.lastName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                        <Icon name="logout" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Chat Moderation</Text>
                <Text style={styles.subtitle}>Select a business to monitor its community chat.</Text>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {businesses.map((b) => (
                            <TouchableOpacity 
                                key={b.id} 
                                style={styles.card}
                                onPress={() => navigation.navigate('CommunityChat', { businessId: b.id, businessName: b.name })}
                            >
                                <View style={styles.cardIcon}>
                                    <Icon name="domain" size={30} color={COLORS.primary} />
                                </View>
                                <View style={styles.cardText}>
                                    <Text style={styles.cardTitle}>{b.name}</Text>
                                    <Text style={styles.cardSubtitle}>Manage chat and members</Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#ccc" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfoRow: { flexDirection: 'row', alignItems: 'center' },
    greetingText: { color: '#E0E0E0', fontSize: 14, fontWeight: '500' },
    usernameText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    logoutButton: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, flex: 1 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', elevation: 2 },
    cardIcon: { width: 50, height: 50, backgroundColor: '#E3F2FD', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardSubtitle: { fontSize: 12, color: '#888' },
});

export default StaffDashboardScreen;
