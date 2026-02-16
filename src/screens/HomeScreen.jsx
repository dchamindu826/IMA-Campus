import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, 
  Image, ActivityIndicator, Modal, FlatList, Dimensions, RefreshControl,
  AppState, Linking // 🔥 Added Linking
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import COLORS from '../constants/colors';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api, { IMAGE_URL } from '../services/api'; 
import { AuthContext } from '../context/AuthContext';
import moment from 'moment'; 

const { width } = Dimensions.get('window');

const CARD_MARGIN = 15;
const CARD_WIDTH = width - 40;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;

const HomeScreen = ({ navigation }) => {
  const { userInfo, userToken } = useContext(AuthContext);
  const [greeting, setGreeting] = useState('');
  const [posts, setPosts] = useState([]); 
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const flatListRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); 

  // 🔥 AppState Logic
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadData(); 
      }
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });
    return () => { subscription.remove(); };
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    loadData();
  }, [userToken]);

  useFocusEffect(useCallback(() => { loadRecents(); }, []));

  const loadRecents = async () => {
      try {
          const historyStr = await AsyncStorage.getItem('recent_activity');
          if (historyStr) setRecents(JSON.parse(historyStr));
      } catch (e) { console.log("Error loading recents", e); }
  };

  useEffect(() => {
    if (posts.length > 1) {
      const interval = setInterval(() => {
        let nextSlide = currentSlide + 1;
        if (nextSlide >= posts.length) nextSlide = 0;
        
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: nextSlide * SNAP_INTERVAL, animated: true });
          setCurrentSlide(nextSlide);
        }
      }, 4000); 
      return () => clearInterval(interval);
    }
  }, [currentSlide, posts]);

  const loadData = async () => {
    try {
      if (!userToken) { setLoading(false); return; }
      const response = await api.get('/home', { headers: { Authorization: `Bearer ${userToken}` } }); 
      const data = response.data;
      if (data && data.posts && Array.isArray(data.posts)) setPosts(data.posts);
    } catch (error) { console.log("❌ Error calling API:", error); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    loadRecents();
  };

  const quickActions = [
    { id: 1, name: 'Courses', icon: 'book-education', color: '#E3F2FD', iconColor: '#2196F3', targetTab: 'Courses' },
    { id: 2, name: 'Downloads', icon: 'download-circle-outline', color: '#E8F5E9', iconColor: '#4CAF50', targetTab: 'Downloads' }, 
    { id: 3, name: 'Pay', icon: 'calendar-clock', color: '#FFF3E0', iconColor: '#FF9800', targetTab: 'Payments' },
    { id: 4, name: 'Support', icon: 'headset', color: '#F3E5F5', iconColor: '#9C27B0', nav: null },
  ];

  // 🔥 Helper to render text with clickable links
  const renderTextWithLinks = (text) => {
    if (!text) return null;
    // Regex to detect URLs (http/https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <Text style={styles.detailBody}>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    return (
                        <Text
                            key={index}
                            style={{color: COLORS.primary, textDecorationLine: 'underline', fontWeight: 'bold'}}
                            onPress={() => Linking.openURL(part).catch(err => console.error("Couldn't load page", err))}
                        >
                            {part}
                        </Text>
                    );
                }
                return <Text key={index}>{part}</Text>;
            })}
        </Text>
    );
  };

  const renderCarouselItem = ({ item }) => {
    let imgUri = null;
    if (item.image) {
        imgUri = item.image.startsWith('http') ? item.image : `${IMAGE_URL}posts/${item.image}`;
    }
    const description = item.caption || item.description || item.body || "";

    return (
      <TouchableOpacity 
        key={item.id ? item.id.toString() : Math.random().toString()}
        style={styles.carouselCard} 
        activeOpacity={0.9}
        onPress={() => { setSelectedPost(item); setModalVisible(true); }}
      >
        {imgUri ? (
             <Image source={{ uri: imgUri }} style={styles.carouselImage} resizeMode="cover" />
        ) : (
             <View style={styles.carouselIcon}><Icon name="bullhorn-variant-outline" size={24} color="#FFF" /></View>
        )}
        
        <View style={styles.carouselTextContainer}>
          <Text style={styles.carouselTitle} numberOfLines={1}>{item.title || "Notice"}</Text>
          <Text style={styles.carouselBody} numberOfLines={2}>{description}</Text>
          <Text style={styles.carouselTime}>{item.created_at ? moment(item.created_at).fromNow() : ''}</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#CCC" />
      </TouchableOpacity>
    );
  };

  const profileImageUri = userInfo?.image && userInfo.image !== 'default.png' ? `${IMAGE_URL}userImages/${userInfo.image}` : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <LinearGradient colors={[COLORS.primary, '#9B1B1B']} style={styles.header}>
        <View style={styles.topRow}>
           <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white' }} />
              ) : (
                <Icon name="account-circle-outline" size={50} color="white" />
              )}
           </TouchableOpacity>

           <TouchableOpacity style={styles.bellButton} onPress={() => setModalVisible(true)}>
              <Icon name="bell-outline" size={28} color="white" />
              {posts.length > 0 && <View style={styles.badge} />}
           </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
            <Image source={require('../assets/logo_white.png')} style={styles.mainLogo} resizeMode="contain" />
        </View>

        <View style={styles.welcomeContainer}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.usernameText}>{userInfo?.fName} {userInfo?.lName}</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.contentContainer} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.gridContainer}>
          {quickActions.map((item) => (
            <TouchableOpacity 
                key={item.id.toString()} 
                style={styles.actionCard} 
                onPress={() => {
                  if (item.targetTab === 'Downloads') navigation.navigate('Downloads');
                  else if (item.targetTab) navigation.navigate('MainTabs', { screen: item.targetTab });
                }}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={24} color={item.iconColor} />
              </View>
              <Text style={styles.actionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.carouselCard}>
              <View style={[styles.carouselImage, { backgroundColor: '#E0E0E0' }]} />
              <View style={styles.carouselTextContainer}>
                  <View style={{ width: '50%', height: 16, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ width: '90%', height: 12, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 5 }} />
                  <View style={{ width: '70%', height: 12, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
              </View>
          </View>
        ) : posts.length > 0 ? (
          <View>
              <FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderCarouselItem}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                pagingEnabled={false}
                contentContainerStyle={{ paddingVertical: 15, paddingHorizontal: 20 }}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
                    setCurrentSlide(index);
                }}
              />
              <View style={styles.dotContainer}>
                {posts.map((_, index) => (
                    <View key={index} style={[styles.dot, currentSlide === index ? styles.activeDot : null]} />
                ))}
              </View>
          </View>
        ) : (
            <View style={styles.carouselCard}>
                <View style={[styles.carouselIcon, {backgroundColor:'#ccc'}]}>
                    <Icon name="information-variant" size={24} color="#FFF" />
                </View>
                <View style={styles.carouselTextContainer}>
                    <Text style={styles.carouselTitle}>No New Notices</Text>
                    <Text style={styles.carouselBody}>Check back later for updates.</Text>
                </View>
            </View>
        )}

        {recents.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 20, paddingRight: 20, paddingBottom: 20}}>
                {recents.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.recentCard}
                        onPress={() => {
                            navigation.navigate('CourseContent', { 
                                courseId: item.courseId, 
                                courseTitle: item.courseTitle,
                                autoPlayItem: item 
                            });
                        }}
                    >
                        <View style={styles.recentIconBox}><Icon name="play-circle" size={30} color="white" /></View>
                        <View style={{flex: 1, marginRight: 10}}>
                            <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
                            <Text style={styles.recentSub} numberOfLines={1}>{item.courseTitle}</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* MODAL CODE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); setSelectedPost(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedPost(null); }}>
                <Icon name="close-circle" size={30} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedPost ? (
                <ScrollView contentContainerStyle={{paddingBottom: 20}}>
                      {selectedPost.image && (
                          <Image 
                            source={{ uri: `${IMAGE_URL}posts/${selectedPost.image}` }} 
                            style={styles.detailImage} 
                            resizeMode="cover" 
                          />
                      )}
                      <Text style={styles.detailTitle}>{selectedPost.title || "Notice"}</Text>
                      <Text style={styles.detailTime}>{selectedPost.created_at ? moment(selectedPost.created_at).format('MMMM Do YYYY, h:mm a') : ''}</Text>
                      
                      {/* 🔥 RENDER BODY WITH CLICKABLE LINKS */}
                      {renderTextWithLinks(selectedPost.caption || selectedPost.description || selectedPost.body)}
                      
                      <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedPost(null)}>
                        <Text style={{color:'white', fontWeight:'bold'}}>Back to List</Text>
                      </TouchableOpacity>
                </ScrollView>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    contentContainerStyle={{paddingBottom: 20}}
                    ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 50, color:'#999'}}>No notifications available.</Text>}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.notifItem} onPress={() => setSelectedPost(item)}>
                        {item.image ? (
                            <Image source={{ uri: `${IMAGE_URL}posts/${item.image}` }} style={styles.notifImage} resizeMode="cover" />
                        ) : (
                            <View style={styles.notifIconBox}><Icon name="bell-ring" size={20} color="white" /></View>
                        )}
                        <View style={{flex: 1, paddingLeft: 12}}>
                            <Text style={styles.notifTitle} numberOfLines={2}>{item.title || "Notice"}</Text>
                            <Text style={styles.notifBody} numberOfLines={1}>{item.caption || item.description || item.body}</Text>
                            <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
                                <Icon name="clock-outline" size={12} color="#999" />
                                <Text style={styles.notifTime}> {item.created_at ? moment(item.created_at).fromNow() : ''}</Text>
                            </View>
                        </View>
                        </TouchableOpacity>
                    )}
                />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { paddingTop: 50, paddingBottom: 40, paddingHorizontal: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bellButton: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, backgroundColor: '#FFD700', borderRadius: 4, borderWidth: 2, borderColor: COLORS.primary },
  logoContainer: { alignItems: 'center', marginTop: 20, marginBottom: 20, width: width - 50, alignSelf: 'center' },
  mainLogo: { width: '100%', height: 80 }, 
  welcomeContainer: { marginTop: 10 },
  greetingText: { color: '#E0E0E0', fontSize: 14, fontWeight: '500' },
  usernameText: { color: 'white', fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 },
  contentContainer: { flex: 1, paddingHorizontal: 0, marginTop: 25 }, 
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#1A1A1A', marginBottom: 15, paddingHorizontal: 20 },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, paddingHorizontal: 20 },
  actionCard: { width: '23%', backgroundColor: 'white', borderRadius: 15, paddingVertical: 12, alignItems: 'center', elevation: 4 },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 11, fontWeight: '700', color: '#444' },
  carouselCard: { width: CARD_WIDTH, marginRight: CARD_MARGIN, backgroundColor: 'white', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 0, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  carouselIcon: { width: 55, height: 55, borderRadius: 12, backgroundColor: '#FF9100', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  carouselImage: { width: 60, height: 60, borderRadius: 12, marginRight: 15, backgroundColor: '#eee' },
  carouselTextContainer: { flex: 1, paddingRight: 10 },
  carouselTitle: { fontWeight: 'bold', color: '#333', fontSize: 16, marginBottom: 4 },
  carouselBody: { color: '#666', fontSize: 13, marginBottom: 4 },
  carouselTime: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD', marginHorizontal: 4 },
  activeDot: { backgroundColor: COLORS.primary, width: 20 },
  recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginRight: 15, width: width - 80, elevation: 3 },
  recentIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  recentTitle: { fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 2 },
  recentSub: { color: '#888', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F0F0F0', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  notifItem: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 15, marginBottom: 12, alignItems: 'center', elevation: 2 },
  notifImage: { width: 70, height: 50, borderRadius: 8, backgroundColor: '#eee' },
  notifIconBox: { width: 50, height: 50, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  notifTitle: { fontWeight: 'bold', color: '#333', fontSize: 14, marginBottom: 2 },
  notifBody: { color: '#666', fontSize: 12 },
  notifTime: { color: '#888', fontSize: 11 },
  detailImage: { width: '100%', height: 200, borderRadius: 15, marginBottom: 15 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  detailTime: { fontSize: 12, color: '#888', marginBottom: 15 },
  detailBody: { fontSize: 15, color: '#444', lineHeight: 22 },
  backBtn: { marginTop: 30, backgroundColor: COLORS.primary, padding: 12, borderRadius: 10, alignItems: 'center' }
});

export default HomeScreen;