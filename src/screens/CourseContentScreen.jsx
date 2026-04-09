import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Modal, Dimensions, Alert, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native'; 
import { WebView } from 'react-native-webview';
import ReactNativeBlobUtil from 'react-native-blob-util'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import api, { IMAGE_URL } from '../services/api';
import COLORS from '../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomAlert from '../components/CustomAlert';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const KNOWN_TABS = [
    { key: 'liveClasses', title: 'Live Classes', type: 'live' },
    { key: 'recordings', title: 'Recordings', type: 'recording' },
    { key: 'documents', title: 'Documents', type: 'document' },
    { key: 'papers', title: 'MCQ Papers', type: 'document' },
    { key: 'sPapers', title: 'Structured Papers', type: 'document' }
];

const getFilePath = (itemId) => {
    return `${RNFS.DocumentDirectoryPath}/f_${itemId}.mp4`;
};

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
    const { userToken } = useContext(AuthContext);

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
                        const progressStr = pVal === 100 ? "Saving..." : `${pVal}%`;
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
        if (!item.zoomMeetingId || item.zoomMeetingId === '') {
            Alert.alert("Notice", "No available offline access for this recording.");
            return;
        }

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
            const cleanZoomId = String(item.zoomMeetingId).replace(/\s+/g, '');
            const encodedId = encodeURIComponent(cleanZoomId);
            
            const res = await api.get(`/getDownloadRecording/${encodedId}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            
            const { download_url, file_size } = res.data;

            if (!download_url) {
                Alert.alert("Error", "Download link not found in the response.");
                return;
            }

            startInAppDownload(download_url, file_size, item);

        } catch (e) {
            // 🔥 DEBUG FIX: හරියටම API එකට යන URL එක පෙන්වනවා පිටින් Test කරගන්න!
            const cleanZoomId = String(item.zoomMeetingId).replace(/\s+/g, '');
            const testApiUrl = `${api.defaults.baseURL}/getDownloadRecording/${cleanZoomId}`;
            
            const status = e.response ? e.response.status : 'Network Error';
            const serverMsg = e.response?.data?.message || JSON.stringify(e.response?.data) || e.message;
            
            Alert.alert(
                `Download Error (${status})`, 
                `Zoom ID: ${item.zoomMeetingId}\n\nServer Msg: ${serverMsg}\n\nTest this API in browser to verify:\n${testApiUrl}\n\nIf it says 404, it means Zoom has deleted this recording.`,
                [{ text: "OK" }]
            );
            setProgress(null);
        }
    };

    const startInAppDownload = async (download_url, file_size, itemData) => {
        setProgress("0%"); 
        const initialStatus = { percent: '0%', total: file_size };
        const currentActive = await AsyncStorage.getItem('active_downloads');
        const activeParsed = currentActive ? JSON.parse(currentActive) : {};
        await AsyncStorage.setItem('active_downloads', JSON.stringify({ ...activeParsed, [itemData.id]: initialStatus }));

        const localPath = getFilePath(itemData.id);
        if (await RNFS.exists(localPath)) await RNFS.unlink(localPath);

        const intervalId = startPolling(itemData.id, file_size);

        const task = ReactNativeBlobUtil.config({
            path: localPath,
            fileCache: true
        }).fetch('GET', download_url);

        taskRef.current = task; 

        task.then(async (resFile) => {
            clearInterval(intervalId);
            setProgress(null); 
            taskRef.current = null;

            try {
                const dlRes = await AsyncStorage.getItem('my_downloads');
                let dList = dlRes ? JSON.parse(dlRes) : [];
                
                if (!dList.find(d => d.id === itemData.id)) {
                    dList.push({ 
                        id: itemData.id, 
                        title: itemData.title, 
                        localPath: resFile.path(), 
                        type: 'recording', 
                        date: new Date().toLocaleDateString() 
                    });
                    await AsyncStorage.setItem('my_downloads', JSON.stringify(dList));
                }
                
                const actRes = await AsyncStorage.getItem('active_downloads');
                let actList = actRes ? JSON.parse(actRes) : {};
                delete actList[itemData.id];
                await AsyncStorage.setItem('active_downloads', JSON.stringify(actList));

                if (onDownloadComplete) onDownloadComplete();
            } catch (err) {
                console.log("Save Storage Error", err);
            }
        })
        .catch(async (err) => {
            clearInterval(intervalId);
            setProgress(null);
            taskRef.current = null;
            if (err && err.message && !err.message.includes('cancel')) {
                Alert.alert("Download Failed", "Something went wrong. Please check your internet connection.");
            }
        });
    };

    return (
        <>
            <TouchableOpacity onPress={handlePress} style={[styles.downloadBtn, progress !== null && { borderColor: COLORS.primary, borderWidth: 1 }]}>
                {progress !== null ? (
                    <View style={styles.progressWrapper}>
                        <View style={[styles.progressFill, { width: progress === "Saving..." ? "100%" : progress }]} />
                        <Text style={styles.progressTextSmall}>
                            {progress === "Saving..." ? "Saving..." : `${progress} Done`}
                        </Text>
                        <View style={{position:'absolute', right: 8}}>
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
            <CancelConfirmModal visible={showCancelModal} onConfirm={handleCancel} onCancel={() => setShowCancelModal(false)} />
        </>
    );
};

// 🔥 CONTENT GROUP LOGIC (Admin panel එකේ හදපු Content Groups වලින් ලස්සනට Group වෙනවා)
const SectionedContentList = ({ tabKey, type, data, contentGroups, onPlay, onDownloadComplete, onSaveRecent }) => {
  if (!data || data.length === 0) {
      let emptyMsg = "No content available yet.";
      if (tabKey === 'liveClasses') emptyMsg = "No available live classes.";
      else if (tabKey === 'recordings') emptyMsg = "No available recordings.";
      else if (tabKey === 'documents') emptyMsg = "No available documents.";
      else if (tabKey === 'papers') emptyMsg = "No available MCQ papers.";
      else if (tabKey === 'sPapers') emptyMsg = "No available structured papers.";

      return (
        <View style={styles.emptyContainer}>
          <Icon name="folder-open-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>{emptyMsg}</Text>
        </View>
      );
  }
   
  const isDocumentType = type === 'document';
  
  const groupedData = {};
  const ungroupedKey = "General Content";

  data.forEach(item => {
      const groupId = item.content_group_id;
      let groupName = ungroupedKey;
      
      if (groupId && contentGroups && contentGroups.length > 0) {
          const matchedGroup = contentGroups.find(g => g.id === groupId);
          if (matchedGroup) {
              groupName = matchedGroup.title;
          }
      }
      
      if (!groupedData[groupName]) {
          groupedData[groupName] = [];
      }
      groupedData[groupName].push(item);
  });

  // Admin Panel එකේ දාලා තියෙන Order එකට Groups ටික හදාගන්නවා
  const orderedKeys = [];
  if (contentGroups && contentGroups.length > 0) {
      contentGroups.forEach(cg => {
          if (groupedData[cg.title]) {
              orderedKeys.push(cg.title);
          }
      });
  }
  Object.keys(groupedData).forEach(key => {
      if (!orderedKeys.includes(key)) {
          orderedKeys.push(key);
      }
  });

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {orderedKeys.map((groupName, index) => {
        const itemsInGroup = groupedData[groupName];
        return (
          <View key={index} style={styles.monthSection}>
            {/* 🔥 මෙතන තමයි Content Group එකේ නම ලස්සනට වැටෙන්නේ! */}
            <View style={styles.monthHeader}><Text style={styles.monthHeaderText}>{groupName}</Text></View>
            
            {itemsInGroup.map((item) => {
              const showDownloadBtn = type === 'recording' && item.zoomMeetingId && item.zoomMeetingId !== '';

              return (
                <View key={`${type}_${item.id}`} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.date ? <Text style={styles.itemDate}>{item.date}</Text> : null}
                  </View>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                        onPress={() => {
                            if (isDocumentType) {
                                const docUrl = item.link || item.url || item.file || item.documentUrl || item.document || item.pdf || item.docPath || item.fileName;
                                if (docUrl) {
                                    let formattedLink = String(docUrl).trim();
                                    if (!formattedLink.startsWith('http')) {
                                        if (formattedLink.includes('storage/documents/')) {
                                            formattedLink = 'https://www.imacampus.lk/' + formattedLink;
                                        } else {
                                            formattedLink = 'https://www.imacampus.lk/storage/documents/' + formattedLink;
                                        }
                                    }
                                    Linking.openURL(formattedLink).catch(err => {
                                        Alert.alert('Error', 'Could not open document. Please check your browser.');
                                    });
                                    if(onSaveRecent) onSaveRecent(item);
                                } else {
                                    Alert.alert('Error', 'Document link is missing.');
                                }
                            } else {
                                onPlay(item);
                            }
                        }}
                        style={[styles.watchBtn, !showDownloadBtn && { flex: 1, marginRight: 0 }]}
                    >
                      <Icon name={isDocumentType ? "file-eye-outline" : "play-circle-outline"} size={18} color="white" style={{marginRight: 8}} />
                      <Text style={styles.watchBtnText}>{isDocumentType ? 'View' : 'Watch Online'}</Text>
                    </TouchableOpacity>

                    {showDownloadBtn && (
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

const CourseContentScreen = ({ route, navigation }) => {
  const { courseId, courseTitle } = route.params;
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingItem, setPlayingItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'success' });
  
  const [dynamicTabs, setDynamicTabs] = useState(KNOWN_TABS); 
  const [activeTab, setActiveTab] = useState(route.params?.activeTab || 'liveClasses'); 
   
  useFocusEffect(useCallback(() => {
    let isActive = true;
    const loadData = async () => {
      try {
        const res = await api.get(`/viewModule/${courseId}`);
        if (isActive) {
            setContent(res.data);
        }
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

  const saveToRecent = async (item) => {
      try {
          const itemTitle = item.title || item.name || "Course Item";
          const cTitle = courseTitle || "Course";
          const newItem = { courseId, title: itemTitle, courseTitle: cTitle };

          const existingHistory = await AsyncStorage.getItem('recent_activity');
          let historyArray = existingHistory ? JSON.parse(existingHistory) : [];
          historyArray = historyArray.filter(h => h.title !== newItem.title);
          historyArray.unshift(newItem);
          if (historyArray.length > 5) historyArray.pop();

          await AsyncStorage.setItem('recent_activity', JSON.stringify(historyArray));
      } catch (error) {}
  };

  const handlePlayVideo = (item) => {
      const videoLink = item.link || item.url || item.file;
      if (videoLink) {
          setPlayingItem({ ...item, link: videoLink }); 
          saveToRecent(item);
      } else {
          Alert.alert("Error", "Video link is unavailable.");
      }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const status = content ? parseInt(content.paidStatus) : 0;

  if (content && status === -1) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#D32F2F" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{courseTitle}</Text>
            </View>
            <View style={styles.messageContainer}>
                <Icon name="clock-time-four-outline" size={80} color="#FF9800" />
                <Text style={styles.messageTitle}>Payment Pending</Text>
                <Text style={styles.messageBody}>Your bank slip is currently under review. Access will be granted automatically once approved.</Text>
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
                <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#D32F2F" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{courseTitle}</Text>
            </View>
            <View style={styles.messageContainer}>
                <Icon name="lock-alert" size={80} color={COLORS.primary} />
                <Text style={styles.messageTitle}>Access Denied</Text>
                <Text style={styles.messageBody}>You do not have access to this course. Please enroll to view content.</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{courseTitle}</Text>
      </View>

      <View style={styles.customTabBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customTabBar}>
              {dynamicTabs.map((tab) => (
                  <TouchableOpacity 
                      key={tab.key}
                      style={[styles.customTab, activeTab === tab.key && styles.customTabActive]} 
                      onPress={() => setActiveTab(tab.key)}
                  >
                      <Text style={[styles.customTabText, activeTab === tab.key && styles.customTabTextActive]}>
                          {tab.title}
                      </Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      <View style={{flex: 1}}>
          {activeTab && (() => {
              const currentTabConfig = dynamicTabs.find(t => t.key === activeTab);
              const currentType = currentTabConfig ? currentTabConfig.type : 'video';
              
              const currentData = content ? content[activeTab] || [] : [];
              const contentGroups = content ? content.contentGroups : [];

              return (
                  <SectionedContentList 
                      tabKey={activeTab} 
                      type={currentType} 
                      data={currentData} 
                      contentGroups={contentGroups} 
                      onPlay={handlePlayVideo} 
                      onDownloadComplete={showDownloadSuccess}
                      onSaveRecent={saveToRecent}
                  />
              );
          })()}
      </View>

      <Modal visible={!!playingItem} animationType="slide" onRequestClose={() => setPlayingItem(null)}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={styles.playerHeader}>
             <TouchableOpacity onPress={() => setPlayingItem(null)}><Icon name="close" size={30} color="white" /></TouchableOpacity>
             <Text style={{color: 'white', fontWeight: 'bold', flex: 1, marginLeft: 15}} numberOfLines={1}>{playingItem?.title}</Text>
          </View>
          
          {playingItem?.link && (() => {
              let finalVideoUrl = playingItem.link;
              if (finalVideoUrl.includes('vimeo.com') && !finalVideoUrl.includes('player.vimeo.com')) {
                  let urlParts = finalVideoUrl.split('vimeo.com/');
                  if (urlParts.length > 1) {
                      let vimeoId = urlParts[1].split('?')[0].split('/')[0]; 
                      finalVideoUrl = `https://player.vimeo.com/video/${vimeoId}`;
                  }
              }
              return (
                 <WebView source={{ uri: finalVideoUrl, headers: { 'Referer': 'https://www.imacampus.lk/' } }} style={{ flex: 1 }} allowsFullscreenVideo={true} javaScriptEnabled={true} domStorageEnabled={true} originWhitelist={['*']} />
              );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' }, 
  header: { padding: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' }, 
  headerTitle: { fontSize: 18, fontWeight: '800', marginLeft: 15, color: '#D32F2F', flex: 1 }, 
  
  customTabBarContainer: { maxHeight: 65, minHeight: 65, marginBottom: 5, marginTop: 5 },
  customTabBar: { flexDirection: 'row', backgroundColor: '#E0E0E0', marginHorizontal: 15, borderRadius: 10, padding: 4, alignItems: 'center' },
  customTab: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, minWidth: 100 },
  customTabActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  customTabText: { fontWeight: 'bold', fontSize: 13, color: '#666666' },
  customTabTextActive: { color: COLORS.primary },

  tabContent: { flex: 1, padding: 15 },
  itemCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 12, elevation: 3 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemDate: { fontSize: 11, color: '#888', marginTop: 4 }, 
  itemInfo: { flex: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  watchBtn: { backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', flex: 0.6, justifyContent: 'center' },
  watchBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  downloadBtn: { backgroundColor: '#F0F0F0', borderRadius: 12, flex: 0.38, alignItems: 'center', justifyContent: 'center', height: 42, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0' },
  downloadBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  progressWrapper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFEAEA', zIndex: 1 },
  progressTextSmall: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, zIndex: 10, position: 'absolute', left: 10 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthSection: { marginBottom: 25 },
  monthHeader: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 15, borderTopRightRadius: 10, borderBottomRightRadius: 10, marginBottom: 12, alignSelf: 'flex-start', marginLeft: -15 },
  monthHeaderText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 50 },
  emptyText: { color: '#999', marginTop: 10, fontWeight: 'bold', textAlign: 'center' },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'black' },
  messageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  messageTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  messageBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  goBackBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10 },
  goBackText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

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