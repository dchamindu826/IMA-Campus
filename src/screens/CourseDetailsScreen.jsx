import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';

const CourseDetailsScreen = ({ route, navigation }) => {
  const { businessData } = route.params;
  
  // Steps: 0=Stream (Optional), 1=Batch, 2=Plan, 3=Month, 4=Subject
  const [step, setStep] = useState(1); 
  
  const [streams, setStreams] = useState([]); 
  const [selectedStream, setSelectedStream] = useState(null); 
  
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null); 
  const [selectedMonthGroup, setSelectedMonthGroup] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- LOGIC 1: BATCHES & STREAMS වෙන් කිරීම ---
  const groupedBatches = useMemo(() => {
    const groups = {};
    const streamNames = [];

    if (businessData.batches) {
        businessData.batches.forEach(batch => {
            // Batch Name එකෙන් Stream එක කඩනවා (Ex: "Art - 2025")
            let streamName = "General";
            let batchDisplayName = batch.name;

            if (batch.name.includes(" - ")) {
                const parts = batch.name.split(" - ");
                streamName = parts[0]; 
                batchDisplayName = parts.slice(1).join(" - ");
            } else if (batch.name.includes("-")) { 
                const parts = batch.name.split("-");
                streamName = parts[0];
                batchDisplayName = parts.slice(1).join("-");
            }

            if (!groups[streamName]) {
                groups[streamName] = [];
                streamNames.push(streamName);
            }
            groups[streamName].push({ ...batch, displayName: batchDisplayName });
        });
    }
    setStreams(streamNames);
    
    // Stream එකක් විතරක් නම් (Ex: O/L), Step 1 එකට යන්න. ගොඩක් නම් Step 0.
    if (streamNames.length === 1) {
        setSelectedStream(streamNames[0]);
    } else if (streamNames.length > 1) {
        setStep(0);
    }

    return groups;
  }, [businessData]);

  // --- LOGIC 2: SUBJECTS වර්ග කිරීම (Theory / Paper) ---
  const categorizedSubjects = useMemo(() => {
    if (!selectedMonthGroup?.courses) return {};

    const categories = {
        "Theory Classes": [],
        "Paper Classes": [],
        "Revision Classes": [],
        "Other Subjects": []
    };

    selectedMonthGroup.courses.forEach(sub => {
        const nameLower = sub.name.toLowerCase();
        if (nameLower.includes('theory')) {
            categories["Theory Classes"].push(sub);
        } else if (nameLower.includes('paper')) {
            categories["Paper Classes"].push(sub);
        } else if (nameLower.includes('revision')) {
            categories["Revision Classes"].push(sub);
        } else {
            categories["Other Subjects"].push(sub);
        }
    });

    return categories;
  }, [selectedMonthGroup]);


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
      console.log("Confirm Error:", e.response?.data || e.message);
      const serverMsg = e.response?.data?.message || "Could not confirm order.";
      Alert.alert("Error", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else if (step === 1) {
        if (streams.length > 1) setStep(0);
        else navigation.goBack();
    }
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(selectedPlan === 'full' ? 2 : 3);
  };

  // Helper Function to Render Subject Categories
  const renderCategory = (title, subjects) => {
    if (!subjects || subjects.length === 0) return null;
    return (
        <View key={title} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
                <Icon name={title.includes("Theory") ? "book-open-variant" : title.includes("Paper") ? "file-document-edit" : "bookmark"} size={18} color="#555" />
                <Text style={styles.categoryTitle}>{title}</Text>
            </View>
            {subjects.map(sub => (
              <TouchableOpacity key={sub.id} style={[styles.subCard, selectedSubjects[sub.id] && styles.subCardActive]} onPress={() => toggleSubject(sub)}>
                <Icon name={selectedSubjects[sub.id] ? "checkbox-marked" : "checkbox-blank-outline"} size={26} color={selectedSubjects[sub.id] ? COLORS.primary : "#ccc"} />
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                  <Text style={styles.subLecturer} numberOfLines={1}>{sub.description}</Text>
                </View>
                <Text style={styles.subPrice}>Rs. {parseFloat(sub.price).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}><Icon name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <View style={{marginLeft: 15}}>
          <Text style={styles.headerTitle}>{businessData.name}</Text>
          <Text style={styles.stepIndicator}>
             {step === 0 ? "Select Stream" : 
              step === 1 ? "Select Batch" :
              step === 2 ? "Payment Plan" : 
              step === 3 ? "Select Month" :
              "Select Subjects"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* --- STEP 0: SELECT STREAM --- */}
        {step === 0 && (
            <View>
                <Text style={styles.label}>Select Stream</Text>
                <View style={styles.gridContainer}>
                    {streams.map((streamName, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.streamCard} 
                            onPress={() => { setSelectedStream(streamName); setStep(1); }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '20' }]}>
                                <Icon name="bookshelf" size={30} color={COLORS.primary} />
                            </View>
                            <Text style={styles.streamText}>{streamName}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )}

        {/* --- STEP 1: SELECT BATCH --- */}
        {step === 1 && selectedStream && (
          <View>
            <Text style={styles.label}>Select {selectedStream !== "General" ? selectedStream : ""} Batch</Text>
            {groupedBatches[selectedStream]?.map(batch => (
              <TouchableOpacity key={batch.id} style={[styles.card, selectedBatch?.id === batch.id && styles.activeCard]} onPress={() => { setSelectedBatch(batch); setStep(2); }}>
                {batch.logo ? (
                     <Image source={{ uri: `${IMAGE_URL}icons/${batch.logo}` }} style={styles.batchLogo} resizeMode="contain" />
                ) : (
                     <Icon name="school" size={28} color={selectedBatch?.id === batch.id ? "white" : COLORS.primary} />
                )}
                <View style={{marginLeft: 15, flex: 1}}>
                    <Text style={[styles.cardText, selectedBatch?.id === batch.id && {color: 'white'}]}>{batch.displayName}</Text>
                </View>
                <Icon name="chevron-right" size={24} color={selectedBatch?.id === batch.id ? "white" : "#ccc"} />
              </TouchableOpacity>
            ))}
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

        {/* --- STEP 3: SELECT MONTH --- */}
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

        {/* --- STEP 4: SELECT SUBJECTS (Categorized) --- */}
        {step === 4 && (
          <View>
            <Text style={styles.label}>Select Subjects ({selectedMonthGroup?.name})</Text>
            
            {/* Categories Render වෙන තැන */}
            {renderCategory("Theory Classes", categorizedSubjects["Theory Classes"])}
            {renderCategory("Paper Classes", categorizedSubjects["Paper Classes"])}
            {renderCategory("Revision Classes", categorizedSubjects["Revision Classes"])}
            {renderCategory("Other Subjects", categorizedSubjects["Other Subjects"])}

            {/* මුකුත්ම නැත්නම් */}
            {Object.values(categorizedSubjects).every(arr => arr.length === 0) && (
                <Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>No subjects found.</Text>
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
  
  // Stream Cards
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  streamCard: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, elevation: 3 },
  streamText: { marginTop: 10, fontWeight: 'bold', fontSize: 16, color: '#333' },

  // General Card
  card: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: 'white' },
  activeCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cardText: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: '#333' },
  batchLogo: { width: 40, height: 40, borderRadius: 5 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  // Plan Cards
  planRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planCard: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#eee' },
  planTitle: { marginTop: 10, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  planSub: { fontSize: 10, color: '#999', marginTop: 2 },

  // Categorized Subject Styles
  categorySection: { marginBottom: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginLeft: 8, textTransform: 'uppercase' },
  
  subCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#eee' },
  subCardActive: { borderColor: COLORS.primary, backgroundColor: '#f0f9ff' },
  subName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  subLecturer: { fontSize: 11, color: '#888' },
  subPrice: { fontWeight: '900', color: COLORS.primary, marginLeft: 5 },

  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  payBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 25, borderRadius: 12 },
  payBtnText: { color: 'white', fontWeight: 'bold' }
});

export default CourseDetailsScreen;