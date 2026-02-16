import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Image, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';
import moment from 'moment';

const PaymentsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // Default Upcoming පෙන්නමු
  
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
      
      // Backend එකෙන් එන නම් (Arrays)
      // 1. oldPayments -> History
      // 2. comingPayments -> Upcoming (Due)
      
      const old = res.data.oldPayments || [];
      const coming = res.data.comingPayments || [];

      // Sort: අලුත් ඒවා උඩට
      const sortedHistory = old.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
      
      // Sort: පරණම Due Date එක උඩට (Urgent ඒවා)
      const sortedUpcoming = coming.sort((a, b) => new Date(a.payment_month) - new Date(b.payment_month));

      setHistoryList(sortedHistory);
      setUpcomingList(sortedUpcoming);

      // Notification Check එක රන් කරන්න
      checkAndScheduleNotifications(sortedUpcoming);

    } catch (e) {
      console.log("Payment Fetch Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔥 Notification Logic (දවස් 3ක් ඇතුලත නම් Remind කරන්න)
  const checkAndScheduleNotifications = async (duePayments) => {
    await notifee.requestPermission();

    // Channel එක හදමු
    await notifee.createChannel({
        id: 'payment_reminders',
        name: 'Payment Due Reminders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
    });

    const today = moment();

    for (const payment of duePayments) {
        if (!payment.payment_month) continue;

        const dueDate = moment(payment.payment_month);
        const daysDiff = dueDate.diff(today, 'days');

        // දවස් 0 ත් 3 ත් අතර නම් Notification එකක් යවමු
        if (daysDiff >= 0 && daysDiff <= 3) {
            await notifee.displayNotification({
                title: '📅 Payment Reminder',
                body: `Your payment for ${payment.courseName} is due ${daysDiff === 0 ? 'today' : 'in ' + daysDiff + ' days'}.`,
                android: {
                    channelId: 'payment_reminders',
                    smallIcon: 'ic_launcher', // ඔයාගේ ඇප් එකේ icon එකේ නම මෙතනට දාන්න check කරලා
                    color: COLORS.primary,
                    pressAction: { id: 'default' },
                },
            });
            // එක පාරක් යැව්වම ඇති (Loop එක නවත්තනවා spam නොවෙන්න)
            break; 
        }
    }
  };

  const renderPaymentCard = ({ item }) => {
    const isHistory = activeTab === 'history';
    
    // Status Logic
    let statusText = "Pending";
    let statusColor = "#FF9800"; // Orange
    let statusBg = "#FFF3E0";

    if (isHistory) {
        if (item.status === 1) {
            statusText = "Paid";
            statusColor = "#4CAF50"; // Green
            statusBg = "#E8F5E9";
        } else if (item.status === -1) {
            statusText = "Pending Approval";
        } else if (item.status === -2) {
            statusText = "Rejected";
            statusColor = "#F44336";
            statusBg = "#FFEBEE";
        }
    } else {
        // Upcoming
        statusText = "Due";
        statusColor = "#2196F3"; // Blue
        statusBg = "#E3F2FD";
        
        // Urgent Check
        const today = moment();
        const due = moment(item.payment_month);
        if (due.diff(today, 'days') < 0) {
            statusText = "Overdue";
            statusColor = "#F44336";
            statusBg = "#FFEBEE";
        }
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                {item.batchLogo ? (
                    <Image source={{ uri: `${IMAGE_URL}icons/${item.batchLogo}` }} style={styles.logo} />
                ) : (
                    <View style={styles.iconPlaceholder}><Icon name="school" size={20} color="white"/></View>
                )}
                <View style={{marginLeft: 10, flex:1}}>
                    <Text style={styles.courseName} numberOfLines={1}>{item.courseName}</Text>
                    <Text style={styles.batchName}>{item.batchName}</Text>
                </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
            <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>LKR {parseFloat(item.amount).toLocaleString()}</Text>
            </View>
            <View style={[styles.row, {marginTop: 5}]}>
                <Text style={styles.label}>{isHistory ? "Paid Date" : "Due Date"}</Text>
                <Text style={styles.value}>
                    {isHistory 
                        ? moment(item.createdDate).format('MMM DD, YYYY') 
                        : moment(item.payment_month).format('MMM DD, YYYY')}
                </Text>
            </View>
            
            {/* History Only: Payment Method */}
            {isHistory && (
                <View style={[styles.row, {marginTop: 5}]}>
                    <Text style={styles.label}>Method</Text>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Icon name={item.pType === 'slip' ? 'file-upload' : 'credit-card'} size={14} color="#666" />
                        <Text style={[styles.value, {marginLeft: 5}]}>
                            {item.pType === 'slip' ? 'Bank Slip' : 'Online Payment'}
                        </Text>
                    </View>
                </View>
            )}
        </View>

        {/* Action Button for Upcoming */}
        {!isHistory && (
            <TouchableOpacity 
                style={styles.payBtn}
                onPress={() => navigation.navigate('PaymentMethod', {
                    amount: item.amount,
                    mainPaymentId: item.paymentId, // API එකෙන් එන ID එක
                    // Installment නම් මේක installment payment එකක් කියල අඳුරගන්න ඕන වෙයි payment method එකේදී
                    isInstallment: item.isInstallment 
                })}
            >
                <Text style={styles.payBtnText}>Pay Now</Text>
                <Icon name="arrow-right" color="white" size={16} />
            </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Content */}
      <View style={styles.content}>
        {loading && !refreshing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
        ) : (
            <FlatList
                data={activeTab === 'history' ? historyList : upcomingList}
                keyExtractor={(item) => item.paymentId.toString()}
                renderItem={renderPaymentCard}
                contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPaymentData(); }} colors={[COLORS.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name={activeTab === 'history' ? "history" : "calendar-check"} size={60} color="#DDD" />
                        <Text style={styles.emptyText}>No {activeTab} payments found.</Text>
                    </View>
                }
            />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', elevation: 2 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: '#888' },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  badge: { backgroundColor: '#FF5252', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  content: { flex: 1 },
  
  card: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logo: { width: 40, height: 40, borderRadius: 8 },
  iconPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  courseName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  batchName: { fontSize: 12, color: '#666' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },

  cardBody: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: '#888' },
  value: { fontSize: 14, fontWeight: '600', color: '#333' },

  payBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 5 },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginRight: 5 },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 }
});

export default PaymentsScreen;