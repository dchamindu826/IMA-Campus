import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Image, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import COLORS from '../constants/colors';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import md5 from 'crypto-js/md5';

// PayHere Import (Hariyatama me widihata thiyenna ona)
import PayHere from '@payhere/payhere-mobilesdk-reactnative';

// ******* CONFIGURATION *******
const MERCHANT_ID = "222646";
// PayHere Secret eka (Production ekedi Backend eken ganna eka wada arakshithai, danata mehema thiyamu)
const MERCHANT_SECRET = "3113931171298094467140764830232859317793"; 
// *****************************

const PaymentMethodScreen = ({ route, navigation }) => {
  // Params hariyatama allaganna
  const { amount, mainPaymentId } = route.params || {};
  
  const [method, setMethod] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [slipImage, setSlipImage] = useState(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', msg: '', type: 'success' });

  useEffect(() => {
    // SDK Status Check
    console.log("PayHere Module Status:", PayHere ? "Loaded" : "Not Loaded");
    // Amount eka enawada balanna
    console.log("Received Amount:", amount, "Payment ID:", mainPaymentId);
  }, [amount, mainPaymentId]);

  const handleOnlinePay = async () => {
    if (!amount || !mainPaymentId) {
        setAlertConfig({ title: "Error", msg: "Invalid Payment Details.", type: "error" });
        setAlertVisible(true);
        return;
    }

    setLoading(true);
    
    try {
        // 1. Amount eka hariyatama Format karaganna (5000 -> "5000.00")
        // PayHere ekata meka aniwaryai
        const formattedAmount = parseFloat(amount).toFixed(2);
        const currency = "LKR";
        const orderId = mainPaymentId.toString(); // String ekak wenna ona

        // 2. Hash eka apima hadamu (Frontend Generation)
        // Hethuwa: Backend eken ena Hash ekai ape Amount ekai match nowunoth wade awul.
        // Formula: md5(merchant_id + order_id + amount + currency + md5(merchant_secret))
        
        const hashedSecret = md5(MERCHANT_SECRET).toString().toUpperCase();
        const hashString = MERCHANT_ID + orderId + formattedAmount + currency + hashedSecret;
        const finalHash = md5(hashString).toString().toUpperCase();

        console.log("Generated Hash:", finalHash);

        // 3. Payment Object eka hadamu
        const paymentObject = {
            sandbox: false,                 // Production Mode (Live)
            merchant_id: MERCHANT_ID,       
            notify_url: "https://ima.lk/api/onlinePaymentSuccessNotify", // Backend Notify URL
            order_id: orderId,              
            items: "IMA Academy Course Fee",
            amount: formattedAmount,        
            currency: currency,             
            hash: finalHash,                
            
            // Student Details (Dummy Data is okay for payments if not strictly required)
            first_name: "Student",
            last_name: "Member",
            email: "student@ima.lk",
            phone: "0777123456",
            address: "IMA Academy",
            city: "Colombo",
            country: "Sri Lanka",
            
            // Optional fields
            delivery_address: "",
            delivery_city: "",
            delivery_country: "",
            custom_1: "",
            custom_2: ""
        };

        console.log("Starting PayHere with:", paymentObject);

        // 4. SDK eka Start karanna
        PayHere.startPayment(
            paymentObject,
            (paymentId) => {
                console.log("Payment Success:", paymentId);
                setLoading(false);
                setAlertConfig({ title: "Success", msg: "Payment Completed Successfully!", type: "success" });
                setAlertVisible(true);
                // Success wunama Home ekata yawanna
                setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }), 2000);
            },
            (errorData) => {
                console.log("Payment Failed:", errorData);
                setLoading(false);
                setAlertConfig({ title: "Failed", msg: "Payment Failed. Please try again.", type: "error" });
                setAlertVisible(true);
            },
            () => {
                console.log("Payment Dismissed");
                setLoading(false);
            }
        );

    } catch (e) {
        console.error("Payment Error:", e);
        setLoading(false);
        setAlertConfig({ title: "Error", msg: "Connection failed. Please check internet.", type: "error" });
        setAlertVisible(true);
    }
  };

  // --- Bank Slip Upload Logic ---
  const pickImage = async () => {
    try {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, selectionLimit: 1 });
        if (result.assets && result.assets.length > 0) setSlipImage(result.assets[0]);
    } catch (error) { console.log("Image Picker Error:", error); }
  };

  const handleSlipUpload = async () => {
    if (!slipImage) {
        setAlertConfig({ title: "Missing Slip", msg: "Select a slip first.", type: "error" });
        setAlertVisible(true);
        return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('mainPaymentId', mainPaymentId);

    // --- NEW LOGIC: Installment ID eka thiyenawan append karanna ---
    if (route.params?.installmentPaymentId) {
        formData.append('installmentPaymentId', route.params.installmentPaymentId);
    }
    // -------------------------------------------------------------

    formData.append('remark', 'Bank Slip Uploaded via App');
    formData.append('slipImg', {
      uri: Platform.OS === 'android' ? slipImage.uri : slipImage.uri.replace('file://', ''),
      type: slipImage.type || 'image/jpeg',
      name: slipImage.fileName || `slip_${Date.now()}.jpg`,
    });

    try {
        // Backend eke uploadSlip endpoint ekata yawanawa
        await api.post('/uploadSlip', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setAlertConfig({ title: "Success", msg: "Slip uploaded! Waiting for approval.", type: "success" });
        setAlertVisible(true);
        setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }), 2000);
    } catch (e) {
        console.error("Slip Upload Error:", e);
        setAlertConfig({ title: "Failed", msg: "Upload failed. Please try again.", type: "error" });
        setAlertVisible(true);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <CustomAlert isVisible={alertVisible} title={alertConfig.title} message={alertConfig.msg} type={alertConfig.type} onClose={() => setAlertVisible(false)} />
      
      <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#333" /></TouchableOpacity>
            <Text style={styles.title}>Payment Method</Text>
            <View style={{width: 24}} /> 
        </View>
        
        <View style={styles.amountCard}>
          <Text style={styles.label}>TOTAL PAYABLE</Text>
          <Text style={styles.amountText}>Rs. {amount ? parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method:</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.card, method === 'online' && styles.activeCard]} onPress={() => setMethod('online')}>
            <Icon name="credit-card-outline" size={32} color={method === 'online' ? 'white' : COLORS.primary} />
            <Text style={[styles.cardTitle, method === 'online' && {color: 'white'}]}>Online Pay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, method === 'bank' && styles.activeCard]} onPress={() => setMethod('bank')}>
            <Icon name="bank-outline" size={32} color={method === 'bank' ? 'white' : COLORS.primary} />
            <Text style={[styles.cardTitle, method === 'bank' && {color: 'white'}]}>Bank Slip</Text>
          </TouchableOpacity>
        </View>

        {/* Online Payment Section */}
        {method === 'online' && (
          <View style={styles.methodContainer}>
            <Text style={styles.infoText}>Pay securely with Credit/Debit card via PayHere.</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={handleOnlinePay} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="shield-check" size={20} color="white" style={{ marginRight: 10 }} />
                    <Text style={styles.btnText}>Pay LKR {parseFloat(amount).toFixed(2)}</Text>
                </View>
                )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bank Slip Section */}
        {method === 'bank' && (
            <View style={styles.methodContainer}>
                <View style={styles.bankDetailsBox}>
                    <Text style={styles.bankHeader}>Bank Details</Text>
                    <Text style={styles.bankRow}>Bank: Bank of Ceylon</Text>
                    <Text style={styles.bankRow}>Acc No: 83525547</Text>
                    <Text style={styles.bankRow}>Branch: Maharagama</Text>
                    <Text style={styles.bankRow}>Name: IMA Campus</Text>
                </View>
                <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                    {slipImage ? <Image source={{ uri: slipImage.uri }} style={styles.uploadedImage} resizeMode="cover" /> : <Icon name="cloud-upload" size={40} color="#aaa" />}
                    {!slipImage && <Text style={{ color: '#aaa', marginTop: 10 }}>Select Slip Image</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSlipUpload} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Upload Slip</Text>}
                </TouchableOpacity>
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  amountCard: { backgroundColor: '#F8F9FB', padding: 25, borderRadius: 20, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  label: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  amountText: { fontSize: 32, fontWeight: '900', color: COLORS.primary, marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15, color: '#444' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { width: '48%', padding: 20, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', elevation: 2 },
  activeCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cardTitle: { marginTop: 10, fontWeight: 'bold', fontSize: 14, color: '#333' },
  methodContainer: { marginTop: 20 },
  infoText: { color: '#666', textAlign: 'center', marginBottom: 15 },
  bankDetailsBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' },
  bankHeader: { fontWeight: 'bold', fontSize: 14, marginBottom: 10, color: '#E65100' },
  bankRow: { marginBottom: 5, color: '#333' },
  uploadBox: { height: 180, backgroundColor: '#FAFAFA', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#DDD', borderStyle: 'dashed', marginBottom: 20 },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 13 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default PaymentMethodScreen;