import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Alert, Linking, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import notifee, { TriggerType, AndroidImportance, AndroidStyle } from '@notifee/react-native';
import api from '../services/api';
import COLORS from '../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// 🔥 FIX 1: Animated.View එක අයින් කරලා කෙලින්ම Animated.TouchableOpacity හැදුවා (අර කැත කොටුව පේන එක නැති කරන්න)
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const BlinkingButton = ({ onPress, disabled, isPending }) => {
  // Opacity වෙනුවට Scale එක පාවිච්චි කරමු (Button එක පොඩි වෙලා ලොකු වෙනවා)
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation;
    // Payment Pending නම් හෝ Class එක පටන් අරන් නැත්නම් Blink වෙන්නේ නෑ
    if (!disabled && !isPending) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(scaleValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
    } else {
      scaleValue.setValue(1); 
    }
    return () => animation && animation.stop();
  }, [disabled, isPending]);

  return (
    <AnimatedTouchableOpacity 
      style={[
          styles.joinBtn, 
          (disabled || isPending) && styles.disabledBtn,
          { transform: [{ scale: scaleValue }] } // 🔥 Scale Animation එක මෙතන දෙනවා
      ]} 
      onPress={() => {
          if (isPending) {
              Alert.alert("Payment Pending", "ඔබගේ ගෙවීම තවමත් තහවුරු කර නොමැත. කරුණාකර රැඳී සිටින්න.");
          } else if (!disabled) {
              onPress();
          }
      }} 
      activeOpacity={0.8}
    >
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {!disabled && !isPending && <Icon name="video" size={24} color="white" style={{marginRight: 8}} />}
          {(disabled || isPending) && <Icon name="lock-outline" size={20} color="#9CA3AF" style={{marginRight: 8}} />}
          <Text style={(disabled || isPending) ? styles.disabledBtnText : styles.joinBtnText}>
              {isPending ? "PAYMENT PENDING" : disabled ? "NOT STARTED YET" : "JOIN LIVE NOW"}
          </Text>
      </View>
    </AnimatedTouchableOpacity>
  );
};

// --- COMPONENT 2: Real-time Countdown Timer ---
const CountdownTimer = ({ startStr, endStr, onStatusChange }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const lastStatus = useRef("");
    
    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const start = new Date(startStr.replace(' ', 'T'));
            const end = new Date(endStr.replace(' ', 'T'));

            let currentStatus = "NOT_STARTED";
            
            if (now >= start && now <= end) {
                currentStatus = "LIVE";
                setTimeLeft("LIVE");
            } else if (now > end) {
                currentStatus = "ENDED";
                setTimeLeft("ENDED");
            } else {
                currentStatus = "NOT_STARTED";
                const diff = start - now;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }

            if (lastStatus.current !== currentStatus) {
                lastStatus.current = currentStatus;
                onStatusChange(currentStatus);
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [startStr, endStr]);

    if (timeLeft === "LIVE") {
        return (
            <View style={styles.liveBadgeContainer}>
                <Icon name="access-point" size={22} color="#FFFFFF" />
                <Text style={styles.liveTextAnim}>HAPPENING NOW</Text>
            </View>
        );
    }
    
    if (timeLeft === "ENDED") {
        return (
            <View style={styles.endedBadgeContainer}>
                <Icon name="close-circle-outline" size={20} color="#9CA3AF" />
                <Text style={styles.endedText}>Class Ended</Text>
            </View>
        );
    }

    return (
        <View style={styles.timerContainer}>
            <Icon name="timer-outline" size={24} color="#DC2626" />
            <Text style={styles.timerLabel}>Starts in:</Text>
            <View style={styles.timeValueBox}>
                <Text style={styles.timerValue}>{timeLeft}</Text>
            </View>
        </View>
    );
};

// --- COMPONENT 3: Live Class Card ---
const LiveClassCard = ({ item, openLink }) => {
  const [classStatus, setClassStatus] = useState("NOT_STARTED");

  // 🔥 Backend එකෙන් එන Pending Status එක අල්ලගන්නවා
  const isPending = item.paidStatus == -1 || item.status == -1 || item.paymentStatus == -1;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.courseName}>{item.courseName}</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      
      <View style={styles.timeRangeContainer}>
        <Icon name="clock-outline" size={16} color="#6B7280" />
        <Text style={styles.timeRange}>{item.startTime} - {item.endTime}</Text>
      </View>
      
      <CountdownTimer 
          // iOS/Android දෙකටම හරියන්න Date+Time එක T එකෙන් වෙන් කරලා දෙනවා
          startStr={`${item.date}T${item.startTime}`} 
          endStr={`${item.date}T${item.endTime}`} 
          onStatusChange={(status) => setClassStatus(status)} 
      />

      {/* Class එක LIVE නම් */}
      {classStatus === "LIVE" && (
          <BlinkingButton 
            onPress={() => openLink(item.link)} 
            disabled={false} 
            isPending={isPending}
          />
      )}

      {/* Class එක පටන් අරන් නැත්නම් */}
      {classStatus === "NOT_STARTED" && (
          <BlinkingButton 
            onPress={() => {}} 
            disabled={true} 
            isPending={isPending}
          />
      )}
    </View>
  );
};

// --- MAIN SCREEN ---
const LiveClassesScreen = () => {
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      async function checkPermissions() {
          if (Platform.OS === 'android') {
            await notifee.requestPermission();
          }
      }
      checkPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLives();
    }, [])
  );

  const fetchLives = async () => {
    try {
      const res = await api.get('/getAllUpcomingLives');
      setLives(res.data.liveClasses);
      scheduleNotifications(res.data.liveClasses);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIX 2: Notification එක හරියටම වෙලාවට එන්න හදපු කෝඩ් එක
  const scheduleNotifications = async (classes) => {
    try {
        await notifee.requestPermission();
        
        await notifee.createChannel({
            id: 'live_reminders',
            name: 'Live Class Reminders',
            importance: AndroidImportance.HIGH,
            sound: 'default',
        });

        // 🔥 වෙනස: දැනටමත් Schedule කරලා තියෙන Notifications වල IDs ටික ගන්නවා
        const scheduledIds = await notifee.getTriggerNotificationIds();
        const now = Date.now();

        for (const item of classes) {
            let timeStr = item.startTime;
            if (timeStr && timeStr.split(':').length === 2) {
                timeStr += ':00';
            }
            
            const classDateStr = `${item.date}T${timeStr}`;
            // Date එක Parse කරන එක හරියටම වෙනවද කියලා sure කරගන්න
            const classStartTime = new Date(classDateStr.replace(/\s/g, 'T')).getTime();

            if (!isNaN(classStartTime)) {
                const triggerTime = classStartTime - (15 * 60 * 1000); // විනාඩි 15 කට කලින්
                const notificationId = `reminder_${item.id}`;

                // 🔥 වෙනස: Trigger Time එක අනාගතයේ තියෙනවා නම් සහ දැනටමත් මේ ID එකෙන් Schedule කරලා නැත්නම් විතරක් දානවා
                if (triggerTime > now && !scheduledIds.includes(notificationId)) {
                    
                    const trigger = {
                        type: TriggerType.TIMESTAMP,
                        timestamp: triggerTime, 
                        alarmManager: true, // මේක වැඩ කරන්න AndroidManifest එකේ permissions තියෙන්නම ඕනේ 
                    };

                    await notifee.createTriggerNotification(
                        {
                            id: notificationId, // අනිවාර්යයෙන්ම ID එකක් දෙන්න
                            title: '🔴 Class Starting Soon!',
                            body: `${item.courseName}: ${item.title} starts in 15 minutes.`,
                            android: {
                                channelId: 'live_reminders',
                                pressAction: { id: 'default' },
                                style: { 
                                    type: AndroidStyle.BIGTEXT, 
                                    text: `${item.title} is starting at ${item.startTime}. Get ready to join!` 
                                },
                            },
                        },
                        trigger,
                    );
                }
            }
        }
    } catch (e) {
        console.log("Notification Schedule Error:", e);
    }
  };

  const openLink = async (link) => {
    if (!link) {
        Alert.alert("Please Wait", "The link has not been updated yet.");
        return;
    }

    try {
        let formattedLink = link.trim();
        if (!formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
            formattedLink = 'https://' + formattedLink;
        }
        await Linking.openURL(formattedLink);
    } catch (error) {
        console.log("Link Open Error: ", error);
        Alert.alert("Error", "Could not open the link. Please check if the link is correct.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#B91C1C" barStyle="light-content" />
      
      <View style={styles.topHeader}>
         <Text style={styles.headerTitle}>Upcoming Lives</Text>
         <Text style={styles.subHeader}>Your schedule for this week</Text>
      </View>

      <FlatList
        data={lives}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        renderItem={({ item }) => <LiveClassCard item={item} openLink={openLink} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 50 }}
        refreshing={loading}
        onRefresh={fetchLives}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            !loading && 
            <View style={styles.emptyView}>
                <Icon name="calendar-blank-outline" size={70} color="#D1D5DB"/>
                <Text style={styles.emptyText}>No upcoming classes</Text>
                <Text style={styles.emptySubText}>Check back later to see new schedules.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
};

// --- PREMIUM STYLES WITH RED THEME ---
const styles = StyleSheet.create({
  container: { 
      flex: 1, 
      backgroundColor: '#F3F4F6' 
  },
  topHeader: { 
      paddingTop: Platform.OS === 'ios' ? 10 : 20,
      paddingBottom: 30,
      paddingHorizontal: 20,
      backgroundColor: '#b60d0d', 
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      shadowColor: '#DC2626', 
      shadowOffset: { width: 0, height: 8 }, 
      shadowOpacity: 0.3, 
      shadowRadius: 15,
      elevation: 8,
      marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  subHeader: { fontSize: 14, color: '#FECACA', marginTop: 5, fontWeight: '500' },
  
  card: { 
      backgroundColor: '#FFFFFF', 
      padding: 24, 
      borderRadius: 24, 
      marginBottom: 20, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 6 }, 
      shadowOpacity: 0.08, 
      shadowRadius: 12, 
      elevation: 5,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  courseName: { fontSize: 14, color: '#DC2626', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  dateBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  dateText: { fontSize: 12, fontWeight: '800', color: '#B91C1C' },
  
  title: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10, lineHeight: 30 },
  timeRangeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  timeRange: { fontSize: 15, color: '#4B5563', fontWeight: '600', marginLeft: 8 },
  
  timerContainer: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 25 },
  timerLabel: { color: '#6B7280', fontWeight: '700', marginLeft: 8, marginRight: 12, fontSize: 16 },
  timeValueBox: { backgroundColor: '#F3F4F6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  timerValue: { color: '#111827', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  
  liveBadgeContainer: { backgroundColor: '#DC2626', paddingVertical: 12, borderRadius: 14, marginBottom: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#DC2626', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  liveTextAnim: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, marginLeft: 8, letterSpacing: 1 },
  
  endedBadgeContainer: { backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 14, marginBottom: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  endedText: { color: '#9CA3AF', fontWeight: '800', fontSize: 15, marginLeft: 6 },

  joinBtn: { 
      backgroundColor: '#111827', 
      paddingVertical: 18, 
      borderRadius: 16, 
      alignItems: 'center', 
      justifyContent: 'center', 
      // Elevation අයින් කළා, අර කැත කොටුව නැති කරන්න
  },
  disabledBtn: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  joinBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  disabledBtnText: { color: '#9CA3AF', fontWeight: '800', fontSize: 16 },

  emptyView: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#374151', fontSize: 22, fontWeight: '800', marginTop: 20 },
  emptySubText: { color: '#6B7280', fontSize: 16, marginTop: 10, textAlign: 'center' }
});

export default LiveClassesScreen;