import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Warning එක මෙතනින් fix වෙනවා
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import { fetchHomeData, IMAGE_URL } from '../services/api';

const CoursesScreen = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await fetchHomeData();
      if (data && data.businesses) {
        setCourses(data.businesses);
        setFiltered(data.businesses);
      }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  const handleSearch = (text) => {
    setSearch(text);
    const filterData = courses.filter(item => item.name.toLowerCase().includes(text.toLowerCase()));
    setFiltered(filterData);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CourseDetails', { businessData: item })}>
      <View style={styles.imageBox}><Image source={{ uri: `${IMAGE_URL}icons/${item.logo}` }} style={styles.logo} resizeMode="contain" /></View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
      <View style={styles.btn}><Text style={styles.btnText}>View Program</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerArea}>
        <Text style={styles.header}>All Programs</Text>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#ffffff" />
          <TextInput placeholder="Search classes..." style={styles.input} value={search} onChangeText={handleSearch} />
        </View>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop: 50}} /> : (
        <FlatList data={filtered} numColumns={2} keyExtractor={item => item.id.toString()} renderItem={renderItem} contentContainerStyle={{padding: 10}} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  headerArea: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: 'white', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  header: { fontSize: 26, fontWeight: '900', color: '#1A1A1A', marginBottom: 15 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ce0808', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#000' },
  card: { flex: 1, backgroundColor: 'white', margin: 8, padding: 15, borderRadius: 20, alignItems: 'center', elevation: 4 },
  imageBox: { width: '100%', height: 100, backgroundColor: '#f9f9f9', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logo: { width: '85%', height: '85%' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#333', height: 40 },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, marginTop: 10 },
  btnText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});
export default CoursesScreen;