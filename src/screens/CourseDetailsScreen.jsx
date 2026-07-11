import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constants/colors';
import api, { IMAGE_URL } from '../services/api';

const CourseDetailsScreen = ({ route, navigation }) => {
    const { businessData, autoSelect, selectedBatchId, selectedMonthGroupId, preSelectedSubjects, paymentPlan } = route.params;

    // 🔥 Category එක "Others" නම් Special Flow එකක් නෙමෙයි (Streams පෙන්නන්නේ නෑ). 
    // නැත්නම් (A/L වගේ නම්) Special Flow එක Active වෙනවා (Streams පෙන්නනවා).
    const isSpecialFlow = String(businessData?.category || '').toLowerCase() !== 'others';

    const [step, setStep] = useState(isSpecialFlow ? 1 : 2);
    const [activeStream, setActiveStream] = useState('All');
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedMonthGroup, setSelectedMonthGroup] = useState(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [enrolledSubjects, setEnrolledSubjects] = useState([]);
    const [groupPaidSubjects, setGroupPaidSubjects] = useState({});
    const [fullPaidSubjects, setFullPaidSubjects] = useState([]);
    const [batchInstallments, setBatchInstallments] = useState([]);

    const [totalAmount, setTotalAmount] = useState(0);
    const [isDiscountApplied, setIsDiscountApplied] = useState(false);
    const [activeDiscountPrice, setActiveDiscountPrice] = useState(null);
    const [loading, setLoading] = useState(false);

    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [availableInstallmentPlan, setAvailableInstallmentPlan] = useState(null);

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        api.get('/student/my-enrolled-subjects').then(res => {
            if (Array.isArray(res.data)) {
                setEnrolledSubjects(res.data);
            } else if (res.data && res.data.enrolledSubjects) {
                setEnrolledSubjects(res.data.enrolledSubjects || []);
                setGroupPaidSubjects(res.data.groupPaidSubjects || {});
                setFullPaidSubjects(res.data.fullPaidSubjects || []);
            }
        }).catch(e => { });
    }, []);

    useEffect(() => {
        if (selectedBatch?.id) {
            api.get(`mobile/installments/${selectedBatch.id}`)
                .then(res => { if (Array.isArray(res.data)) setBatchInstallments(res.data); })
                .catch(e => console.log("Installments fetch error:", e));
        }
    }, [selectedBatch]);

    useEffect(() => {
        if (autoSelect) {
            try {
                const batch = (businessData?.batches || []).find(b => b.id == selectedBatchId);
                if (batch) {
                    setSelectedBatch(batch);

                    const groups = Array.isArray(batch.groups) ? batch.groups : Object.values(batch.groups || {});
                    const group = groups.find(g => g.id == selectedMonthGroupId);
                    if (group) setSelectedMonthGroup(group);

                    setSelectedPlan(paymentPlan || 'full');

                    if (preSelectedSubjects) {
                        const subjectsArr = typeof preSelectedSubjects === 'string' ? JSON.parse(preSelectedSubjects) : preSelectedSubjects;
                        if (Array.isArray(subjectsArr)) {
                            setSelectedSubjects(subjectsArr.map(id => parseInt(id)));
                        }
                    }

                    setStep(5); // Subject selection step
                }
            } catch (e) {
                console.log("Auto select parse error:", e);
            }
        }
    }, [autoSelect]);

    // 🔥 FILTER LOGIC FIX 🔥
    const availableStreams = useMemo(() => {
        if (!businessData?.streams) return ['All'];
        const streams = businessData.streams.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'all');
        return [...streams, 'All'];
    }, [businessData]);

    const showStreamFilter = isSpecialFlow && availableStreams.length >= 2;

    const batches = useMemo(() => businessData?.batches || [], [businessData]);
    const safeGroups = useMemo(() => { if (!selectedBatch?.groups) return []; return Array.isArray(selectedBatch.groups) ? selectedBatch.groups : Object.values(selectedBatch.groups); }, [selectedBatch]);

    const filteredSubjects = useMemo(() => {
        if (!selectedMonthGroup?.courses) return [];
        let courses = [];
        try {
            if (typeof selectedMonthGroup.courses === 'string') courses = JSON.parse(selectedMonthGroup.courses);
            else courses = Array.isArray(selectedMonthGroup.courses) ? selectedMonthGroup.courses : Object.values(selectedMonthGroup.courses);
        } catch (e) { }

        // Only filter by stream if it's a Special Flow (A/L) and a specific stream is selected
        if (isSpecialFlow && activeStream !== 'All') {
            courses = courses.filter(c => {
                let parsedStreams = [];
                try {
                    if (c.streams && typeof c.streams === 'string') parsedStreams = JSON.parse(c.streams);
                    else if (Array.isArray(c.streams)) parsedStreams = c.streams;
                } catch (e) { }
                // 🔥 UPDATE: Added 'Common Subjects' and 'Common' handling
                if (parsedStreams && parsedStreams.length > 0 && (parsedStreams.includes(activeStream) || parsedStreams.includes('Common Subjects') || parsedStreams.includes('Common'))) return true;
                if (c.stream && (c.stream.includes(activeStream) || c.stream.includes('Common'))) return true;
                return false;
            });
        }

        // 🔥 UPDATE: Remove duplicates based on course name and filter out already paid subjects
        const uniqueCourses = [];
        const seenNames = new Set();
        for (let c of courses) {
            const cleanName = c.name.trim().toLowerCase().replace(/\s+/g, ' ');
            const isPaidInGroup = (groupPaidSubjects[selectedMonthGroup?.id] || []).includes(c.id);
            const isFullyPaid = fullPaidSubjects.includes(c.id);

            if (!seenNames.has(cleanName) && !isPaidInGroup && !isFullyPaid) {
                seenNames.add(cleanName);
                uniqueCourses.push(c);
            }
        }
        return uniqueCourses;

    }, [selectedMonthGroup, activeStream, isSpecialFlow, groupPaidSubjects, fullPaidSubjects]);

    const toggleSubject = (courseId) => setSelectedSubjects(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);

    useEffect(() => {
        try {
            if (selectedSubjects.length === 0) { setTotalAmount(0); setIsDiscountApplied(false); setActiveDiscountPrice(null); return; }
            let total = 0; let rules = [];
            try { rules = JSON.parse(selectedMonthGroup?.discount_rules || '[]'); rules.sort((a, b) => b.courseCount - a.courseCount); } catch (e) { }

            const eligibleCount = filteredSubjects.filter(c => selectedSubjects.includes(c.id) && !c.isDiscountExcluded).length;
            let activeRule = null;
            for (let rule of rules) { if (eligibleCount >= rule.courseCount) { activeRule = rule; break; } }

            setIsDiscountApplied(!!activeRule);
            if (activeRule) setActiveDiscountPrice(activeRule.pricePerCourse); else setActiveDiscountPrice(null);

            filteredSubjects.filter(c => selectedSubjects.includes(c.id)).forEach(course => {
                if (activeRule && !course.isDiscountExcluded) total += parseFloat(activeRule.pricePerCourse || 0);
                else total += parseFloat(course.price || 0);
            });
            setTotalAmount(total);
        } catch (err) { }
    }, [selectedSubjects, filteredSubjects, selectedMonthGroup]);

    const checkInstallmentEligibility = () => {
        if (selectedPlan !== 'full' || batchInstallments.length === 0) return null;
        let sortedPlans = [...batchInstallments].sort((a, b) => b.subjectCount - a.subjectCount);
        for (let plan of sortedPlans) {
            if (selectedSubjects.length >= plan.subjectCount) return plan;
        }
        return null;
    };

    const proceedToPayment = () => {
        if (selectedSubjects.length === 0) return Alert.alert("Wait", "Please select at least one subject.");
        setLoading(true);
        setTimeout(() => {
            const eligiblePlan = checkInstallmentEligibility();
            if (eligiblePlan) {
                setAvailableInstallmentPlan(eligiblePlan); setShowInstallmentModal(true); setLoading(false);
            } else { navigateToPayment('full', totalAmount, null); }
        }, 300);
    };

    const navigateToPayment = (payType, amount, installmentPlan) => {
        setShowInstallmentModal(false); setLoading(false);
        navigation.navigate('PaymentMethod', {
            amount, businessId: businessData.id, batchId: selectedBatch.id, groupId: selectedMonthGroup.id, subjects: selectedSubjects, payType, installmentPlan: installmentPlan ? JSON.stringify(installmentPlan) : null
        });
    };

    const handlePayFullAmount = () => navigateToPayment('full', totalAmount, null);
    const handlePayInstallmentAmount = () => {
        try {
            const details = JSON.parse(availableInstallmentPlan.details);
            navigateToPayment('installment', parseFloat(details[0].amount), availableInstallmentPlan);
        } catch (e) { Alert.alert("Error", "Could not parse installment steps."); }
    };

    const handleBack = () => {
        if (step === 1) navigation.goBack();
        else if (step === 2) { if (isSpecialFlow) setStep(1); else navigation.goBack(); }
        else if (step === 3) setStep(2);
        else if (step === 4) setStep(3);
        else if (step === 5) {
            if (autoSelect) navigation.goBack();
            else { setStep(selectedPlan === 'full' ? 3 : 4); setSelectedSubjects([]); }
        }
    };

    const getStepTitle = () => {
        if (step === 1) return "Select Stream";
        if (step === 2) return "Select Batch";
        if (step === 3) return "Payment Type";
        if (step === 4) return "Select Month";
        return "Select Subjects";
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={true} />

            <View style={styles.redHeader}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}><Icon name="arrow-left" size={24} color="white" /></TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerCourseName} numberOfLines={1}>{businessData.name}</Text>
                        <Text style={styles.stepIndicatorText}>{getStepTitle()}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

                {step === 1 && isSpecialFlow && (
                    <View style={styles.animateFade}>
                        <Text style={styles.label}>Select Your Stream</Text>
                        {availableStreams.filter(s => s !== 'All').map((stream, idx) => (
                            <TouchableOpacity key={idx} style={[styles.streamMainCard, { backgroundColor: idx % 2 === 0 ? '#B71C1C' : '#0D47A1', marginTop: idx > 0 ? 15 : 0 }]} onPress={() => { setActiveStream(stream); setStep(2); }}>
                                <View style={styles.cardContent}>
                                    <View>
                                        <Text style={styles.streamTitle}>{stream}</Text>
                                        <View style={styles.startBtn}><Text style={styles.startBtnText}>Select Stream <Icon name="chevron-right" size={14} /></Text></View>
                                    </View>
                                    <Icon name={idx % 2 === 0 ? "palette" : "finance"} size={80} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.animateFade}>
                        <Text style={styles.label}>Select Batch</Text>
                        {batches.length > 0 ? (
                            batches.map(batch => (
                                <TouchableOpacity key={batch.id} style={[styles.card, selectedBatch?.id === batch.id && styles.activeCard]} onPress={() => { setSelectedBatch(batch); setStep(3); }}>
                                    {batch.logo && batch.logo !== 'default.png' ? <Image source={{ uri: `${IMAGE_URL}icons/${batch.logo}` }} style={styles.batchLogo} resizeMode="contain" /> : <View style={styles.iconBox}><Icon name="school" size={26} color={selectedBatch?.id === batch.id ? "white" : COLORS.primary} /></View>}
                                    <View style={{ marginLeft: 15, flex: 1 }}>
                                        <Text style={[styles.cardText, selectedBatch?.id === batch.id && { color: 'white' }]}>{batch.name}</Text>
                                        <Text style={[styles.cardSubText, selectedBatch?.id === batch.id && { color: 'rgba(255,255,255,0.8)' }]}>Tap to continue</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={selectedBatch?.id === batch.id ? "white" : "#ccc"} />
                                </TouchableOpacity>
                            ))
                        ) : <Text style={styles.emptyText}>No batches available.</Text>}
                    </View>
                )}

                {step === 3 && (
                    <View style={styles.animateFade}>
                        <Text style={styles.label}>Select Payment Type</Text>
                        <View style={styles.planRow}>
                            <TouchableOpacity style={styles.planCardBig} onPress={() => {
                                setSelectedPlan('full');
                                const fullGroups = safeGroups.filter(g => g.type == 2 || String(g.name).toLowerCase().includes('full'));
                                if (fullGroups.length === 0) {
                                    if (safeGroups.length > 0) { setSelectedMonthGroup(safeGroups[0]); setStep(5); }
                                    else { Alert.alert("Wait", "Subjects not configured yet."); return; }
                                } else if (fullGroups.length === 1) { setSelectedMonthGroup(fullGroups[0]); setStep(5); }
                                else { setStep(4); }
                            }}>
                                <View style={[styles.planIconCircle, { backgroundColor: '#FFFBE6' }]}><Icon name="lightning-bolt" size={40} color="#F59E0B" /></View>
                                <Text style={styles.planTitleBig}>One-Time Payment</Text>
                                <Text style={styles.planSubBig}>Get bundle discounts</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.planCardBig} onPress={() => { setSelectedPlan('monthly'); setStep(4); }}>
                                <View style={[styles.planIconCircle, { backgroundColor: '#FEF2F2' }]}><Icon name="calendar-refresh" size={40} color={COLORS.primary} /></View>
                                <Text style={styles.planTitleBig}>Monthly Payment</Text>
                                <Text style={styles.planSubBig}>Pay month by month</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {step === 4 && (
                    <View style={styles.animateFade}>
                        <Text style={styles.label}>Select {selectedPlan === 'monthly' ? 'Month' : 'Group'}</Text>
                        {safeGroups.filter(g => selectedPlan === 'monthly' ? g.type == 1 : g.type != 1).map(group => (
                            <TouchableOpacity key={group.id} style={styles.card} onPress={() => { setSelectedMonthGroup(group); setStep(5); }}>
                                <View style={[styles.iconBox, { backgroundColor: '#e3f2fd' }]}><Icon name="calendar-month" size={24} color="#2563EB" /></View>
                                <Text style={styles.cardText}>{group.name}</Text>
                                <Icon name="chevron-right" size={24} color="#ccc" />
                            </TouchableOpacity>
                        ))}
                        {safeGroups.filter(g => selectedPlan === 'monthly' ? g.type == 1 : g.type != 1).length === 0 && <Text style={styles.emptyText}>No plans available.</Text>}
                    </View>
                )}

                {step === 5 && (
                    <View style={styles.animateFade}>

                        {selectedMonthGroup && (
                            <View style={{ backgroundColor: '#e3f2fd', padding: 12, borderRadius: 10, marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="calendar-month" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#1E3A8A', fontWeight: 'bold', fontSize: 14 }}>
                                    Paying for: {selectedMonthGroup.name}
                                </Text>
                            </View>
                        )}

                        {/* 🔥 UPDATE: Use showStreamFilter logic */}
                        {showStreamFilter && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                {availableStreams.map(stream => (
                                    <TouchableOpacity key={stream} onPress={() => { setActiveStream(stream); setSelectedSubjects([]); }}
                                        style={[styles.streamChip, activeStream === stream ? styles.streamChipActive : {}]}>
                                        <Text style={{ fontWeight: '800', fontSize: 13, color: activeStream === stream ? 'white' : '#666' }}>{stream}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <Text style={[styles.label, { marginTop: 0 }]}>Select Subjects</Text>

                        {isDiscountApplied && (
                            <View style={styles.discountBanner}>
                                <View style={styles.discountIconBox}><Icon name="tag-heart" size={24} color="#10B981" /></View>
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={styles.discountTitle}>Bundle Discount Applied!</Text>
                                    <Text style={styles.discountSub}>You are saving money on selected subjects.</Text>
                                </View>
                            </View>
                        )}

                        {filteredSubjects.length > 0 ? (
                            filteredSubjects.map(sub => {
                                const isSelected = selectedSubjects.includes(sub.id);
                                // Since we filter out already paid subjects now, this is technically always false. 
                                // But just in case, we'll map it to the correct group-specific logic instead of the global enrolledSubjects.
                                const isAlreadyPaid = (groupPaidSubjects[selectedMonthGroup?.id] || []).includes(sub.id) || fullPaidSubjects.includes(sub.id);
                                const dPrice = parseFloat(activeDiscountPrice || sub.price || 0);
                                const normalPrice = parseFloat(sub.price || 0);
                                const displayPrice = (isDiscountApplied && !sub.isDiscountExcluded && activeDiscountPrice) ? dPrice : normalPrice;

                                let courseImage = null;
                                try {
                                    let parsedPrices = sub.groupPrices;
                                    if (typeof parsedPrices === 'string') parsedPrices = JSON.parse(parsedPrices);
                                    if (typeof parsedPrices === 'string') parsedPrices = JSON.parse(parsedPrices);

                                    if (Array.isArray(parsedPrices)) {
                                        let imgObj = parsedPrices.find(gp => parseInt(gp.groupId) === parseInt(selectedMonthGroup?.id) && gp.lecturerImage && gp.lecturerImage.trim() !== '');
                                        if (!imgObj) imgObj = parsedPrices.find(gp => gp.lecturerImage && gp.lecturerImage.trim() !== '');
                                        if (imgObj) courseImage = imgObj.lecturerImage;
                                    }
                                } catch (e) { }

                                const validLecturerName = sub.lecturerName && sub.lecturerName.trim().toUpperCase() !== 'TBA' && sub.lecturerName.trim().length > 0;
                                const hasValidImage = courseImage && courseImage !== 'null' && courseImage !== 'default.png' && courseImage.trim() !== '';
                                const showLecturerRow = validLecturerName || hasValidImage;

                                return (
                                    <TouchableOpacity
                                        key={sub.id}
                                        disabled={isAlreadyPaid}
                                        style={[styles.subCard, isSelected && styles.subCardActive, isAlreadyPaid && styles.subCardDisabled]}
                                        onPress={() => toggleSubject(sub.id)}
                                    >
                                        <Icon name={isSelected || isAlreadyPaid ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={26} color={isAlreadyPaid ? "#9CA3AF" : isSelected ? COLORS.primary : "#D1D5DB"} />

                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.subName, isAlreadyPaid && { color: '#6B7280' }]} numberOfLines={2}>{sub.name}</Text>
                                            {sub.code && <Text style={styles.subCode} numberOfLines={1}>{sub.code}</Text>}

                                            {showLecturerRow && (
                                                <View style={styles.lecturerRow}>
                                                    {hasValidImage ? (
                                                        <Image source={{ uri: `${IMAGE_URL}icons/${courseImage}` }} style={styles.lecturerImage} />
                                                    ) : (
                                                        <View style={styles.lecturerIconBox}><Icon name="account" size={20} color="#9CA3AF" /></View>
                                                    )}
                                                    {validLecturerName && <Text style={styles.lecturerName} numberOfLines={1}>{sub.lecturerName}</Text>}
                                                </View>
                                            )}

                                            {isAlreadyPaid && (
                                                <View style={styles.alreadyPaidBadge}>
                                                    <Icon name="check-circle" size={12} color="#10B981" />
                                                    <Text style={styles.alreadyPaidText}>ALREADY ENROLLED</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80, marginLeft: 10 }}>
                                            {isDiscountApplied && !sub.isDiscountExcluded && activeDiscountPrice && !isAlreadyPaid && (
                                                <Text style={styles.strikePrice}>Rs. {normalPrice.toLocaleString()}</Text>
                                            )}
                                            <Text style={[styles.subPrice, isAlreadyPaid && { color: '#9CA3AF' }]}>Rs. {displayPrice.toLocaleString()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Icon name="file-document-outline" size={60} color="#ddd" />
                                <Text style={styles.emptyText}>No subjects found.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {step === 5 && (
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.totalLabel}>TOTAL PAYABLE</Text>
                        <Text style={styles.totalText}>Rs. {totalAmount.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity style={[styles.payBtn, (totalAmount === 0 || loading) && { backgroundColor: '#E5E7EB', shadowOpacity: 0 }]} disabled={totalAmount === 0 || loading} onPress={proceedToPayment}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={[styles.payBtnText, totalAmount === 0 && { color: '#9CA3AF' }]}>PROCEED <Icon name="arrow-right" size={18} /></Text>}
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={showInstallmentModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowInstallmentModal(false)}><Icon name="close" size={20} color="#666" /></TouchableOpacity>

                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <Icon name="shield-check" size={50} color={COLORS.primary} />
                            <Text style={styles.modalTitle}>Payment Options</Text>
                            <Text style={styles.modalSubTitle}>Choose how you want to pay</Text>
                        </View>

                        <TouchableOpacity style={styles.modalBtnOutline} onPress={handlePayFullAmount}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.modalIconBox}><Icon name="cash-check" size={26} color={COLORS.primary} /></View>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={{ fontWeight: '900', color: '#1A1A1A', fontSize: 15 }}>Pay Full Amount</Text>
                                    <Text style={{ color: '#666', fontSize: 12, fontWeight: '700', marginTop: 2 }}>Pay Rs. {totalAmount.toLocaleString()} at once</Text>
                                </View>
                            </View>
                            <Icon name="chevron-right" size={24} color="#ccc" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalBtnSolid} onPress={handlePayInstallmentAmount}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                                    <Icon name="calendar-clock" size={24} color="white" />
                                    <Text style={{ fontWeight: '900', color: 'white', fontSize: 16, marginLeft: 10 }}>Pay in Installments</Text>
                                </View>

                                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, marginBottom: 15 }}>
                                    {availableInstallmentPlan && JSON.parse(availableInstallmentPlan.details).map((inst, index) => {
                                        let suffix = index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th';
                                        return (
                                            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' }}>{index + 1}{suffix} Phase</Text>
                                                <Text style={{ color: 'white', fontSize: 14, fontWeight: '900' }}>Rs. {parseFloat(inst.amount).toLocaleString()}</Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 10, alignItems: 'center' }}>
                                    <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pay 1st Installment Now</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    redHeader: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 25, paddingTop: STATUSBAR_HEIGHT + 10, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 8, zIndex: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 15, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    headerCourseName: { fontSize: 22, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
    stepIndicatorText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
    label: { fontSize: 16, fontWeight: '900', color: '#1A1A1A', marginBottom: 15, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#999', fontWeight: 'bold' },
    streamMainCard: { height: 120, borderRadius: 20, overflow: 'hidden', elevation: 4, padding: 20, justifyContent: 'center' },
    cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    streamTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 10 },
    startBtn: { backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15 },
    startBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
    bgIcon: { position: 'absolute', right: -10, bottom: -15, opacity: 0.5 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
    activeCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, elevation: 5 },
    cardText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
    cardSubText: { fontSize: 12, color: '#999', fontWeight: '600' },
    batchLogo: { width: 45, height: 45, borderRadius: 10 },
    iconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' },
    planRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    planCardBig: { width: '48%', backgroundColor: 'white', paddingVertical: 25, paddingHorizontal: 15, borderRadius: 25, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#F0F0F0' },
    planIconCircle: { width: 65, height: 65, borderRadius: 33, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    planTitleBig: { fontWeight: '900', textAlign: 'center', color: '#1A1A1A', fontSize: 14, marginBottom: 4 },
    planSubBig: { fontSize: 10, color: '#888', fontWeight: '600', textAlign: 'center' },
    streamChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, backgroundColor: 'white', borderColor: '#E5E7EB', elevation: 1 },
    streamChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, elevation: 3 },
    discountBanner: { backgroundColor: '#ECFDF5', padding: 15, borderRadius: 16, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#10B981', borderStyle: 'dashed' },
    discountIconBox: { backgroundColor: '#D1FAE5', padding: 8, borderRadius: 12 },
    discountTitle: { color: '#047857', fontWeight: '900', fontSize: 14 },
    discountSub: { color: '#059669', fontSize: 11, fontWeight: '700', marginTop: 2 },

    subCard: { backgroundColor: 'white', padding: 16, borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
    subCardActive: { borderColor: COLORS.primary, backgroundColor: '#FEF2F2', borderWidth: 2, elevation: 3 },
    subCardDisabled: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', opacity: 0.8 },
    subName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', lineHeight: 20 },
    subCode: { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },

    lecturerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    lecturerImage: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
    lecturerIconBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    lecturerName: { flex: 1, fontSize: 12, color: '#4B5563', fontWeight: '800', marginLeft: 8 },

    alreadyPaidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginTop: 8 },
    alreadyPaidText: { color: '#047857', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginLeft: 3 },
    strikePrice: { textDecorationLine: 'line-through', color: '#9CA3AF', fontSize: 11, fontWeight: '800', marginBottom: 2 },
    subPrice: { fontWeight: '900', color: COLORS.primary, fontSize: 16 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, zIndex: 50 },
    totalLabel: { fontSize: 11, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    totalText: { fontSize: 22, fontWeight: '900', color: '#1A1A1A' },
    payBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 25, borderRadius: 14, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    payBtnText: { color: 'white', fontWeight: '900', fontSize: 15, marginRight: 6, letterSpacing: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40, elevation: 20 },
    closeModalBtn: { position: 'absolute', top: 15, right: 15, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 15, zIndex: 10 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginTop: 10 },
    modalSubTitle: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginTop: 5 },
    modalBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#F3F4F6', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 20, marginBottom: 12 },
    modalIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    modalBtnSolid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, padding: 20, borderRadius: 20, elevation: 5, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3 }
});

export default CourseDetailsScreen;