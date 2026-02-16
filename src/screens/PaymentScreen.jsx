import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Image, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import notifee, { AndroidImportance } from '@notifee/react-native';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';
import moment from 'moment';

const PaymentsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); 
  
  const [historyList, setHistoryList] = useState([]);
  const [upcomingList, setUpcomingList] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchPaymentData();
    }, [])
  );

  const fetchPaymentData = async () => {
    try {
      const res = await api.get('/myPayments');
      const old = res.data.oldPayments || [];
      const coming = res.data.comingPayments || [];

      // Sort History: Newest First
      const sortedHistory = old.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
      
      // Sort Upcoming: Oldest Due Date First
      const sortedUpcoming = coming.sort((a, b) => new Date(a.payment_month) - new Date(b.payment_month));

      setHistoryList(sortedHistory);
      setUpcomingList(sortedUpcoming);
      
      if(Platform.OS === 'android') {
        checkAndScheduleNotifications(sortedUpcoming);
      }

    } catch (e) {
      console.log("Payment Fetch Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkAndScheduleNotifications = async (duePayments) => {
    try {
        await notifee.requestPermission();
        await notifee.createChannel({
            id: 'payment_reminders',
            name: 'Payment Due Reminders',
            importance: AndroidImportance.HIGH,
            sound: 'default',
        });
    } catch(e) {}
  };

  const renderPaymentCard = ({ item }) => {
    const isHistory = activeTab === 'history';
    
    // --- 🔥 STATUS LOGIC (Colors & Icons) ---
    let statusText = "Pending";
    let statusColor = "#F57C00"; // Default Orange
    let statusBg = "#FFF3E0";
    let statusIcon = "clock-outline";

    if (isHistory) {
        // 1 = Paid/Approved, -1 = Pending, -2 = Rejected
        if (item.status == 1) {
            statusText = "Paid";
            statusColor = "#2E7D32"; // Success Green
            statusBg = "#E8F5E9";
            statusIcon = "check-circle";
        } else if (item.status == -1) {
            statusText = "Pending";
            statusColor = "#F57C00"; // Warning Orange
            statusBg = "#FFF3E0";
            statusIcon = "timer-sand";
        } else if (item.status == -2) {
            statusText = "Rejected";
            statusColor = "#C62828"; // Error Red
            statusBg = "#FFEBEE";
            statusIcon = "close-circle";
        }
    } else {
        // Upcoming Payments Logic
        statusText = "Due";
        statusColor = "#1565C0"; // Info Blue
        statusBg = "#E3F2FD";
        statusIcon = "calendar-clock";
        
        const today = moment();
        const due = moment(item.payment_month);
        if (due.diff(today, 'days') < 0) {
            statusText = "Overdue";
            statusColor = "#C62828"; // Red for overdue
            statusBg = "#FFEBEE";
            statusIcon = "alert-circle";
        }
    }

    return (
      <View style={styles.card}>
        {/* Header: Course Info & Status */}
        <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
                {item.batchLogo ? (
                    <Image source={{ uri: `${IMAGE_URL}icons/${item.batchLogo}` }} style={styles.logo} />
                ) : (
                    <View style={styles.iconPlaceholder}><Icon name="school" size={24} color="white"/></View>
                )}
                <View style={styles.headerTextContainer}>
                    <Text style={styles.courseName} numberOfLines={1}>{item.courseName}</Text>
                    <Text style={styles.batchName}>{item.batchName}</Text>
                </View>
            </View>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                <Icon name={statusIcon} size={14} color={statusColor} style={{marginRight: 4}} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
        </View>

        {/* Divider Line */}
        <View style={styles.divider} />

        {/* Details Body */}
        <View style={styles.cardBody}>
            <View style={styles.detailRow}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.amountValue}>LKR {parseFloat(item.amount).toLocaleString()}</Text>
            </View>
            
            <View style={styles.detailRow}>
                <Text style={styles.label}>{isHistory ? "Paid Date" : "Due Date"}</Text>
                <Text style={styles.value}>
                    {isHistory 
                        ? moment(item.createdDate).format('MMM DD, YYYY') 
                        : moment(item.payment_month).format('MMM DD, YYYY')}
                </Text>
            </View>
            
            {isHistory && (
                <View style={styles.detailRow}>
                    <Text style={styles.label}>Method</Text>
                    <View style={styles.methodBadge}>
                        <Icon name={item.pType === 'slip' ? 'file-upload-outline' : 'credit-card-outline'} size={14} color="#555" />
                        <Text style={styles.methodText}>
                            {item.pType === 'slip' ? 'Bank Slip' : 'Online Pay'}
                        </Text>
                    </View>
                </View>
            )}
        </View>

        {/* Pay Now Button (Only for Upcoming) */}
        {!isHistory && (
            <TouchableOpacity 
                style={styles.payBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('PaymentMethod', {
                    amount: item.amount,
                    mainPaymentId: item.paymentId,
                    isInstallment: item.isInstallment 
                })}
            >
                <Text style={styles.payBtnText}>Pay Now</Text>
                <Icon name="chevron-right" color="white" size={20} />
            </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payments</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} 
            onPress={() => setActiveTab('upcoming')}
        >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
            {upcomingList.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{upcomingList.length}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
            onPress={() => setActiveTab('history')}
        >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* List Content */}
      <View style={styles.content}>
        {loading && !refreshing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
        ) : (
            <FlatList
                data={activeTab === 'history' ? historyList : upcomingList}
                keyExtractor={(item) => item.paymentId.toString()}
                renderItem={renderPaymentCard}
                contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPaymentData(); }} colors={[COLORS.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name={activeTab === 'history' ? "history" : "calendar-check-outline"} size={70} color="#E0E0E0" />
                        <Text style={styles.emptyText}>No {activeTab} payments</Text>
                    </View>
                }
            />
        )}
      </View>
    </SafeAreaView>
  );
};

// --- 🔥 BEAUTIFUL STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, // Light Gray Background
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: 'white', 
    elevation: 3, 
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:3 
  },
  backBtn: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  
  // Tabs
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    paddingHorizontal: 15, 
    marginTop: 1,
    elevation: 1 
  },
  tab: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 3, 
    borderBottomColor: 'transparent' 
  },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: '#999' },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  badge: { backgroundColor: '#FF5252', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  content: { flex: 1 },
  
  // Card Styles
  card: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    marginBottom: 16, 
    padding: 18,
    elevation: 4, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  logo: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#F5F5F5' },
  iconPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: { marginLeft: 12, flex: 1 },
  courseName: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  batchName: { fontSize: 13, color: '#666' },
  
  // Status Badge
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },

  cardBody: { paddingHorizontal: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 13, color: '#888', fontWeight: '600' },
  amountValue: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A' },
  value: { fontSize: 14, fontWeight: '600', color: '#444' },
  
  methodBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FAFAFA', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1, borderColor: '#EEE'
  },
  methodText: { fontSize: 12, color: '#555', marginLeft: 6, fontWeight: '600' },

  payBtn: { 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderRadius: 14, 
    marginTop: 10,
    elevation: 3, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowOffset: {width:0, height:4}
  },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15, marginRight: 5 },

  emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.6 },
  emptyText: { marginTop: 15, color: '#888', fontSize: 16, fontWeight: '500' }
});

export default PaymentsScreen;