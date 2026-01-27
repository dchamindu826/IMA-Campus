import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';

const CourseDetailsScreen = ({ route, navigation }) => {
  const { businessData } = route.params;
  const [step, setStep] = useState(1); 
  const [streams, setStreams] = useState([]); 
  const [selectedStream, setSelectedStream] = useState(null); 
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null); 
  const [selectedMonthGroup, setSelectedMonthGroup] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. Initial Batch Grouping (Kept same)
  const groupedBatches = useMemo(() => {
    const groups = {};
    const streamNames = [];
    if (businessData.batches) {
        businessData.batches.forEach(batch => {
            let streamName = "General";
            let batchDisplayName = batch.name;
            
            // Try to detect stream from Batch Name (e.g. "Commerce - 2025")
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
    if (streamNames.length === 1) setSelectedStream(streamNames[0]);
    else if (streamNames.length > 1) setStep(0);
    return groups;
  }, [businessData]);

  // 🔥 2. ADVANCED FILTERING: Stream -> Type -> Subject
  const categorizedData = useMemo(() => {
    if (!selectedMonthGroup?.courses) return { commerce: {}, art: {}, other: {} };

    // Helper to check subject names
    const checkKeywords = (name, keywords) => {
        const lowerName = name.toLowerCase();
        return keywords.some(k => lowerName.includes(k));
    };

    const commerceSubjects = [];
    const artSubjects = [];
    const otherSubjects = [];

    // Keywords to identify streams
    const commerceKeys = ['commerce', 'business', 'account', 'econ', 'bs'];
    const artKeys = ['art', 'sinhala', 'logic', 'geo', 'pol', 'media', 'history', 'dance', 'music', 'lang'];

    // Step A: Split into Streams
    selectedMonthGroup.courses.forEach(sub => {
        if (checkKeywords(sub.name, commerceKeys)) {
            commerceSubjects.push(sub);
        } else if (checkKeywords(sub.name, artKeys)) {
            artSubjects.push(sub);
        } else {
            // If strictly one stream is selected in Step 0, you might want to force it, 
            // but for "General" batches, we put them in 'Other' or check logic again.
            otherSubjects.push(sub);
        }
    });

    // Step B: Function to group by Type (Theory/Revision) inside a stream
    const groupByType = (list) => {
        const groups = { "Theory": [], "Revision": [], "Paper": [], "Tute / Exams": [], "Other": [] };
        list.forEach(sub => {
            const lower = sub.name.toLowerCase();
            if (lower.includes('theory')) groups["Theory"].push(sub);
            else if (lower.includes('revi')) groups["Revision"].push(sub);
            else if (lower.includes('paper')) groups["Paper"].push(sub);
            else if (lower.includes('tute') || lower.includes('exam')) groups["Tute / Exams"].push(sub);
            else groups["Other"].push(sub);
        });
        return groups;
    };

    return {
        commerce: groupByType(commerceSubjects),
        art: groupByType(artSubjects),
        other: groupByType(otherSubjects)
    };
  }, [selectedMonthGroup]);

  const toggleSubject = (sub) => {
    const updated = { ...selectedSubjects };
    if (updated[sub.id]) delete updated[sub.id];
    else updated[sub.id] = parseFloat(sub.price);
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
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else if (step === 1) { if (streams.length > 1) setStep(0); else navigation.goBack(); }
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(selectedPlan === 'full' ? 2 : 3);
  };

  // 🔥 Helper Component to Render a Full Stream Section
  const renderStreamSection = (streamTitle, groupedSubjects, color) => {
    // Check if this stream has any subjects
    const hasSubjects = Object.values(groupedSubjects).some(arr => arr.length > 0);
    if (!hasSubjects) return null;

    return (
        <View style={styles.streamSectionContainer}>
            <View style={[styles.streamHeaderBox, { borderLeftColor: color }]}>
                <Text style={[styles.streamHeaderTitle, { color: color }]}>{streamTitle}</Text>
            </View>

            {Object.keys(groupedSubjects).map(typeKey => {
                const subjects = groupedSubjects[typeKey];
                if (subjects.length === 0) return null;

                return (
                    <View key={typeKey} style={styles.typeGroup}>
                        <Text style={styles.typeTitle}>— {typeKey} —</Text>
                        {subjects.map(sub => (
                            <TouchableOpacity key={sub.id} style={[styles.subCard, selectedSubjects[sub.id] && styles.subCardActive]} onPress={() => toggleSubject(sub)}>
                                <Icon name={selectedSubjects[sub.id] ? "checkbox-marked" : "checkbox-blank-outline"} size={24} color={selectedSubjects[sub.id] ? COLORS.primary : "#ccc"} />
                                <View style={{flex: 1, marginLeft: 10}}>
                                    <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                                    <Text style={styles.subLecturer} numberOfLines={1}>{sub.description}</Text>
                                </View>
                                <Text style={styles.subPrice}>Rs.{parseFloat(sub.price).toLocaleString()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            })}
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}><Icon name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <View style={{marginLeft: 15}}><Text style={styles.headerTitle}>{businessData.name}</Text><Text style={styles.stepIndicator}>Step {step + 1}</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {step === 0 && (
            <View>
                <Text style={styles.label}>Select Stream</Text>
                <View style={styles.gridContainer}>
                    {streams.map((streamName, index) => (
                        <TouchableOpacity key={index} style={styles.streamCard} onPress={() => { setSelectedStream(streamName); setStep(1); }}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '20' }]}><Icon name="bookshelf" size={30} color={COLORS.primary} /></View>
                            <Text style={styles.streamText}>{streamName}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )}

        {step === 1 && selectedStream && (
          <View>
            <Text style={styles.label}>Select {selectedStream !== "General" ? selectedStream : ""} Batch</Text>
            {groupedBatches[selectedStream]?.map(batch => (
              <TouchableOpacity key={batch.id} style={[styles.card, selectedBatch?.id === batch.id && styles.activeCard]} onPress={() => { setSelectedBatch(batch); setStep(2); }}>
                {batch.logo ? <Image source={{ uri: `${IMAGE_URL}icons/${batch.logo}` }} style={styles.batchLogo} resizeMode="contain" /> : <Icon name="school" size={28} color={selectedBatch?.id === batch.id ? "white" : COLORS.primary} />}
                <View style={{marginLeft: 15, flex: 1}}><Text style={[styles.cardText, selectedBatch?.id === batch.id && {color: 'white'}]}>{batch.displayName}</Text></View>
                <Icon name="chevron-right" size={24} color={selectedBatch?.id === batch.id ? "white" : "#ccc"} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.label}>Select your payment type</Text>
            <View style={styles.planRow}>
              <TouchableOpacity style={styles.planCard} onPress={() => { setSelectedPlan('full'); setSelectedMonthGroup(selectedBatch.groups[0]); setStep(4); }}>
                <Icon name="lightning-bolt" size={40} color="#FFD700" /><Text style={styles.planTitle}>One-Time Payment</Text><Text style={styles.planSub}>Pay full amount</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.planCard} onPress={() => { setSelectedPlan('monthly'); setStep(3); }}>
                <Icon name="calendar-refresh" size={40} color={COLORS.primary} /><Text style={styles.planTitle}>Monthly Payment</Text><Text style={styles.planSub}>Pay per month</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.label}>Select Month</Text>
            {selectedBatch.groups?.filter(g => g.type !== "1").map(group => (
              <TouchableOpacity key={group.id} style={styles.card} onPress={() => { setSelectedMonthGroup(group); setStep(4); }}>
                <View style={[styles.iconBox, {backgroundColor: '#e3f2fd'}]}><Icon name="calendar-month" size={24} color={COLORS.primary} /></View>
                <Text style={styles.cardText}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.label}>Select Subjects ({selectedMonthGroup?.name})</Text>
            
            {/* 🔥 RENDER COMMERCE SECTION */}
            {renderStreamSection("COMMERCE STREAM", categorizedData.commerce, '#FF9800')}

            {/* 🔥 RENDER ART SECTION */}
            {renderStreamSection("ART STREAM", categorizedData.art, '#E91E63')}

            {/* 🔥 RENDER OTHER/COMMON SECTION */}
            {renderStreamSection("COMMON / OTHER SUBJECTS", categorizedData.other, '#607D8B')}
            
            {/* Empty State */}
            {Object.values(categorizedData).every(s => Object.values(s).every(arr => arr.length === 0)) && (
                <Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>No subjects found.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {step === 4 && (
        <View style={styles.footer}>
          <View><Text style={{fontSize: 12, color: '#666'}}>Total Payable</Text><Text style={styles.totalText}>Rs. {totalAmount.toLocaleString()}</Text></View>
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
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  streamCard: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, elevation: 3 },
  streamText: { marginTop: 10, fontWeight: 'bold', fontSize: 16, color: '#333' },
  
  card: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: 'white' },
  activeCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cardText: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: '#333' },
  batchLogo: { width: 40, height: 40, borderRadius: 5 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  planRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planCard: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#eee' },
  planTitle: { marginTop: 10, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  planSub: { fontSize: 10, color: '#999', marginTop: 2 },
  
  // 🔥 NEW STYLES FOR STREAM SECTIONS
  streamSectionContainer: { marginBottom: 25, backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 2 },
  streamHeaderBox: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 15 },
  streamHeaderTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  
  typeGroup: { marginBottom: 15 },
  typeTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' },
  
  subCard: { backgroundColor: '#F8F9FB', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  subCardActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  subName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  subLecturer: { fontSize: 11, color: '#777' },
  subPrice: { fontWeight: 'bold', color: COLORS.primary, fontSize: 13 },
  
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  payBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 25, borderRadius: 12 },
  payBtnText: { color: 'white', fontWeight: 'bold' }
});

export default CourseDetailsScreen;