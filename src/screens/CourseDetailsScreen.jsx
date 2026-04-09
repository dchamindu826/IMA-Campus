import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';

const { width } = Dimensions.get('window');

const CourseDetailsScreen = ({ route, navigation }) => {
  const { businessData } = route.params;
  
  const bizName = String(businessData.name).toLowerCase();
  const isSpecialFlow = bizName.includes("06") || bizName.includes("a/l") || bizName.includes("fast track"); 

  const [step, setStep] = useState(isSpecialFlow ? 1 : 2); 
  
  const [selectedStreamFilter, setSelectedStreamFilter] = useState(null); 
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null); 
  const [selectedMonthGroup, setSelectedMonthGroup] = useState(null);
  
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentData, setInstallmentData] = useState(null);

  const batches = useMemo(() => {
      if (businessData.batches && businessData.batches.length > 0) {
          return businessData.batches;
      }
      return [];
  }, [businessData]);

  const filteredSubjects = useMemo(() => {
    if (!selectedMonthGroup?.courses) return [];

    let courses = Array.isArray(selectedMonthGroup.courses) 
        ? selectedMonthGroup.courses 
        : Object.values(selectedMonthGroup.courses);

    if (courses.length === 0) return [];

    if (isSpecialFlow && selectedStreamFilter) {
        const filterUpper = selectedStreamFilter.toUpperCase(); 

        return courses.filter(sub => {
            const streamVal = String(sub.stream || '').toUpperCase().trim();
            if (streamVal === 'BOTH' || streamVal === 'ALL' || streamVal === 'COMMON') return true;

            const fullDataString = JSON.stringify(sub).toLowerCase();
            const fullDataStringSinhala = JSON.stringify(sub); 

            if (filterUpper === 'COMMERCE') {
                if (streamVal === 'ART' || streamVal === 'ARTS') return false; 
                return (
                    streamVal === 'COMMERCE' || fullDataString.includes('commerce') || fullDataString.includes('business') || fullDataString.includes('accounting') || fullDataString.includes('econ') || fullDataString.includes('ict') || fullDataString.includes('bs') || fullDataStringSinhala.includes("ගිණුම්කරණය") || fullDataStringSinhala.includes("ව්‍යාපාර") || fullDataStringSinhala.includes("ආර්ථික") || fullDataStringSinhala.includes("තොරතුරු")
                );
            } else if (filterUpper === 'ART') {
                if (streamVal === 'COMMERCE') return false; 
                return (
                    streamVal === 'ART' || streamVal === 'ARTS' || fullDataString.includes('art') || fullDataString.includes('sinhala') || fullDataString.includes('media') || fullDataString.includes('political') || fullDataString.includes('buddhist') || fullDataString.includes('logic') || fullDataString.includes('geography') || fullDataString.includes('history') || fullDataString.includes('dancing') || fullDataString.includes('music') || fullDataStringSinhala.includes("සිංහල") || fullDataStringSinhala.includes("දේශපාලන") || fullDataStringSinhala.includes("බෞද්ධ") || fullDataStringSinhala.includes("මාධ්‍ය") || fullDataStringSinhala.includes("චිත්‍ර") || fullDataStringSinhala.includes("නැටුම්") || fullDataStringSinhala.includes("සංගීත") || fullDataStringSinhala.includes("ඉතිහාසය") || fullDataStringSinhala.includes("තර්ක") || fullDataStringSinhala.includes("භූගෝල")
                );
            }
            return true; 
        });
    }

    return courses;
  }, [selectedMonthGroup, selectedStreamFilter, isSpecialFlow]);

  const getCleanPrice = (priceStr) => {
    const cleanStr = String(priceStr || '0').replace(/,/g, '').replace(/LKR/gi, '').trim();
    return parseFloat(cleanStr) || 0;
  };

  const toggleSubject = (sub) => {
    const updated = { ...selectedSubjects };
    if (updated[sub.id]) {
      delete updated[sub.id];
    } else {
      updated[sub.id] = sub; 
    }
    setSelectedSubjects(updated);
  };

  useEffect(() => {
    try {
        let currentTotal = 0;
        let reqCount = 0;
        const subjectsArray = Object.values(selectedSubjects);
        
        const isOL = businessData?.category === 'OL';
        const minCourseCount = parseInt(businessData?.minCourseCount) || 0;
        const discountAmount = parseFloat(businessData?.discountAmount) || 0;

        subjectsArray.forEach(sub => {
            if (sub.needForDiscount == 1) reqCount++;
        });

        let discountValid = false;
        if (isOL) {
            discountValid = selectedPlan === 'full' && (subjectsArray.length >= minCourseCount) && minCourseCount > 0;
        } else {
            discountValid = selectedPlan === 'full' && (reqCount >= 3);
        }

        setIsDiscountApplied(discountValid);

        subjectsArray.forEach(sub => {
            const normalPrice = getCleanPrice(sub.price);
            const dPrice = getCleanPrice(sub.discountedPrice);
            if (!isOL && discountValid && dPrice > 0 && dPrice < normalPrice) {
                currentTotal += dPrice; 
            } else {
                currentTotal += normalPrice;
            }
        });

        if (isOL && discountValid && discountAmount > 0) {
            currentTotal -= discountAmount;
        }

        setTotalAmount(Math.max(0, currentTotal));

    } catch (err) {
        console.log("Discount Calc Error:", err);
    }
  }, [selectedSubjects, selectedPlan, businessData]);

  const proceedToPayment = async () => {
    if (totalAmount <= 0) return Alert.alert("Wait", "Please select at least one subject.");

    setLoading(true);
    try {
      const coursesPayload = Object.keys(selectedSubjects).map(id => `${id}-${selectedPlan}`);

      const res = await api.post('/courseConfirm', {
        businessID: businessData.id,
        courses: coursesPayload, 
        discountEnabled: isDiscountApplied ? 1 : 0 
      });

      const isInstallmentTrue = res.data?.isInstallmentAvailable === true || res.data?.isInstallmentAvailable === "true" || res.data?.isInstallmentAvailable === 1;

      if (res.data && res.data.mainPayment) {
        if (isInstallmentTrue && selectedPlan === 'full') {
            setInstallmentData(res.data);
            setShowInstallmentModal(true);
            setLoading(false);
            return;
        }

        navigation.navigate('PaymentMethod', {
          amount: res.data.mainPayment.amount, 
          mainPaymentId: res.data.mainPayment.id,
          businessId: businessData.id,
          batchId: selectedBatch.id,
          payType: selectedPlan 
        });
      }
    } catch (e) {
      const serverMsg = e.response?.data?.message || JSON.stringify(e.response?.data) || e.message;
      Alert.alert("Error", `Failed to confirm course.\n\nError: ${serverMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFullAmount = () => {
      setShowInstallmentModal(false);
      navigation.navigate('PaymentMethod', {
          amount: installmentData.mainPayment.amount,
          mainPaymentId: installmentData.mainPayment.id,
          businessId: businessData.id,
          batchId: selectedBatch.id,
          payType: 'full'
      });
  };

  // 🔥 FIX 01: backend එකෙන් එන firstInstallmentId එක Navigation එක හරහා PaymentMethod එකට යැවීම
  const handlePayInstallmentAmount = async () => {
      setShowInstallmentModal(false);
      setLoading(true);
      try {
          const res = await api.post('/paymentTypeSelect', {
              mainPaymentId: installmentData.mainPayment.id,
              paymentType: 'installment',
              insOption: installmentData.installmentOptionAvailable.id,
              insFullAmount: installmentData.installmentOptionAvailable.full_amount
          });

          const sortedInstallments = installmentData.installmentAmounts 
              ? [...installmentData.installmentAmounts].sort((a, b) => a.id - b.id) 
              : [];

          const firstInsAmount = sortedInstallments.length > 0 
                                  ? parseFloat(sortedInstallments[0].amount) 
                                  : totalAmount;

          navigation.navigate('PaymentMethod', {
              amount: firstInsAmount,
              mainPaymentId: res.data.mainPaymentId || installmentData.mainPayment.id,
              installmentPaymentId: res.data.firstInstallmentId, // 🔥 මෙය අලුතින් backend එකෙන් ලැබෙනවා
              businessId: businessData.id,
              batchId: selectedBatch.id,
              payType: 'installment'
          });
      } catch (e) {
          const serverMsg = e.response?.data?.message || JSON.stringify(e.response?.data) || e.message;
          Alert.alert("Error", `Could not setup installments.\n\nError: ${serverMsg}`);
      } finally {
          setLoading(false);
      }
  };

  const handleBack = () => {
    if (step === 1) navigation.goBack(); 
    else if (step === 2) {
        if (isSpecialFlow) setStep(1); 
        else navigation.goBack(); 
    }
    else if (step === 3) setStep(2); 
    else if (step === 4) setStep(3); 
    else if (step === 5) setStep(selectedPlan === 'full' ? 3 : 4); 
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}><Icon name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <View style={{marginLeft: 15}}>
          <Text style={styles.headerTitle}>{businessData.name}</Text>
          <Text style={styles.stepIndicator}>
             {step === 1 ? "Select Stream" : step === 2 ? "Select Batch" : step === 3 ? "Select Payment Type" : step === 4 ? "Select Month" : "Select Courses"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {step === 1 && isSpecialFlow && (
            <View>
                <Text style={styles.label}>Select Your Stream</Text>
                <Text style={styles.subLabel}>Choose your path to continue</Text>

                <TouchableOpacity style={[styles.streamMainCard, {backgroundColor: '#880E4F'}]} onPress={() => { setSelectedStreamFilter('ART'); setStep(2); }}>
                    <View style={styles.cardContent}>
                        <View>
                            <Text style={styles.streamTitle}>Art Stream</Text>
                            <Text style={styles.streamSub}>Sinhala, Media, Logic, Pol...</Text>
                            <View style={styles.startBtn}><Text style={styles.startBtnText}>Select Stream &gt;</Text></View>
                        </View>
                        <Icon name="palette" size={80} color="rgba(255,255,255,0.2)" style={styles.bgIcon} />
                    </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.streamMainCard, {backgroundColor: '#1A237E', marginTop: 15}]} onPress={() => { setSelectedStreamFilter('COMMERCE'); setStep(2); }}>
                    <View style={styles.cardContent}>
                        <View>
                            <Text style={styles.streamTitle}>Commerce</Text>
                            <Text style={styles.streamSub}>Accounting, BS, Econ, ICT...</Text>
                            <View style={styles.startBtn}><Text style={styles.startBtnText}>Select Stream &gt;</Text></View>
                        </View>
                        <Icon name="finance" size={80} color="rgba(255,255,255,0.2)" style={styles.bgIcon} />
                    </View>
                </TouchableOpacity>
            </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.label}>Select Batch</Text>
            {batches.length > 0 ? (
                batches.map(batch => (
                <TouchableOpacity key={batch.id} style={[styles.card, selectedBatch?.id === batch.id && styles.activeCard]} onPress={() => { setSelectedBatch(batch); setStep(3); }}>
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

        {step === 3 && (
          <View>
            <Text style={styles.label}>Select your payment type</Text>
            <View style={styles.planRow}>
              <TouchableOpacity style={styles.planCard} onPress={() => { 
                  setSelectedPlan('full'); 
                  const fullGroup = selectedBatch.groups.find(g => g.type == 1 || g.name.toLowerCase().includes('full')) || selectedBatch.groups[0];
                  setSelectedMonthGroup(fullGroup); 
                  setStep(5); 
              }}>
                <Icon name="lightning-bolt" size={40} color="#FFD700" />
                <Text style={styles.planTitle}>One-Time Payment</Text>
                <Text style={styles.planSub}>Pay full amount</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.planCard} onPress={() => { 
                  setSelectedPlan('monthly'); 
                  setStep(4); 
              }}>
                <Icon name="calendar-refresh" size={40} color={COLORS.primary} />
                <Text style={styles.planTitle}>Monthly Payment</Text>
                <Text style={styles.planSub}>Pay per month</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.label}>Select Month</Text>
            {selectedBatch.groups?.filter(g => g.type != 1 && !g.name.toLowerCase().includes('full')).map(group => (
              <TouchableOpacity key={group.id} style={styles.card} onPress={() => { setSelectedMonthGroup(group); setStep(5); }}>
                <View style={[styles.iconBox, {backgroundColor: '#e3f2fd'}]}><Icon name="calendar-month" size={24} color={COLORS.primary} /></View>
                <Text style={styles.cardText}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={styles.label}>Select Subjects</Text>

            {isDiscountApplied && (
                <View style={{backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50'}}>
                    <Icon name="tag-heart" size={24} color="#4CAF50" />
                    <View style={{marginLeft: 10}}>
                        <Text style={{color: '#2E7D32', fontWeight: 'bold', fontSize: 16}}>Special Offer Applied!</Text>
                        <Text style={{color: '#2E7D32', fontSize: 12}}>You got a discount for selecting subjects.</Text>
                    </View>
                </View>
            )}

            {filteredSubjects.length > 0 ? (
                filteredSubjects.map(sub => {
                  const isSelected = !!selectedSubjects[sub.id];
                  const dPrice = getCleanPrice(sub.discountedPrice);
                  const normalPrice = getCleanPrice(sub.price);
                  const isOL = businessData?.category === 'OL';
                  const displayPrice = (!isOL && isDiscountApplied && dPrice > 0 && dPrice < normalPrice) ? dPrice : normalPrice;

                  return (
                      <TouchableOpacity key={sub.id} style={[styles.subCard, isSelected && styles.subCardActive]} onPress={() => toggleSubject(sub)}>
                        <Icon name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} size={26} color={isSelected ? COLORS.primary : "#ccc"} />
                        
                        <View style={{flex: 1, marginLeft: 12, marginRight: 8}}>
                          <Text style={styles.subName} numberOfLines={2}>{sub.name}</Text>
                          {sub.description ? <Text style={styles.subLecturer} numberOfLines={1}>{sub.description}</Text> : null}
                        </View>
                        
                        <View style={{alignItems: 'flex-end'}}>
                            {!isOL && isDiscountApplied && dPrice > 0 && dPrice < normalPrice && (
                                <Text style={{textDecorationLine: 'line-through', color: '#999', fontSize: 11}}>Rs. {normalPrice.toLocaleString()}</Text>
                            )}
                            <Text style={styles.subPrice}>Rs. {displayPrice.toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                  );
                })
            ) : (
                <View style={{alignItems:'center', marginTop: 30}}>
                    <Icon name="file-search-outline" size={50} color="#ccc" />
                    <Text style={{color: '#999', marginTop: 10}}>No subjects found for this category.</Text>
                </View>
            )}
          </View>
        )}
      </ScrollView>

      {step === 5 && (
        <View style={styles.footer}>
          <View>
             <Text style={{fontSize: 12, color: '#666'}}>Total Payable</Text>
             <Text style={styles.totalText}>Rs. {totalAmount.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={[styles.payBtn, (totalAmount === 0 || loading) && {backgroundColor: '#ccc'}]} disabled={totalAmount === 0 || loading} onPress={proceedToPayment}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payBtnText}>Proceed <Icon name="arrow-right" size={16} /></Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* INSTALLMENT POPUP MODAL */}
      <Modal visible={showInstallmentModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={{alignItems: 'center', marginBottom: 20}}>
                      <Icon name="shield-check" size={50} color={COLORS.primary} />
                      <Text style={styles.modalTitle}>Select Payment Option</Text>
                  </View>

                  <TouchableOpacity style={styles.modalBtnOutline} onPress={handlePayFullAmount}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Icon name="cash-multiple" size={24} color={COLORS.primary} />
                          <View style={{marginLeft: 15}}>
                              <Text style={{fontWeight: 'bold', color: '#333', fontSize: 16}}>Pay Full Amount</Text>
                              <Text style={{color: '#666', fontSize: 12}}>Pay Rs. {installmentData?.mainPayment?.amount?.toLocaleString()} at once</Text>
                          </View>
                      </View>
                      <Icon name="chevron-right" size={24} color="#ccc" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalBtnSolid} onPress={handlePayInstallmentAmount}>
                      <View style={{flex: 1}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                              <Icon name="calendar-clock" size={24} color="white" />
                              <Text style={{fontWeight: 'bold', color: 'white', fontSize: 16, marginLeft: 10}}>Pay in Installments</Text>
                          </View>
                          
                          <View style={{backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, marginBottom: 10}}>
                              {installmentData?.installmentAmounts
                                  ?.slice() 
                                  .sort((a, b) => a.id - b.id) 
                                  .map((inst, index) => {
                                  
                                  let suffix = 'th';
                                  if (index === 0) suffix = 'st';
                                  else if (index === 1) suffix = 'nd';
                                  else if (index === 2) suffix = 'rd';

                                  return (
                                      <View key={index} style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5}}>
                                          <Text style={{color: 'white', fontSize: 13}}>{index + 1}{suffix} Installment</Text>
                                          <Text style={{color: 'white', fontSize: 14, fontWeight: 'bold'}}>Rs. {parseFloat(inst.amount).toLocaleString()}</Text>
                                      </View>
                                  );
                              })}
                          </View>
                          
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                              <Text style={{color: 'rgba(255,255,255,0.9)', fontSize: 12}}>Proceed to pay 1st installment</Text>
                              <Icon name="arrow-right-circle" size={20} color="white" />
                          </View>
                      </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={{marginTop: 15, paddingVertical: 10, alignItems: 'center'}} onPress={() => setShowInstallmentModal(false)}>
                      <Text style={{color: '#999', fontWeight: 'bold', fontSize: 15}}>Cancel</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

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
  subName: { fontSize: 15, fontWeight: 'bold', color: '#333', flexWrap: 'wrap' }, 
  subLecturer: { fontSize: 11, color: '#888' },
  subPrice: { fontWeight: '900', color: COLORS.primary, marginLeft: 5, fontSize: 16 },

  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  payBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 25, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginRight: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', width: '100%', borderRadius: 25, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 5 },
  modalBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#eee', padding: 15, borderRadius: 15, marginBottom: 15 },
  modalBtnSolid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, padding: 20, borderRadius: 15 }
});

export default CourseDetailsScreen;