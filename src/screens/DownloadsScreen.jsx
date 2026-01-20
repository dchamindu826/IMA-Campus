import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import COLORS from '../constants/colors';
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

const DownloadsScreen = () => {
  const [recordings, setRecordings] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'success' });
  const [itemToDelete, setItemToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  // STORAGE LIMIT 5GB (5 * 1024)
  const STORAGE_LIMIT_MB = 5120; 

  useFocusEffect(useCallback(() => { loadDownloads(); }, []));

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const res = await AsyncStorage.getItem('my_downloads');
      const items = res ? JSON.parse(res) : [];
      let totalSize = 0;
      const validItems = [];
      for (let item of items) {
        if (await RNFS.exists(item.localPath)) {
          const stats = await RNFS.stat(item.localPath);
          const sizeMB = parseInt(stats.size) / (1024 * 1024);
          totalSize += sizeMB;
          validItems.push({ ...item, size: sizeMB.toFixed(1) });
        }
      }
      setRecordings(validItems);
      setTotalStorageUsed(totalSize);
    } catch (e) { } finally { setLoading(false); }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setAlertConfig({ title: 'Delete Video', msg: 'Are you sure you want to delete this video?', type: 'error' });
    setAlertVisible(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await RNFS.unlink(itemToDelete.localPath);
      const res = await AsyncStorage.getItem('my_downloads');
      const items = res ? JSON.parse(res) : [];
      await AsyncStorage.setItem('my_downloads', JSON.stringify(items.filter(i => i.id !== itemToDelete.id)));
      setAlertVisible(false); setItemToDelete(null); loadDownloads();
    } catch (e) { setAlertConfig({ title: 'Error', msg: 'Deletion failed.', type: 'error' }); setAlertVisible(true); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomAlert isVisible={alertVisible} title={alertConfig.title} message={alertConfig.msg} type={alertConfig.type} onClose={itemToDelete ? handleDelete : () => setAlertVisible(false)} />
      <View style={styles.headerArea}><Text style={styles.headerText}>My Downloads</Text><Text style={styles.subHeaderText}>Watch your recordings offline</Text></View>
      <View style={styles.storageBox}>
        <View style={styles.storageHeader}><Text style={styles.storageLabel}>Total Storage Usage</Text><Text style={styles.storageValue}>{totalStorageUsed.toFixed(1)} MB / {STORAGE_LIMIT_MB} MB</Text></View>
        <View style={styles.progressBarContainer}><View style={[styles.progressBar, { width: `${Math.min((totalStorageUsed / STORAGE_LIMIT_MB) * 100, 100)}%` }]} /></View>
      </View>
      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} /> : (
        <FlatList data={recordings} keyExtractor={(item) => item.id.toString()} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Icon name="cloud-off-outline" size={60} color="#ccc" /><Text style={{ color: '#999', marginTop: 10 }}>No downloads found.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <TouchableOpacity onPress={() => setSelectedVideo(item.localPath)}><Icon name="play-circle" size={50} color={COLORS.primary} /></TouchableOpacity>
              <View style={styles.itemDetails}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.metaText}>{item.size} MB | {item.date}</Text></View>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}><Icon name="trash-can-outline" size={22} color="#FF5252" /></TouchableOpacity>
            </View>
          )} />
      )}
      <Modal visible={!!selectedVideo} animationType="slide" onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.playerWrapper}><Video source={{ uri: `file://${selectedVideo}` }} style={styles.fullScreenVideo} controls={true} resizeMode="contain" onEnd={() => setSelectedVideo(null)} /><TouchableOpacity style={styles.closePlayerBtn} onPress={() => setSelectedVideo(null)}><Icon name="close" size={30} color="white" /></TouchableOpacity></View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  headerArea: { paddingHorizontal: 25, paddingTop: 10 },
  headerText: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  subHeaderText: { fontSize: 13, color: '#888', marginTop: 2 },
  storageBox: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 25, elevation: 5 },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  storageLabel: { fontSize: 13, fontWeight: 'bold', color: '#444' },
  storageValue: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  progressBarContainer: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: COLORS.primary },
  itemCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, marginBottom: 15, borderRadius: 22, alignItems: 'center', elevation: 3 },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#333' },
  metaText: { fontSize: 11, color: '#888', marginTop: 5 },
  deleteBtn: { padding: 10 },
  playerWrapper: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  fullScreenVideo: { width: width, height: height * 0.8 },
  closePlayerBtn: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 30 }
});

export default DownloadsScreen;