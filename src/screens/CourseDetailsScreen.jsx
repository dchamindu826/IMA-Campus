import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';

const { width } = Dimensions.get('window');

const CourseDetailsScreen = ({ route, navigation }) => {
  const { businessData } = route.params;
  
  // 🔥 CHECK: 06 Month A/L Course එකද කියලා බලනවා
  const isSpecialFlow = businessData.name.includes("06") || businessData.name.includes("A/L"); 

  const [step, setStep] = useState(isSpecialFlow ? 0 : 1); 
  
  const [selectedStreamFilter, setSelectedStreamFilter] = useState(null); 
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null); 
  const [selectedMonthGroup, setSelectedMonthGroup] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- BATCHES ---
  const batches = useMemo(() => {
      if (businessData.batches && businessData.batches.length > 0) {
          return businessData.batches;
      }
      return [];
  }, [businessData]);

  // --- SUBJECT FILTERING ---
  const filteredSubjects = useMemo(() => {
    if (!selectedMonthGroup?.courses) return [];

    if (!isSpecialFlow) return selectedMonthGroup.courses;

    return selectedMonthGroup.courses.filter(sub => {
        const nameLower = sub.name.toLowerCase();

        if (selectedStreamFilter === 'COMMERCE') {
            return (
                nameLower.includes('commerce') || 
                nameLower.includes('business') || 
                nameLower.includes('accounting') || 
                nameLower.includes('econ') || 
                nameLower.includes('ict') || 
                nameLower.includes('bs') ||
                sub.name.includes("ගිණුම්කරණය") || 
                sub.name.includes("ව්‍යාපාර") || 
                sub.name.includes("ආර්ථික") ||
                sub.name.includes("තොරතුරු")
            );
        } else if (selectedStreamFilter === 'ART') {
            return (
                nameLower.includes('art') || 
                nameLower.includes('sinhala') || 
                nameLower.includes('media') || 
                nameLower.includes('political') || 
                nameLower.includes('buddhist') || 
                nameLower.includes('logic') || 
                nameLower.includes('geography') || 
                nameLower.includes('history') ||
                nameLower.includes('dancing') || 
                nameLower.includes('music') ||
                sub.name.includes("සිංහල") || 
                sub.name.includes("දේශපාලන") || 
                sub.name.includes("බෞද්ධ") || 
                sub.name.includes("මාධ්‍ය") ||
                sub.name.includes("චිත්‍ර") || 
                sub.name.includes("නැටුම්") || 
                sub.name.includes("සංගීත") ||
                sub.name.includes("ඉතිහාසය") ||
                sub.name.includes("තර්ක") || 
                sub.name.includes("භූගෝල")
            );
        }
        return true; 
    });
  }, [selectedMonthGroup, selectedStreamFilter, isSpecialFlow]);


  const toggleSubject = (sub) => {
    const updated = { ...selectedSubjects };
    if (updated[sub.id]) {
      delete updated[sub.id];
    } else {
      updated[sub.id] = parseFloat(sub.price);
    }
    setSelectedSubjects(updated);
    setTotalAmount(Object.values(updated).reduce((a, b) => a + b, 0));
  };

  const proceedToPayment = async () => {
    if (totalAmount <= 0) return Alert.alert("Wait", "Please select at least one subject.");

    setLoading(true);
    try {
      const coursesPayload = Object.keys(selectedSubjects).map(id => `${id}-${selectedPlan}`);

      const res = await api.post('/courseConfirm', {
        businessID: businessData.id,
        courses: coursesPayload, 
        discountEnabled: 0
      });

      if (res.data && res.data.mainPayment) {
        navigation.navigate('PaymentMethod', {
          amount: totalAmount,
          mainPaymentId: res.data.mainPayment.id,
          businessId: businessData.id,
          batchId: selectedBatch.id,
          payType: selectedPlan 
        });
      }
    } catch (e) {
      const serverMsg = e.response?.data?.message || "Could not confirm order.";
      Alert.alert("Error", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else if (step === 1) {
        if (isSpecialFlow) setStep(0); 
        else navigation.goBack();      
    }
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(selectedPlan === 'full' ? 2 : 3);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}><Icon name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <View style={{marginLeft: 15}}>
          <Text style={styles.headerTitle}>{businessData.name}</Text>
          <Text style={styles.stepIndicator}>
             {step === 0 ? "Select Stream" : step === 1 ? "Select Batch" : "Select Courses"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* --- STEP 0: STREAM SELECTION --- */}
        {step === 0 && isSpecialFlow && (
            <View>
                <Text style={styles.label}>Select Your Stream</Text>
                <Text style={styles.subLabel}>Choose your A/L path to continue</Text>
                
                <TouchableOpacity 
                    style={[styles.streamMainCard, {backgroundColor: '#1A237E'}]} 
                    onPress={() => { setSelectedStreamFilter('COMMERCE'); setStep(1); }}
                >
                    <View style={styles.cardContent}>
                        <View>
                            <Text style={styles.streamTitle}>Commerce</Text>
                            <Text style={styles.streamSub}>Accounting, BS, Econ, ICT...</Text>
                            <View style={styles.startBtn}><Text style={styles.startBtnText}>Select Stream &gt;</Text></View>
                        </View>
                        <Icon name="finance" size={80} color="rgba(255,255,255,0.2)" style={styles.bgIcon} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.streamMainCard, {backgroundColor: '#880E4F', marginTop: 15}]} 
                    onPress={() => { setSelectedStreamFilter('ART'); setStep(1); }}
                >
                    <View style={styles.cardContent}>
                        <View>
                            <Text style={styles.streamTitle}>Art Stream</Text>
                            <Text style={styles.streamSub}>Sinhala, Media, Logic, Pol...</Text>
                            <View style={styles.startBtn}><Text style={styles.startBtnText}>Select Stream &gt;</Text></View>
                        </View>
                        <Icon name="palette" size={80} color="rgba(255,255,255,0.2)" style={styles.bgIcon} />
                    </View>
                </TouchableOpacity>
            </View>
        )}

        {/* --- STEP 1: BATCH --- */}
        {step === 1 && (
          <View>
            <Text style={styles.label}>Select Batch</Text>
            {batches.length > 0 ? (
                batches.map(batch => (
                <TouchableOpacity key={batch.id} style={[styles.card, selectedBatch?.id === batch.id && styles.activeCard]} onPress={() => { setSelectedBatch(batch); setStep(2); }}>
                    {batch.logo ? (
                        <Image source={{ uri: `${IMAGE_URL}icons/${batch.logo}` }} style={styles.batchLogo} resizeMode="contain" />
                    ) : (
                        <Icon name="school" size={28} color={selectedBatch?.id === batch.id ? "white" : COLORS.primary} />
                    )}
                    <View style={{marginLeft: 15, flex: 1}}>
                        <Text style={[styles.cardText, selectedBatch?.id === batch.id && {color: 'white'}]}>{batch.name}</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={selectedBatch?.id === batch.id ? "white" : "#ccc"} />
                </TouchableOpacity>
                ))
            ) : (
                <Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>No batches available.</Text>
            )}
          </View>
        )}

        {/* --- STEP 2: PAYMENT PLAN --- */}
        {step === 2 && (
          <View>
            <Text style={styles.label}>Select your payment type</Text>
            <View style={styles.planRow}>
              <TouchableOpacity style={styles.planCard} onPress={() => { setSelectedPlan('full'); setSelectedMonthGroup(selectedBatch.groups[0]); setStep(4); }}>
                <Icon name="lightning-bolt" size={40} color="#FFD700" />
                <Text style={styles.planTitle}>One-Time Payment</Text>
                <Text style={styles.planSub}>Pay full amount</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.planCard} onPress={() => { setSelectedPlan('monthly'); setStep(3); }}>
                <Icon name="calendar-refresh" size={40} color={COLORS.primary} />
                <Text style={styles.planTitle}>Monthly Payment</Text>
                <Text style={styles.planSub}>Pay per month</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- STEP 3: MONTH --- */}
        {step === 3 && (
          <View>
            <Text style={styles.label}>Select Month</Text>
            {selectedBatch.groups?.filter(g => g.type !== "1").map(group => (
              <TouchableOpacity key={group.id} style={styles.card} onPress={() => { setSelectedMonthGroup(group); setStep(4); }}>
                <View style={[styles.iconBox, {backgroundColor: '#e3f2fd'}]}>
                    <Icon name="calendar-month" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.cardText}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* --- STEP 4: SUBJECTS (With UI Fix) --- */}
        {step === 4 && (
          <View>
            <Text style={styles.label}>
                Select Subjects 
                {isSpecialFlow && selectedStreamFilter ? ` (${selectedStreamFilter})` : ""}
            </Text>
            
            {filteredSubjects.length > 0 ? (
                filteredSubjects.map(sub => (
                  <TouchableOpacity key={sub.id} style={[styles.subCard, selectedSubjects[sub.id] && styles.subCardActive]} onPress={() => toggleSubject(sub)}>
                    {/* Checkbox Icon */}
                    <Icon name={selectedSubjects[sub.id] ? "checkbox-marked" : "checkbox-blank-outline"} size={26} color={selectedSubjects[sub.id] ? COLORS.primary : "#ccc"} />
                    
                    {/* 🔥 UI FIX: Text Container with Flex */}
                    <View style={{flex: 1, marginLeft: 12, marginRight: 8}}>
                      <Text style={styles.subName} numberOfLines={2}>{sub.name}</Text>
                      <Text style={styles.subLecturer} numberOfLines={1}>{sub.description}</Text>
                    </View>
                    
                    {/* Price */}
                    <Text style={styles.subPrice}>Rs. {parseFloat(sub.price).toLocaleString()}</Text>
                  </TouchableOpacity>
                ))
            ) : (
                <View style={{alignItems:'center', marginTop: 30}}>
                    <Icon name="file-search-outline" size={50} color="#ccc" />
                    <Text style={{color: '#999', marginTop: 10}}>No subjects found for this category.</Text>
                </View>
            )}
          </View>
        )}
      </ScrollView>

      {step === 4 && (
        <View style={styles.footer}>
          <View>
             <Text style={{fontSize: 12, color: '#666'}}>Total Payable</Text>
             <Text style={styles.totalText}>Rs. {totalAmount.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={[styles.payBtn, (totalAmount === 0 || loading) && {backgroundColor: '#ccc'}]} disabled={totalAmount === 0 || loading} onPress={proceedToPayment}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payBtnText}>Proceed to Payment</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: COLORS.primary, padding: 25, paddingTop: 50, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  stepIndicator: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  label: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 5 },
  subLabel: { fontSize: 12, color: '#666', marginBottom: 15 },
  
  streamMainCard: { height: 140, borderRadius: 20, overflow: 'hidden', elevation: 5, padding: 20, justifyContent: 'center' },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streamTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  streamSub: { color: '#ddd', fontSize: 12, marginBottom: 15, maxWidth: '80%' },
  startBtn: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  bgIcon: { position: 'absolute', right: -10, bottom: -10, opacity: 0.5 },

  card: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: 'white' },
  activeCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cardText: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: '#333' },
  batchLogo: { width: 40, height: 40, borderRadius: 5 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  planRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planCard: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#eee' },
  planTitle: { marginTop: 10, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  planSub: { fontSize: 10, color: '#999', marginTop: 2 },

  subCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#eee' },
  subCardActive: { borderColor: COLORS.primary, backgroundColor: '#f0f9ff' },
  subName: { fontSize: 15, fontWeight: 'bold', color: '#333', flexWrap: 'wrap' }, // 🔥 Added wrapping
  subLecturer: { fontSize: 11, color: '#888' },
  subPrice: { fontWeight: '900', color: COLORS.primary, marginLeft: 5 },

  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  payBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 25, borderRadius: 12 },
  payBtnText: { color: 'white', fontWeight: 'bold' }
});

export default CourseDetailsScreen;