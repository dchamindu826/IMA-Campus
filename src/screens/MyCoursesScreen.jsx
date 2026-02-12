import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // 🔥 Use SafeAreaView for Notch
import api, { IMAGE_URL } from '../services/api';
import COLORS from '../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MyCoursesScreen = ({ navigation }) => {
  const [enrolled, setEnrolled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null); 
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classRoom');
      setEnrolled(res.data.businesses || []);
    } catch (e) {
      console.log("Error fetching courses", e);
    } finally {
      setLoading(false);
    }
  };

  const goToRecordings = (courseId, courseTitle) => {
    setModalVisible(false);
    navigation.navigate('CourseContent', { courseId, courseTitle });
  };

  const renderBusinessItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => { setSelectedBusiness(item); setModalVisible(true); }}
      activeOpacity={0.8}
    >
      <Image source={{ uri: `${IMAGE_URL}icons/${item.logo}` }} style={styles.logo} resizeMode="contain" />
      <View style={{flex: 1, marginLeft: 15}}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.status}>Tap to view Subjects</Text>
      </View>
      <Icon name="chevron-right" size={25} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Classroom</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={enrolled}
          keyExtractor={item => item.id.toString()}
          renderItem={renderBusinessItem}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          ListEmptyComponent={<Text style={styles.emptyText}>You haven't enrolled in any courses yet.</Text>}
        />
      )}

      {/* Select Subject Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            <FlatList
              data={selectedBusiness?.batches?.[0]?.groups?.[0]?.courses || []}
              keyExtractor={c => c.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.subjectItem} onPress={() => goToRecordings(item.id, item.name)}>
                  <Icon name="book-open-variant" size={20} color={COLORS.primary} />
                  <Text style={styles.subjectName}>{item.name}</Text>
                  <Icon name="play-circle" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  // 🔥 Fixed Header: Added left padding and reduced top margin (handled by SafeAreaView)
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color: '#333', paddingHorizontal: 20 },
  
  // 🔥 Fixed Card: Added margins to prevent shadow cutting
  card: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 15, 
    alignItems: 'center', 
    marginHorizontal: 20, // Space on sides
    
    // Better Shadow
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: { width: 50, height: 50, borderRadius: 10 }, 
  title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { fontSize: 12, color: COLORS.primary, marginTop: 3 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 25, padding: 20, maxHeight: '80%', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subjectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  subjectName: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '600', color: '#333' }
});

export default MyCoursesScreen;