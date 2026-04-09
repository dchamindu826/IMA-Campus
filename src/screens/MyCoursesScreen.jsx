import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Image, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';

const MyCoursesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [enrolledBusinesses, setEnrolledBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null); 
  const [selectedBatch, setSelectedBatch] = useState(null); 

  useFocusEffect(
    useCallback(() => {
      fetchClassroomData();
    }, [])
  );

  const fetchClassroomData = async () => {
    try {
      const res = await api.get('/classRoom');
      
      let businessesList = [];
      
      if (res.data && res.data.businesses) {
          res.data.businesses.forEach(business => {
              let businessBatches = [];
              
              if (business.batches) {
                  business.batches.forEach(batch => {
                      let batchCourses = [];
                      if (batch.groups) {
                          batch.groups.forEach(group => {
                              if (group.courses) {
                                  group.courses.forEach(course => {
                                      batchCourses.push({
                                          ...course,
                                          groupName: group.name
                                      });
                                  });
                              }
                          });
                      }
                      
                      if (batchCourses.length > 0) {
                          businessBatches.push({
                              id: batch.id,
                              name: batch.name,
                              logo: batch.logo,
                              courses: batchCourses
                          });
                      }
                  });
              }
              
              if (businessBatches.length > 0) {
                  businessesList.push({
                      id: business.id,
                      name: business.name,
                      logo: business.logo,
                      category: business.category,
                      batches: businessBatches
                  });
              }
          });
      }

      setEnrolledBusinesses(businessesList);

      if (selectedBusiness) {
          const updatedBusiness = businessesList.find(b => b.id === selectedBusiness.id);
          setSelectedBusiness(updatedBusiness || null);
          if (selectedBatch && updatedBusiness) {
              const updatedBatch = updatedBusiness.batches.find(b => b.id === selectedBatch.id);
              setSelectedBatch(updatedBatch || null);
          } else {
              setSelectedBatch(null);
          }
      }

    } catch (e) {
      // 🔥 DEBUG MODE: ERROR පෙන්නනවා
      const errorMsg = e.response?.data?.message || JSON.stringify(e.response?.data) || e.message;
      Alert.alert("Debug Error [Classroom Fetch]", `Failed to load classroom data.\n\nError: ${errorMsg}`);
      console.log("Classroom Fetch Error:", e.response?.data || e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassroomData();
  };

  // 🔥 1. RENDER BUSINESS (Horizontal UI Fix)
  const renderBusinessCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.horizontalCard} 
        activeOpacity={0.8}
        onPress={() => setSelectedBusiness(item)}
      >
        <View style={styles.cardImageContainer}>
            {item.logo ? (
                <Image source={{ uri: `${IMAGE_URL}icons/${item.logo}` }} style={styles.cardLogo} resizeMode="contain" />
            ) : (
                <View style={styles.placeholderIcon}><Icon name="book-education-outline" size={30} color={COLORS.primary} /></View>
            )}
        </View>
        <View style={styles.cardDetails}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.batches.length} Enrolled Batches</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#ccc" style={{marginRight: 10}} />
      </TouchableOpacity>
    );
  };

  // 🔥 2. RENDER BATCH (Horizontal UI Fix)
  const renderBatchCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.horizontalCard} 
        activeOpacity={0.8}
        onPress={() => setSelectedBatch(item)}
      >
        <View style={[styles.cardImageContainer, {backgroundColor: '#E8EAF6'}]}>
            {item.logo ? (
                <Image source={{ uri: `${IMAGE_URL}icons/${item.logo}` }} style={styles.cardLogo} resizeMode="contain" />
            ) : (
                <View style={styles.placeholderIcon}><Icon name="school" size={30} color="#1A237E" /></View>
            )}
        </View>
        <View style={styles.cardDetails}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.courses.length} Enrolled Subjects</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#ccc" style={{marginRight: 10}} />
      </TouchableOpacity>
    );
  };

  // 🔥 3. RENDER SUBJECT
  const renderCourseCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.horizontalCard} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CourseContent', { 
            courseId: item.id, 
            courseTitle: item.name 
        })}
      >
        <View style={styles.cardImageContainer}>
            <View style={styles.placeholderIcon}>
                <Icon name="book-open-page-variant" size={26} color={COLORS.primary} />
            </View>
        </View>
        <View style={styles.cardDetails}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.description || item.groupName}</Text>
        </View>
        <Icon name="play-circle" size={28} color={COLORS.primary} style={{marginRight: 10}} />
      </TouchableOpacity>
    );
  };

  const handleBack = () => {
      if (selectedBatch) {
          setSelectedBatch(null); 
      } else if (selectedBusiness) {
          setSelectedBusiness(null); 
      } else {
          navigation.goBack(); 
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {selectedBatch ? (
            <TouchableOpacity onPress={() => setSelectedBatch(null)} style={styles.backBtn}>
                <Icon name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
        ) : selectedBusiness ? (
            <TouchableOpacity onPress={() => setSelectedBusiness(null)} style={styles.backBtn}>
                <Icon name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
        ) : (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Icon name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedBatch ? selectedBatch.name : (selectedBusiness ? selectedBusiness.name : 'My Classroom')}
        </Text>
      </View>

      <View style={styles.content}>
        {loading && !refreshing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
        ) : (
            selectedBatch ? (
                // LEVEL 3: Show Subjects
                <FlatList
                    data={selectedBatch.courses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderCourseCard}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                />
            ) : selectedBusiness ? (
                // LEVEL 2: Show Batches
                <FlatList
                    data={selectedBusiness.batches}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBatchCard}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                />
            ) : (
                // LEVEL 1: Show Businesses
                <FlatList
                    data={enrolledBusinesses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBusinessCard}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="school-outline" size={80} color="#E0E0E0" />
                            <Text style={styles.emptyTitle}>No Courses Found</Text>
                            <Text style={styles.emptyText}>You haven't enrolled in any courses yet or your payment is pending approval.</Text>
                            <TouchableOpacity style={styles.enrollBtn} onPress={() => navigation.navigate('Home')}>
                                <Text style={styles.enrollBtnText}>Browse Courses</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  content: { flex: 1 },

  // 🔥 HORIZONTAL CARD UI FIX 🔥
  horizontalCard: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 15,
      marginBottom: 12,
      alignItems: 'center',
      padding: 10,
      elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
      borderWidth: 1, borderColor: '#F0F0F0'
  },
  cardImageContainer: {
      width: 70,
      height: 70,
      borderRadius: 12,
      backgroundColor: '#F0F4FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
      overflow: 'hidden'
  },
  cardLogo: {
      width: '100%',
      height: '100%'
  },
  placeholderIcon: {
      justifyContent: 'center',
      alignItems: 'center'
  },
  cardDetails: {
      flex: 1,
      justifyContent: 'center'
  },
  cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#222',
      marginBottom: 4
  },
  cardSubtitle: {
      fontSize: 12,
      color: '#777',
      fontWeight: '500'
  },

  emptyContainer: {
      alignItems: 'center',
      marginTop: 80,
      paddingHorizontal: 20
  },
  emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
      marginTop: 15,
      marginBottom: 10
  },
  emptyText: {
      fontSize: 14,
      color: '#777',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 25
  },
  enrollBtn: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: 12,
      elevation: 2
  },
  enrollBtnText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16
  }
});

export default MyCoursesScreen;