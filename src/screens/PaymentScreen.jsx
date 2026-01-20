import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import notifee, { AndroidImportance } from '@notifee/react-native'; // Notification walata
import COLORS from '../constants/colors';
import api from '../services/api';

const PaymentsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('history'); 
  const [paymentData, setPaymentData] = useState({ history: [], upcoming: [] });

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const res = await api.get('/start'); 
      const allPayments = res.data.payments_details || [];

      // --- 1. HISTORY FILTER (PayHere + Bank Transfer) ---
      // Status 1: Approved/Paid (Online or Bank Slip Approved)
      // Status -1: Pending (Bank Slip Uploaded, waiting for approval)
      const history = allPayments.filter(p => p.status === 1 || p.status === -1);
      
      // Sort History (Newest first)
      history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // --- 2. UPCOMING FILTER ---
      // Status 0: Due
      // Status -2: Not Paid / Overdue
      const upcoming = allPayments.filter(p => p.status === 0 || p.status === -2);
      
      // Sort Upcoming (Oldest due date first - urgent ewa udata)
      upcoming.sort((a, b) => new Date(a.payment_month) - new Date(b.payment_month));

      setPaymentData({ history, upcoming });
      
      // --- 3. CHECK FOR REMINDERS (Auto Notification) ---
      checkReminders(upcoming);

    } catch (e) {
      console.log("Fetch Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- AUTO REMINDER LOGIC ---
  const checkReminders = async (upcomingList) => {
    const today = new Date();
    
    // Channel ekak hadamu issella (Sure ekatama notification wadinna)
    await notifee.createChannel({
        id: 'payment_reminders',
        name: 'Payment Reminders',
        importance: AndroidImportance.HIGH,
    });

    for (const p of upcomingList) {
        if(p.payment_month) {
            const dueDate = new Date(p.payment_month);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            // Dawas 3ta adu nam saha dawas 0 ta wadi nam (Past ewa nemei)
            if(diffDays <= 3 && diffDays >= 0) {
                
                await notifee.displayNotification({
                    title: '⚠️ Payment Due Soon!',
                    body: `Your payment for ${p.course_id || 'Course'} is due in ${diffDays === 0 ? 'today' : diffDays + ' days'}.`,
                    android: {
                        channelId: 'payment_reminders',
                        smallIcon: 'ic_launcher', // Icon eka hariyata thiyenna ona
                        color: '#FF5252',
                        pressAction: { id: 'default' },
                    },
                });
            }
        }
    }
  };

  const renderItem = ({ item }) => {
    // Date Format Logic
    const rawDate = item.payment_month ? item.payment_month : item.created_at;
    const formattedDate = new Date(rawDate).toDateString();
    
    // Monthly Payment Label
    const monthLabel = item.payment_month 
        ? new Date(item.payment_month).toLocaleString('default', { month: 'long', year: 'numeric' }) 
        : 'One-Time Payment';
    
    // Urgent Logic for Upcoming
    let isUrgent = false;
    let daysLeft = 0;
    
    if (activeTab === 'upcoming' && item.payment_month) {
        const dueDate = new Date(item.payment_month);
        const today = new Date();
        daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3) isUrgent = true;
    }

    // Installment Logic
    let installmentIdToPass = null;
    if (item.isInstallment === 1 && item.installments?.length > 0) {
        const pendingInstallment = item.installments.find(inst => inst.status === 0);
        if (pendingInstallment) {
            installmentIdToPass = pendingInstallment.id;
        }
    }

    return (
      <View style={[styles.card, isUrgent && styles.urgentCard]}>
        
        {/* Header Row */}
        <View style={styles.rowBetween}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status).bg }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(item.status).text }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          
          {/* Display Paid Date for History, Due Date for Upcoming */}
          <Text style={styles.dateText}>
              {activeTab === 'history' ? `Paid: ${item.created_at?.split('T')[0]}` : `Due: ${item.payment_month?.split('T')[0]}`}
          </Text>
        </View>

        {/* Course Info */}
        <Text style={styles.courseTitle}>{item.course_name || `Course ID: ${item.course_id}`}</Text>
        <Text style={styles.subTitle}>{monthLabel}</Text>
        
        {/* Amount & Status */}
        <View style={styles.rowBetween}>
            <Text style={styles.amountText}>Rs. {parseFloat(item.amount || item.subjectAmount || 0).toLocaleString()}</Text>
            
            {/* Payment Method Icon for History */}
            {activeTab === 'history' && (
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Icon name={item.slip ? "file-image" : "credit-card-check"} size={16} color="#666" />
                    <Text style={{fontSize:12, color:'#666', marginLeft:4}}>
                        {item.slip ? "Bank Slip" : "Online"}
                    </Text>
                </View>
            )}

            {/* Due Alert for Upcoming */}
            {activeTab === 'upcoming' && isUrgent && (
                <View style={styles.urgentBadge}>
                    <Icon name="clock-alert-outline" size={14} color="#C62828" />
                    <Text style={styles.urgentText}> 
                        {daysLeft <= 0 ? "Overdue" : `${daysLeft} days left`}
                    </Text>
                </View>
            )}
        </View>

        {/* Pay Now Button (Only for Upcoming) */}
        {activeTab === 'upcoming' && (
          <TouchableOpacity 
            style={[styles.payNowBtn, isUrgent ? { backgroundColor: '#D32F2F' } : { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('PaymentMethod', { 
              amount: item.amount || item.subjectAmount, 
              mainPaymentId: item.id,
              installmentPaymentId: installmentIdToPass 
            })}
          >
            <Text style={styles.payNowText}>Pay Now</Text>
            <Icon name="arrow-right" size={16} color="white" style={{marginLeft: 5}}/>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getStatusColor = (status) => {
      switch(status) {
          case 1: return { bg: '#E8F5E9', text: '#2E7D32' }; // Paid
          case -1: return { bg: '#FFF3E0', text: '#EF6C00' }; // Pending Approval
          case -2: return { bg: '#FFEBEE', text: '#C62828' }; // Overdue
          case 0: return { bg: '#E3F2FD', text: '#1565C0' }; // Due
          default: return { bg: '#F5F5F5', text: '#9E9E9E' };
      }
  };

  const getStatusText = (status) => {
      if (status === 1) return 'PAID';
      if (status === -1) return 'PENDING APPROVAL';
      if (status === -2) return 'OVERDUE';
      if (status === 0) return 'TO PAY';
      return 'UNKNOWN';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#333" /></TouchableOpacity>
            <Text style={styles.headerTitle}>My Payments</Text>
            <View style={{width:24}}/>
        </View>
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} onPress={() => setActiveTab('upcoming')}>
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={activeTab === 'history' ? paymentData.history : paymentData.upcoming}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name={activeTab === 'history' ? "history" : "calendar-check-outline"} size={60} color="#ccc" />
              <Text style={styles.emptyText}>No {activeTab} records found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: 'white', paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: '600', color: '#888', fontSize: 15 },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  urgentCard: { borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  dateText: { fontSize: 12, color: '#777', fontWeight: '500' },
  
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  subTitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  
  amountText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  urgentBadge: { flexDirection:'row', alignItems:'center', backgroundColor: '#FFCDD2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  urgentText: { color: '#C62828', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  
  payNowBtn: { backgroundColor: COLORS.primary, marginTop: 15, padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  payNowText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 15, fontSize: 16 }
});

export default PaymentsScreen;