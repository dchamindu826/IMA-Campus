const fs = require('fs');
let content = fs.readFileSync('/root/IMA-Campus/MobileApp/src/components/UpgradeOfferWidget.jsx', 'utf8');

// 1. Fix getPricing logic
content = content.replace(
`    const getPricing = () => {
        if (!data || !data.subjectDetails || selectedSubjects.length === 0) {
            return { subtotal: 0, bundleDiscount: 0, monthlyPaid: 0, balanceToPay: 0, installments: [] };
        }

        const selectedDetails = data.subjectDetails.filter(sub => selectedSubjects.includes(sub.id));
        const subtotal = selectedDetails.reduce((sum, sub) => sum + sub.upgradeFullTarget, 0);

        let bundleDiscount = 0;
        const rich = data.richConfig;`,
`    const getPricing = () => {
        const batchData = data?.batches?.length > 0 ? data.batches[0] : data;
        if (!batchData || !batchData.subjectDetails || selectedSubjects.length === 0) {
            return { subtotal: 0, bundleDiscount: 0, monthlyPaid: 0, balanceToPay: 0, installments: [] };
        }

        const selectedDetails = batchData.subjectDetails.filter(sub => selectedSubjects.includes(sub.id));
        const subtotal = selectedDetails.reduce((sum, sub) => sum + sub.upgradeFullTarget, 0);

        let bundleDiscount = 0;
        const rich = batchData.richConfig;`
);

content = content.replace(
`        let monthlyPaid = 0;
        if (data.paidMonthlyPerSubject) {
            selectedSubjects.forEach(id => {
                monthlyPaid += data.paidMonthlyPerSubject[id] || 0;
            });
        } else {
            monthlyPaid = (data.totalPaidMonthly / (data.subjectDetails?.length || 1)) * selectedSubjects.length;
        }`,
`        let monthlyPaid = 0;
        if (batchData.paidMonthlyPerSubject) {
            selectedSubjects.forEach(id => {
                monthlyPaid += batchData.paidMonthlyPerSubject[id] || 0;
            });
        } else {
            monthlyPaid = (batchData.totalPaidMonthly / (batchData.subjectDetails?.length || 1)) * selectedSubjects.length;
        }`
);

// 2. Fix handleProceed logic
content = content.replace(
`        remarkDetails += \`. Prev Paid: LKR \${formatPrice(pricingResult.monthlyPaid)}\`;

        setShowModal(false);
        navigation.navigate('PaymentMethod', {
            amount: activeBalance.toString(),
            businessId: data.businessId,
            batchId: data.batchId,
            groupId: data.groupId,`,
`        remarkDetails += \`. Prev Paid: LKR \${formatPrice(pricingResult.monthlyPaid)}\`;

        const batchData = data?.batches?.length > 0 ? data.batches[0] : data;

        setShowModal(false);
        navigation.navigate('PaymentMethod', {
            amount: activeBalance.toString(),
            businessId: batchData.businessId,
            batchId: batchData.batchId,
            groupId: batchData.groupId,`
);

// 3. Fix Rendering Logic
content = content.replace(
`    if (loading) return null;

    if (!eligible && pendingUpgrade) {
        return (
            <View style={styles.bannerContainer}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.banner}>
                    <View style={styles.bannerContent}>
                        <Icon name="timer-sand" size={40} color="#FFF" />
                        <View style={styles.bannerTextContainer}>
                            <Text style={styles.bannerTitle}>Upgrade Verifying</Text>
                            <Text style={styles.bannerSub}>Your previous upgrade is being reviewed.</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    if (!eligible) return null;

    const pricing = getPricing();

    const config = data?.richConfig || {};
    const bannerUrl = config.bannerImage ? IMAGE_URL + config.bannerImage : null;
    
    const showInstallmentToggle = config.enableInstallments &&
        [1, 2, 3].includes(selectedSubjects.length) &&
        (config[\`installments\${selectedSubjects.length}\`]?.length > 0);

    return (
        <>
            <View style={styles.bannerContainer}>
                <TouchableOpacity onPress={() => setShowModal(true)}>
                    <ImageBackground source={{ uri: bannerUrl }} style={styles.banner} imageStyle={{ borderRadius: 15 }}>
                        <LinearGradient colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.1)']} style={[StyleSheet.absoluteFill, { borderRadius: 15 }]} />
                        <View style={styles.bannerContent}>
                            <Icon name="star-circle" size={40} color="#FFD700" />
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>Upgrade Your Course</Text>
                                <Text style={styles.bannerSub}>Special Offers Available</Text>
                            </View>
                        </View>
                    </ImageBackground>
                </TouchableOpacity>
            </View>

            <Modal visible={showModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderIcon}>
                                    <Icon name="trending-up" size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalTitle}>Upgrade Your Classes</Text>
                                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                                    <Icon name="close" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.stepTitle}>1. Select Subjects to Upgrade</Text>
                            {data?.subjectDetails?.map(sub => (`,
`    if (loading) return null;
    if (!eligible && !pendingUpgrade) return null;

    const batchData = data?.batches?.length > 0 ? data.batches[0] : data;
    const config = batchData?.richConfig || {};
    const pricing = getPricing();
    
    const showInstallmentToggle = config.enableInstallments &&
        [1, 2, 3].includes(selectedSubjects.length) &&
        (config[\`installments\${selectedSubjects.length}\`]?.length > 0);

    return (
        <>
            <View style={styles.bannerContainer}>
                {pendingUpgrade ? (
                    <TouchableOpacity onPress={() => setShowModal(true)}>
                        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.cardWidget} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardIconBox}>
                                    <Icon name="timer-sand" size={32} color="#FFF" />
                                </View>
                                <View style={styles.cardTextContainer}>
                                    <Text style={styles.cardTitle}>Upgrade Pending</Text>
                                    <Text style={styles.cardSub}>Your upgrade is currently being verified.</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.9}>
                        <LinearGradient 
                            colors={['#1e3a8a', '#3b82f6', '#93c5fd']} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 1 }} 
                            style={styles.cardWidget}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.cardIconBox}>
                                    <Icon name="star-shooting" size={30} color="#FBBF24" />
                                </View>
                                <View style={styles.cardTextContainer}>
                                    <Text style={styles.cardTitle}>Upgrade Special Offer!</Text>
                                    <Text style={styles.cardSub}>Tap to upgrade your monthly plan to the FULL course & get a discount.</Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#FFF" style={styles.cardArrow} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            <Modal visible={showModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderIcon}>
                                    <Icon name="trending-up" size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalTitle}>Upgrade Your Classes</Text>
                                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                                    <Icon name="close" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            {pendingUpgrade ? (
                                <View style={{padding: 20, alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, marginBottom: 20}}>
                                    <Icon name="timer-sand" size={40} color="#F59E0B" />
                                    <Text style={{fontSize: 16, fontWeight: 'bold', color: '#B45309', marginTop: 10}}>Upgrade is Verifying</Text>
                                    <Text style={{textAlign: 'center', color: '#92400E', marginTop: 5}}>Your previous upgrade payment is currently being reviewed. You will get access once approved.</Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.stepTitle}>1. Select Subjects to Upgrade</Text>
                                    {batchData?.subjectDetails?.length > 0 ? (
                                        batchData.subjectDetails.map(sub => (`
);

content = content.replace(
`                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={[styles.proceedBtn, selectedSubjects.length === 0 && {backgroundColor: '#CCC'}]} 
                                onPress={handleProceed}
                                disabled={selectedSubjects.length === 0}
                            >
                                <Text style={styles.proceedText}>Proceed to Checkout</Text>
                            </TouchableOpacity>
                        </View>`,
`                        {!pendingUpgrade && (
                            <View style={styles.footer}>
                                <TouchableOpacity 
                                    style={[styles.proceedBtn, selectedSubjects.length === 0 && {backgroundColor: '#CCC'}]} 
                                    onPress={handleProceed}
                                    disabled={selectedSubjects.length === 0}
                                >
                                    <Text style={styles.proceedText}>Proceed to Checkout</Text>
                                </TouchableOpacity>
                            </View>
                        )}`
);

content = content.replace(
`                                </View>
                            )}
                        </ScrollView>

                        {!pendingUpgrade && (`,
`                                </View>
                            )}
                                </>
                            )}
                        </ScrollView>

                        {!pendingUpgrade && (`
);

fs.writeFileSync('/root/IMA-Campus/MobileApp/src/components/UpgradeOfferWidget.jsx', content);
console.log('Successfully updated UpgradeOfferWidget.jsx');
