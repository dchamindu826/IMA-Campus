const fs = require('fs');
let content = fs.readFileSync('src/screens/CourseDetailsScreen.jsx', 'utf8');

// 1. Fix state initialization for step
const stateSearch = `    const isSpecialFlow = String(businessData?.category || '').toLowerCase() !== 'others';

    const [step, setStep] = useState(isSpecialFlow ? 1 : 2);`;
    
const stateReplace = `    const isSpecialFlow = String(businessData?.category || '').toLowerCase() !== 'others';
    const initialStreams = businessData?.streams ? businessData.streams.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'all') : [];
    const initialShowStreamFilter = isSpecialFlow && initialStreams.length >= 2;

    const [step, setStep] = useState(initialShowStreamFilter ? 1 : 2);`;
content = content.replace(stateSearch, stateReplace);

// 2. Fix Header Gradient
content = content.replace(
    `colors={['#b92b27', '#1565C0']}`,
    `colors={[COLORS.primary, '#9A0007']}`
);

// 3. Fix Stream Cards Gradient
content = content.replace(
    `colors={idx % 2 === 0 ? ['#D32F2F', '#9A0007'] : ['#1976D2', '#004BA0']}`,
    `colors={idx % 2 === 0 ? ['#D32F2F', '#9A0007'] : ['#E53935', '#B71C1C']}`
);

// 4. Fix Monthly Payment Gradient (Blue -> Dark Red/Grey)
content = content.replace(
    `colors={['#1E3C72', '#2A5298']}`,
    `colors={['#424242', '#212121']}` // Or dark red: ['#B71C1C', '#7F0000']
);
content = content.replace(
    `colors={['#1E3C72', '#2A5298']}`,
    `colors={['#B71C1C', '#7F0000']}` // Use Dark Red for Monthly
);

// 5. Fix Batch Card to Banner
const batchSearch = `                                    <TouchableOpacity key={batch.id} style={[styles.modernCard, isSelected && styles.modernCardActive]} onPress={() => { setSelectedBatch(batch); changeStep(3); }}>
                                        <View style={[styles.logoContainer, isSelected && styles.logoContainerActive]}>
                                            {batch.logo && batch.logo !== 'default.png' ? 
                                                <Image source={{ uri: \`\${IMAGE_URL}icons/\${batch.logo}\` }} style={styles.batchLogo} resizeMode="contain" /> 
                                                : <Icon name="school" size={26} color={isSelected ? "white" : COLORS.primary} />}
                                        </View>
                                        <View style={{ marginLeft: 15, flex: 1 }}>
                                            <Text style={styles.cardText}>{batch.name}</Text>
                                            <Text style={styles.cardSubText}>Tap to select</Text>
                                        </View>
                                        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                                            {isSelected && <Icon name="check" size={16} color="white" />}
                                        </View>
                                    </TouchableOpacity>`;
const batchReplace = `                                    <TouchableOpacity key={batch.id} style={[styles.modernCard, {flexDirection: 'column', padding: 0, overflow: 'hidden'}, isSelected && styles.modernCardActive]} onPress={() => { setSelectedBatch(batch); changeStep(3); }}>
                                        {batch.logo && batch.logo !== 'default.png' ? (
                                            <Image source={{ uri: \`\${IMAGE_URL}icons/\${batch.logo}\` }} style={{ width: '100%', height: 120, backgroundColor: '#f9f9f9' }} resizeMode="contain" />
                                        ) : (
                                            <View style={{ width: '100%', height: 100, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                                                <Icon name="school" size={40} color={COLORS.primary} />
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, width: '100%' }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.cardText}>{batch.name}</Text>
                                                <Text style={styles.cardSubText}>Tap to select</Text>
                                            </View>
                                            <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                                                {isSelected && <Icon name="check" size={16} color="white" />}
                                            </View>
                                        </View>
                                    </TouchableOpacity>`;
content = content.replace(batchSearch, batchReplace);

// 6. Fix Modal Button Gradient
content = content.replace(
    `colors={['#1E3A8A', '#3B82F6']}`,
    `colors={['#B71C1C', '#E53935']}`
);

// 7. Fix Lecturer Avatar size in styles
content = content.replace(
    `lecturerAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: '#E2E8F0' },`,
    `lecturerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#E2E8F0' },`
);
content = content.replace(
    `lecturerAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },`,
    `lecturerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },`
);
content = content.replace(
    `subLecturerName: { fontSize: 12, color: '#64748B', fontWeight: '800' },`,
    `subLecturerName: { fontSize: 13, color: '#475569', fontWeight: '800' },`
);
// Also increase the lecturer placeholder icon size
content = content.replace(
    `<Icon name="account" size={16} color="#9CA3AF" />`,
    `<Icon name="account" size={24} color="#9CA3AF" />`
);


fs.writeFileSync('src/screens/CourseDetailsScreen.jsx', content);
console.log("Done updating CourseDetailsScreen.jsx");
