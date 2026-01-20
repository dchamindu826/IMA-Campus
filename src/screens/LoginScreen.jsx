import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import { loginUser } from '../services/api'; 
import { AuthContext } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert'; 

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'error' });

  const handleLogin = async () => {
    if (!username || !password) {
      setAlertConfig({ title: 'Error', msg: 'Please enter both credentials', type: 'error' });
      setAlertVisible(true);
      return;
    }
    setLoading(true);
    try {
      const response = await loginUser(username, password);
      await login(response.token, response.user);
      navigation.replace('MainTabs'); 
    } catch (error) {
      setAlertConfig({ title: 'Login Failed', msg: 'Invalid credentials. Please try again.', type: 'error' });
      setAlertVisible(true);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <CustomAlert isVisible={alertVisible} title={alertConfig.title} message={alertConfig.msg} type={alertConfig.type} onClose={() => setAlertVisible(false)} />
      <LinearGradient colors={[COLORS.primary, '#9B1B1B']} style={styles.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/logo_white.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>Future of Learning</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.headerText}>Welcome Back!</Text>
            
            <View style={styles.inputBox}>
              <Icon name="account-outline" size={22} color="#666" />
              <TextInput 
                placeholder="Phone Number or NIC" 
                placeholderTextColor="#777" // placeholder color එක fix කළා
                style={styles.input} 
                value={username} 
                onChangeText={setUsername} 
                autoCapitalize="none" 
              />
            </View>

            <View style={styles.inputBox}>
              <Icon name="lock-outline" size={22} color="#666" />
              <TextInput 
                placeholder="Password" 
                placeholderTextColor="#777" // placeholder color එක fix කළා
                secureTextEntry 
                style={styles.input} 
                value={password} 
                onChangeText={setPassword} 
              />
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>Login Now</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerText}>Don't have an account? <Text style={{fontWeight:'bold', color: COLORS.primary}}>Register</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 200, height: 70 },
  tagline: { color: 'rgba(255,255,255,0.8)', marginTop: 5, fontSize: 14 },
  formContainer: { backgroundColor: 'white', marginHorizontal: 25, borderRadius: 25, padding: 25, elevation: 10 },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 25, textAlign: 'center' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, height: 55, borderWidth: 1, borderColor: '#eee' },
  input: { flex: 1, marginLeft: 10, color: '#000', fontSize: 15 },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 5 },
  loginBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footerText: { textAlign: 'center', marginTop: 20, color: '#666', fontSize: 14 }
});

export default LoginScreen;