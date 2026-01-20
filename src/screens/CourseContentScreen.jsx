import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Modal, Dimensions, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native'; 
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { WebView } from 'react-native-webview';
import ReactNativeBlobUtil from 'react-native-blob-util'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import api from '../services/api';
import COLORS from '../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');
const Tab = createMaterialTopTabNavigator();

// --- HELPER: Get Consistent Path ---
const getFilePath = (itemId) => {
    return `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/f_${itemId}.mp4`;
};

// --- COMPONENT: Beautiful Confirmation Modal ---
const CancelConfirmModal = ({ visible, onConfirm, onCancel }) => {
    return (
        <Modal transparent={true} visible={visible} animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <View style={styles.confirmModalContainer}>
                    <View style={styles.confirmIconContainer}>
                        <Icon name="close-circle-outline" size={50} color="#FF5252" />
                    </View>
                    <Text style={styles.confirmTitle}>Cancel Download?</Text>
                    <Text style={styles.confirmMessage}>This will stop the download and remove partial files.</Text>
                    
                    <View style={styles.confirmBtnRow}>
                        <TouchableOpacity onPress={onCancel} style={styles.confirmBtnNo}>
                            <Text style={styles.confirmBtnNoText}>Keep </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onConfirm} style={styles.confirmBtnYes}>
                            <Text style={styles.confirmBtnYesText}>Yes, Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- COMPONENT: Self-Managed Download Button ---
const DownloadButton = ({ item, onDownloadComplete }) => {
    const [progress, setProgress] = useState(null); 
    const [showCancelModal, setShowCancelModal] = useState(false);
    const taskRef = useRef(null); 

    useEffect(() => {
        validateAndSyncState();
    }, []);

    const validateAndSyncState = async () => {
        try {
            const activeJSON = await AsyncStorage.getItem('active_downloads');
            if (activeJSON) {
                let active = JSON.parse(activeJSON);
                if (active[item.id]) {
                    const path = getFilePath(item.id);
                    const exists = await RNFS.exists(path);
                    if (exists) {
                        setProgress(active[item.id].percent || "0%");
                        startPolling(item.id, active[item.id].total);
                    } else {
                        delete active[item.id];
                        await AsyncStorage.setItem('active_downloads', JSON.stringify(active));
                        setProgress(null);
                    }
                }
            }
        } catch (e) { console.log(e); }
    };

    const startPolling = (itemId, totalSize) => {
        const interval = setInterval(async () => {
            const path = getFilePath(itemId);
            try {
                const exists = await RNFS.exists(path);
                if (exists) {
                    const stats = await RNFS.stat(path);
                    const currentBytes = parseInt(stats.size);
                    const totalBytes = parseInt(totalSize);
                    
                    if (totalBytes > 0) {
                        let pVal = Math.min(Math.round((currentBytes / totalBytes) * 100), 100);
                        const progressStr = `${pVal}%`;
                        setProgress(progressStr);
                        
                        const activeJSON = await AsyncStorage.getItem('active_downloads');
                        if (activeJSON) {
                            let active = JSON.parse(activeJSON);
                            if (active[itemId]) {
                                active[itemId].percent = progressStr;
                                await AsyncStorage.setItem('active_downloads', JSON.stringify(active));
                            }
                        }
                    }
                }
            } catch (e) { }
        }, 1000); 
        return interval;
    };

    const handleCancel = async () => {
        setShowCancelModal(false);
        setProgress(null); 

        if (taskRef.current) {
            try { taskRef.current.cancel((err) => {}); } catch (e) {}
        }

        const path = getFilePath(item.id);
        if (await RNFS.exists(path)) await RNFS.unlink(path);

        const activeJSON = await AsyncStorage.getItem('active_downloads');
        let active = activeJSON ? JSON.parse(activeJSON) : {};
        delete active[item.id];
        await AsyncStorage.setItem('active_downloads', JSON.stringify(active));
    };

    const handlePress = async () => {
        if (progress !== null) {
            setShowCancelModal(true);
            return;
        }

        const storageRes = await AsyncStorage.getItem('my_downloads');
        let downloads = storageRes ? JSON.parse(storageRes) : [];
        if (downloads.find(d => d.id === item.id)) {
            return Alert.alert("Saved", "Already downloaded. Check 'Downloads' tab.");
        }

        try {
            const res = await api.get(`/getDownloadRecording/${item.zoomMeetingId}`);
            const { download_url, file_size } = res.data;

            if (!download_url) {
                Alert.alert("Error", "Download link not found");
                return;
            }

            setProgress("0%"); 

            const initialStatus = { percent: '0%', total: file_size };
            const currentActive = await AsyncStorage.getItem('active_downloads');
            const activeParsed = currentActive ? JSON.parse(currentActive) : {};
            await AsyncStorage.setItem('active_downloads', JSON.stringify({ ...activeParsed, [item.id]: initialStatus }));

            const localPath = getFilePath(item.id);
            if (await RNFS.exists(localPath)) await RNFS.unlink(localPath);

            const intervalId = startPolling(item.id, file_size);

            const task = ReactNativeBlobUtil.config({
                path: localPath,
                fileCache: true,
                addAndroidDownloads: {
                    useDownloadManager: true, 
                    notification: true,
                    title: item.title,
                    description: 'Downloading video...',
                    mime: 'video/mp4',
                    mediaScannable: true,
                    path: localPath,
                }
            })
            .fetch('GET', download_url);

            taskRef.current = task; 

            task.then(async (resFile) => {
                clearInterval(intervalId);
                const dlRes = await AsyncStorage.getItem('my_downloads');
                let dList = dlRes ? JSON.parse(dlRes) : [];
                
                if (!dList.find(d => d.id === item.id)) {
                    dList.push({ 
                        id: item.id, 
                        title: item.title, 
                        localPath: resFile.path(), 
                        type: 'recording', 
                        date: new Date().toLocaleDateString() 
                    });
                    await AsyncStorage.setItem('my_downloads', JSON.stringify(dList));
                }
                
                const actRes = await AsyncStorage.getItem('active_downloads');
                let actList = actRes ? JSON.parse(actRes) : {};
                delete actList[item.id];
                await AsyncStorage.setItem('active_downloads', JSON.stringify(actList));

                setProgress(null); 
                taskRef.current = null;
                if (onDownloadComplete) onDownloadComplete();
            })
            .catch(async (err) => {
                clearInterval(intervalId);
                if (err && err.message && !err.message.includes('cancel')) {
                    setProgress(null);
                    taskRef.current = null;
                }
            });

        } catch (e) {
            Alert.alert("Error", "Could not start download.");
            setProgress(null);
        }
    };

    return (
        <>
            <TouchableOpacity 
                onPress={handlePress} 
                style={[styles.downloadBtn, progress !== null && { borderColor: COLORS.primary, borderWidth: 1 }]}
            >
                {progress !== null ? (
                    <View style={styles.progressWrapper}>
                        <View style={[styles.progressFill, { width: progress }]} />
                        {/* CHANGED: Show 'Downloading..' instead of % */}
                        <Text style={styles.progressTextSmall}>Downloading...</Text>
                        <View style={{position:'absolute', right: 8}}>
                            {/* CHANGED: X icon for cancel */}
                            <Icon name="close" size={16} color="#333" />
                        </View>
                    </View>
                ) : (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Icon name="cloud-download-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.downloadBtnText}>Offline</Text>
                    </View>
                )}
            </TouchableOpacity>

            <CancelConfirmModal 
                visible={showCancelModal} 
                onConfirm={handleCancel} 
                onCancel={() => setShowCancelModal(false)} 
            />
        </>
    );
};

// --- List Components ---
const SectionedContentList = ({ type, data, months, onPlay, onDownloadComplete }) => {
  if (!data || data.length === 0) return <View style={styles.emptyContainer}><Icon name="folder-open-outline" size={60} color="#ccc" /><Text style={styles.emptyText}>No {type} found.</Text></View>;
  
  const displayMonths = months && months.length > 0 ? months : ["All Content"];

  return (
    <ScrollView style={styles.tabContent}>
      {displayMonths.map((month) => {
        const filteredData = months && months.length > 0 ? data.filter(item => item.date && item.date.includes(month)) : data;
        if (filteredData.length === 0) return null;

        return (
          <View key={month} style={styles.monthSection}>
            <View style={styles.monthHeader}><Text style={styles.monthHeaderText}>{month}</Text></View>
            {filteredData.map((item) => {
              return (
                <View key={`${type}_${item.id}`} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDate}>{item.date}</Text>
                  </View>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => onPlay(item)} style={styles.watchBtn}>
                      <Icon name={type === 'document' ? "file-eye-outline" : "play-circle-outline"} size={18} color="white" style={{marginRight: 8}} />
                      <Text style={styles.watchBtnText}>{type === 'document' ? 'View PDF' : 'Watch Online'}</Text>
                    </TouchableOpacity>

                    {type === 'recording' && item.zoomMeetingId && (
                        <DownloadButton item={item} onDownloadComplete={onDownloadComplete} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
};

// --- Main Screen ---
const CourseContentScreen = ({ route, navigation }) => {
  const { courseId, courseTitle } = route.params;
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingItem, setPlayingItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'success' });
  
  useFocusEffect(useCallback(() => {
    let isActive = true;
    const loadData = async () => {
      try {
        const res = await api.get(`/viewModule/${courseId}`);
        if (isActive) setContent(res.data);
      } catch (e) { if (isActive) Alert.alert("Error", "Sync failed."); }
      finally { if (isActive) setLoading(false); }
    };
    loadData();
    return () => { isActive = false; };
  }, [courseId]));

  const showDownloadSuccess = () => {
      setAlertConfig({ title: "Success", msg: "Download complete! Check Downloads tab.", type: "success" });
      setAlertVisible(true);
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const status = content ? parseInt(content.paidStatus) : 0;

  if (content && status === -1) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{courseTitle}</Text>
            </View>
            <View style={styles.messageContainer}>
                <Icon name="clock-time-four-outline" size={80} color="#FF9800" />
                <Text style={styles.messageTitle}>Payment Pending</Text>
                <Text style={styles.messageBody}>
                    Your bank slip is currently under review. 
                    {"\n\n"}
                    Access will be granted automatically once the admin approves your payment.
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
  }

  if (content && status === 0) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{courseTitle}</Text>
            </View>
            <View style={styles.messageContainer}>
                <Icon name="lock-alert" size={80} color={COLORS.primary} />
                <Text style={styles.messageTitle}>Access Denied</Text>
                <Text style={styles.messageBody}>
                    You do not have access to this course. Please enroll to view content.
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomAlert isVisible={alertVisible} title={alertConfig.title} message={alertConfig.msg} type={alertConfig.type} onClose={() => setAlertVisible(false)} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{courseTitle}</Text>
      </View>

      {content && (
        <Tab.Navigator 
            screenOptions={({ route }) => ({
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: '#999',
                // Updated UI for Tabs (Icons + Cleaner Text)
                tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12, textTransform: 'capitalize', marginLeft: -5 },
                tabBarIndicatorStyle: { backgroundColor: COLORS.primary, height: 3, borderRadius: 3 },
                tabBarStyle: { elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: 'white' },
                tabBarPressColor: '#F8F9FB',
                tabBarShowIcon: true,
                tabBarIconStyle: { width: 22, height: 22 },
                tabBarIcon: ({ color, focused }) => {
                    let iconName;
                    if (route.name === 'Live') iconName = 'broadcast';
                    else if (route.name === 'Recordings') iconName = 'play-circle-outline';
                    else if (route.name === 'Documents') iconName = 'file-document-outline';
                    return <Icon name={iconName} size={22} color={color} />;
                }
            })}
        >
          <Tab.Screen name="Live" children={() => <SectionedContentList type="live" data={content.liveClasses} onPlay={setPlayingItem} />} />
          <Tab.Screen name="Recordings" children={() => <SectionedContentList type="recording" data={content.recordings} onPlay={setPlayingItem} onDownloadComplete={showDownloadSuccess} months={content.recodingMonths} />} />
          <Tab.Screen name="Documents" children={() => <SectionedContentList type="document" data={content.documents} onPlay={setPlayingItem} months={content.documentMonths} />} />
        </Tab.Navigator>
      )}

      <Modal visible={!!playingItem} animationType="slide" onRequestClose={() => setPlayingItem(null)}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={styles.playerHeader}>
             <TouchableOpacity onPress={() => setPlayingItem(null)}><Icon name="close" size={30} color="white" /></TouchableOpacity>
             <Text style={{color: 'white', fontWeight: 'bold', flex: 1, marginLeft: 15}} numberOfLines={1}>{playingItem?.title}</Text>
          </View>
          <WebView source={{ uri: playingItem?.link }} style={{ flex: 1 }} allowsFullscreenVideo={true} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: '#333' },
  tabContent: { flex: 1, padding: 15 },
  itemCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 12, elevation: 3 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemDate: { fontSize: 11, color: '#888', marginTop: 4 }, 
  itemInfo: { flex: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  watchBtn: { backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', flex: 0.6 },
  watchBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  downloadBtn: { 
    backgroundColor: '#F0F0F0', 
    borderRadius: 12, 
    flex: 0.38, 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 42, 
    overflow: 'hidden', 
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  downloadBtnText: { 
    color: COLORS.primary, 
    fontWeight: 'bold', 
    fontSize: 12, 
    marginLeft: 5 
  },
  progressWrapper: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    position: 'relative' 
  },
  progressFill: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    bottom: 0, 
    backgroundColor: '#E0E0E0', 
    zIndex: 1 
  },
  progressTextSmall: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: '#666', 
    zIndex: 10, 
    position: 'absolute', 
    left: 10
  },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthSection: { marginBottom: 25 },
  monthHeader: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 10, marginBottom: 12 },
  monthHeaderText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 50 },
  emptyText: { color: '#999', marginTop: 10 },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'black' },
  
  messageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  messageTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  messageBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  goBackBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10 },
  goBackText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // --- Confirm Modal Styles ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmModalContainer: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  confirmIconContainer: { marginBottom: 15, backgroundColor: '#FFEBEE', padding: 15, borderRadius: 50 },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  confirmMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  confirmBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  confirmBtnNo: { flex: 1, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  confirmBtnYes: { flex: 1, paddingVertical: 12, backgroundColor: '#FF5252', borderRadius: 10, marginLeft: 10, alignItems: 'center' },
  confirmBtnNoText: { color: '#666', fontWeight: 'bold' },
  confirmBtnYesText: { color: 'white', fontWeight: 'bold' },
});

export default CourseContentScreen;