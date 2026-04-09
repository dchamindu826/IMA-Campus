import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import COLORS from '../constants/colors';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fName: '', lName: '', phone: '', directPhone: '', nic: '',
    houseNo: '', streetName: '', village: '', town: '', district: '', password: ''
  });
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'success' });

  const handleRegister = async () => {
    // Backend එකට අනුව fName, lName, phone, nic සහ password අනිවාර්යයි
    if (!formData.fName || !formData.lName || !formData.phone || !formData.nic || !formData.password) {
      setAlertConfig({ 
        title: 'Missing Info', 
        msg: 'Please fill all mandatory fields (First Name, Second Name, Phone, NIC, and Password).', 
        type: 'error' 
      });
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fName: formData.fName,
        lName: formData.lName,
        phone: formData.phone,
        directPhone: formData.directPhone,
        nic: formData.nic,
        password: formData.password,
        houseNoVal: formData.houseNo, 
        streetNameVal: formData.streetName,
        villageVal: formData.village,
        townVal: formData.town,
        districtVal: formData.district
      };

      const response = await api.post('/auth/register', payload);
      
      setAlertConfig({ title: 'Success', msg: 'Account created successfully!', type: 'success' });
      setAlertVisible(true);
      
      setTimeout(() => {
        setAlertVisible(false);
        navigation.navigate('Login');
      }, 2000);

    } catch (error) {
      let errorMsg = "Registration failed. Please try again.";
      
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          const firstErrorKey = Object.keys(error.response.data.errors)[0];
          errorMsg = error.response.data.errors[firstErrorKey][0];
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      }

      setAlertConfig({ title: 'Error', msg: errorMsg, type: 'error' });
      setAlertVisible(true);
    } finally { 
      setLoading(false); 
    }
  };

  const renderInput = (label, placeholder, key, isMandatory = true, isPassword = false, kbType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label} {isMandatory && <Text style={{color: 'red'}}>*</Text>}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#999"
        style={styles.input}
        secureTextEntry={isPassword}
        keyboardType={kbType}
        value={formData[key]}
        onChangeText={(val) => setFormData({ ...formData, [key]: val })}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'white' }}>
      <CustomAlert isVisible={alertVisible} title={alertConfig.title} message={alertConfig.msg} type={alertConfig.type} onClose={() => setAlertVisible(false)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Image source={require('../assets/logo_white.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          
          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>{renderInput("First Name", "Janith", "fName")}</View>
            <View style={{flex: 1}}>{renderInput("Second Name", "Karunarathna", "lName")}</View>
          </View>

          {renderInput("WhatsApp Number", "07********", "phone", true, false, "numeric")}
          
          {/* Direct Phone එකත් Optional කියලා පෙන්නමු */}
          {renderInput("Direct Number (Optional)", "07********", "directPhone", false, false, "numeric")}
          
          {renderInput("NIC Number", "991922757V", "nic")}

          {/* 🔥 Address Details වලට වෙනම මාතෘකාවක් දැම්මා */}
          <Text style={{fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 15, color: '#333'}}>
            Address Details (Optional)
          </Text>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>{renderInput("House No", "102/A", "houseNo", false)}</View>
            <View style={{flex: 2}}>{renderInput("Street Name", "Wijitha Mawatha", "streetName", false)}</View>
          </View>

          {renderInput("Village", "Yakkala", "village", false, false)}

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>{renderInput("Town", "Yakkala", "town", false)}</View>
            <View style={{flex: 1}}>{renderInput("District", "Gampaha", "district", false)}</View>
          </View>

          {/* Password එකට පොඩි margin එකක් දැම්මා ලස්සන වෙන්න */}
          <View style={{marginTop: 10}}>
            {renderInput("Password", "At least 8 characters", "password", true, true)}
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Register Now</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerText}>Already have an account? <Text style={{color: COLORS.primary, fontWeight:'bold'}}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, height: 160, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  logo: { width: 160, height: 60 },
  form: { padding: 25 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#eee', color: '#000' },
  row: { flexDirection: 'row' },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 4 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footerText: { textAlign: 'center', marginTop: 20, color: '#666' }
});

export default RegisterScreen;