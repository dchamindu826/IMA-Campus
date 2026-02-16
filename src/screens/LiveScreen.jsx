import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import notifee, { TriggerType, AndroidImportance, AndroidStyle } from '@notifee/react-native';
import api from '../services/api';
import COLORS from '../constants/colors';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// --- COMPONENT 1: Blinking JOIN Button ---
const BlinkingButton = ({ onPress, disabled }) => {
  const [opacity] = useState(new Animated.Value(1));

  useEffect(() => {
    let animation;
    if (!disabled) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
    } else {
      opacity.setValue(1); 
    }
    return () => animation && animation.stop();
  }, [disabled]);

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity 
        style={[styles.joinBtn, disabled && styles.disabledBtn]} 
        onPress={onPress} 
        disabled={disabled}
      >
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {!disabled && <Icon name="video" size={24} color="white" style={{marginRight: 10}} />}
            <Text style={styles.joinBtnText}>{disabled ? "Not Started Yet" : "JOIN LIVE NOW"}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- COMPONENT 2: Real-time Countdown Timer ---
const CountdownTimer = ({ startStr, endStr, onStatusChange }) => {
    const [timeLeft, setTimeLeft] = useState("");
    
    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const start = new Date(startStr.replace(' ', 'T'));
            const end = new Date(endStr.replace(' ', 'T'));

            if (now >= start && now <= end) {
                setTimeLeft("LIVE");
                onStatusChange(true);
            } else if (now > end) {
                setTimeLeft("ENDED");
                onStatusChange(false);
            } else {
                const diff = start - now;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                onStatusChange(false);
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [startStr, endStr]);

    if (timeLeft === "LIVE") return <Text style={styles.liveTextAnim}>🔴 HAPPENING NOW</Text>;
    if (timeLeft === "ENDED") return <Text style={{color: 'red', fontWeight: 'bold', textAlign: 'center', marginBottom: 10}}>Class Ended</Text>;

    return (
        <View style={styles.timerContainer}>
            <Icon name="timer-sand" size={20} color="#E65100" />
            <Text style={styles.timerLabel}> Starts in:</Text>
            <Text style={styles.timerValue}>{timeLeft}</Text>
        </View>
    );
};

// --- COMPONENT 3: Live Class Card (NEW SEPARATE COMPONENT) ---
// 👇👇👇 මම renderItem එක වෙනම Component එකක් කරා. දැන් Crash වෙන්නේ නෑ. 👇👇👇
const LiveClassCard = ({ item, openLink }) => {
  // දැන් මෙතන useState පාවිච්චි කරන්න පුළුවන් බය නැතුව
  const [isLive, setIsLive] = useState(false);

  return (
    <View style={styles.card}>
      {/* Header: Course Name & Date */}
      <View style={styles.headerRow}>
        <Text style={styles.courseName}>{item.courseName}</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      </View>
      
      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.timeRange}>{item.startTime} - {item.endTime}</Text>
      
      {/* Countdown Logic */}
      <CountdownTimer 
          startStr={`${item.date}T${item.startTime}`} 
          endStr={`${item.date}T${item.endTime}`} 
          onStatusChange={(status) => setIsLive(status)} 
      />

      {/* Action Button */}
      <BlinkingButton 
        onPress={() => openLink(item.link)} 
        disabled={!isLive} 
      />
    </View>
  );
};

// --- MAIN SCREEN ---
const LiveClassesScreen = () => {
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Notification Permission
  useEffect(() => {
      async function checkPermissions() {
          if (Platform.OS === 'android') {
            await notifee.requestPermission();
          }
      }
      checkPermissions();
  }, []);

  // 2. Data Refresh
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

  const scheduleNotifications = async (classes) => {
    try {
        await notifee.createChannel({
            id: 'live_reminders',
            name: 'Live Class Reminders',
            importance: AndroidImportance.HIGH,
            sound: 'default',
        });

        const now = Date.now();

        for (const item of classes) {
            const classStartTime = new Date(`${item.date}T${item.startTime}`).getTime();
            const triggerTime = classStartTime - (15 * 60 * 1000); 

            if (triggerTime > now) {
                const trigger = {
                    type: TriggerType.TIMESTAMP,
                    timestamp: triggerTime, 
                };

                await notifee.createTriggerNotification(
                    {
                        id: `reminder_${item.id}`,
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
    } catch (e) {
        console.log("Notification Schedule Error:", e);
    }
  };

  const openLink = async (link) => {
    if (link) {
        try {
            const supported = await Linking.canOpenURL(link);
            if (supported) {
                await Linking.openURL(link);
            } else {
                Alert.alert("Error", "Invalid Link format.");
            }
        } catch (error) {
            Alert.alert("Error", "Could not open the link.");
        }
    } else {
        Alert.alert("Please Wait", "The link has not been updated yet.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
         <Text style={styles.headerTitle}>Upcoming Live Classes</Text>
         <Text style={styles.subHeader}>Your schedule for this week</Text>
      </View>

      <FlatList
        data={lives}
        keyExtractor={item => item.id.toString()}
        // 👇👇👇 Render Item එක දැන් අලුත් Component එකට යැව්වා
        renderItem={({ item }) => <LiveClassCard item={item} openLink={openLink} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
        refreshing={loading}
        onRefresh={fetchLives}
        ListEmptyComponent={
            !loading && 
            <View style={styles.emptyView}>
                <Icon name="calendar-check-outline" size={60} color="#ccc"/>
                <Text style={styles.emptyText}>No upcoming classes found.</Text>
                <Text style={styles.emptySubText}>Check back later!</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  topHeader: { padding: 20, backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subHeader: { fontSize: 14, color: '#666', marginTop: 2 },
  
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.05, shadowRadius:5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  courseName: { fontSize: 13, color: COLORS.primary, fontWeight: 'bold', textTransform: 'uppercase', flex: 1 },
  dateBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dateText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  
  title: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 5 },
  timeRange: { fontSize: 14, color: '#666', marginBottom: 15 },
  
  timerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF3E0', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2' },
  timerLabel: { color: '#E65100', fontWeight: 'bold', marginLeft: 5, marginRight: 5 },
  timerValue: { color: '#E65100', fontWeight: 'bold', fontSize: 18, fontFamily: 'monospace' },
  liveTextAnim: { color: 'red', fontWeight: 'bold', textAlign: 'center', marginBottom: 15, fontSize: 16 },

  joinBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  disabledBtn: { backgroundColor: '#E0E0E0', elevation: 0 },
  joinBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  emptyView: { alignItems:'center', marginTop: 80 },
  emptyText: { color: '#555', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySubText: { color: '#999', marginTop: 5 }
});

export default LiveClassesScreen;