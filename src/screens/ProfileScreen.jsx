import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Platform, KeyboardAvoidingView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import COLORS from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import api, { IMAGE_URL } from '../services/api';
import CustomAlert from '../components/CustomAlert';

const ProfileScreen = ({ navigation }) => {
  const { userInfo, logout, updateUserInfo } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'success' });

  const [form, setForm] = useState({
    fName: '', lName: '', phone: '', directPhone: '', nic: '',
    houseNo: '', streetName: '', village: '', town: '', district: ''
  });

  // User info context eken form ekata load kirima
  useEffect(() => {
    if (userInfo) {
      setForm({
        fName: userInfo.fName || '',
        lName: userInfo.lName || '',
        phone: userInfo.phone || '',
        directPhone: userInfo.directPhone || '',
        nic: userInfo.nic || '',
        houseNo: userInfo.houseNo || '',
        streetName: userInfo.streetName || '',
        village: userInfo.village || '',
        town: userInfo.town || '',
        district: userInfo.district || '',
      });
    }
  }, [userInfo]);

  const showAlert = (title, msg, type) => {
    setAlertConfig({ title, msg, type });
    setAlertVisible(true);
  };

  const handleLogout = async () => {
    await logout();
    // App eka mulata reset kirima
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleImagePick = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (image) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('profileImg', {
      uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
      type: image.type || 'image/jpeg',
      name: image.fileName || 'profile.jpg',
    });

    try {
      const res = await api.post('/updateProfilePic', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Backend eken dena aluth image name eka update kirima
      updateUserInfo({ image: res.data.image || userInfo.image });
      showAlert("Success", "Profile picture updated!", "success");
    } catch (error) {
      showAlert("Error", "Failed to upload image.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await api.post('/updateProfile', form);
      updateUserInfo(form); // Context eka update karanawa
      showAlert("Success", "Profile updated successfully!", "success");
    } catch (error) {
      showAlert("Error", "Failed to update profile. Check your data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, key, kbType = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[key]}
        onChangeText={(text) => setForm({ ...form, [key]: text })}
        keyboardType={kbType}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <CustomAlert isVisible={alertVisible} title={alertConfig.title} message={alertConfig.msg} type={alertConfig.type} onClose={() => setAlertVisible(false)} />
      
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.imageWrapper} onPress={handleImagePick}>
            {userInfo?.image && userInfo.image !== 'default.png' ? (
              <Image source={{ uri: `${IMAGE_URL}userImages/${userInfo.image}` }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultIcon}><Icon name="account" size={60} color="#ccc" /></View>
            )}
            <View style={styles.cameraBtn}>
              {uploading ? <ActivityIndicator size="small" color="white" /> : <Icon name="camera" size={18} color="white" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.headerName}>{userInfo?.fName} {userInfo?.lName}</Text>
          
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={20} color="white" />
            <Text style={styles.logoutText}> Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.row}>
            <View style={{flex:1, marginRight: 10}}>{renderInput("First Name", "fName")}</View>
            <View style={{flex:1}}>{renderInput("Second Name", "lName")}</View>
          </View>
          {renderInput("WhatsApp Number", "phone", "phone-pad")}
          {renderInput("Direct Number", "directPhone", "phone-pad")}
          {renderInput("NIC Number", "nic")}

          <Text style={[styles.sectionTitle, {marginTop: 20}]}>Address Details</Text>
          <View style={styles.row}>
              <View style={{flex:1, marginRight: 10}}>{renderInput("House No", "houseNo")}</View>
              <View style={{flex:2}}>{renderInput("Street Name", "streetName")}</View>
          </View>
          {renderInput("Village", "village")}
          <View style={styles.row}>
              <View style={{flex:1, marginRight: 10}}>{renderInput("Town", "town")}</View>
              <View style={{flex:1}}>{renderInput("District", "district")}</View>
          </View>

          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdateProfile} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Update Profile</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { alignItems: 'center', padding: 30, backgroundColor: COLORS.primary, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  imageWrapper: { position: 'relative', elevation: 10 },
  profileImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: 'white' },
  defaultIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'white' },
  cameraBtn: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#444', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  headerName: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 15 },
  logoutBtn: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  logoutText: { color: 'white', fontWeight: 'bold' },
  formContainer: { padding: 25 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#333', marginBottom: 15 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, color: '#666', marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#eee', color: '#000' },
  row: { flexDirection: 'row' },
  updateBtn: { backgroundColor: COLORS.primary, borderRadius: 15, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;