const fs = require('fs');

// 1. Fix CourseDetailsScreen
let cd = fs.readFileSync('src/screens/CourseDetailsScreen.jsx', 'utf8');

// Always start at Step 2 (Batch) and remove Stream back logic
cd = cd.replace(
    `const initialStreams = businessData?.streams ? businessData.streams.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'all') : [];
    const initialShowStreamFilter = isSpecialFlow && initialStreams.length >= 2;

    const [step, setStep] = useState(initialShowStreamFilter ? 1 : 2);`,
    `const initialStreams = businessData?.streams ? businessData.streams.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'all') : [];
    const initialShowStreamFilter = isSpecialFlow && initialStreams.length >= 2;

    const [step, setStep] = useState(2); // Always start at Batch`
);

cd = cd.replace(
    `else if (step === 2) { if (isSpecialFlow) changeStep(1); else navigation.goBack(); }`,
    `else if (step === 2) { navigation.goBack(); }`
);

// Fix Batch Card (change from banner to nice square thumbnail)
const batchOld = `<TouchableOpacity key={batch.id} style={[styles.modernCard, {flexDirection: 'column', padding: 0, overflow: 'hidden'}, isSelected && styles.modernCardActive]} onPress={() => { setSelectedBatch(batch); changeStep(3); }}>
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

const batchNew = `<TouchableOpacity activeOpacity={0.8} key={batch.id} style={[styles.modernCard, isSelected && styles.modernCardActive]} onPress={() => { setSelectedBatch(batch); changeStep(3); }}>
                                        {batch.logo && batch.logo !== 'default.png' ? (
                                            <Image source={{ uri: \`\${IMAGE_URL}icons/\${batch.logo}\` }} style={{ width: 70, height: 70, borderRadius: 12, backgroundColor: '#fff', marginRight: 15 }} resizeMode="cover" />
                                        ) : (
                                            <View style={{ width: 70, height: 70, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                                <Icon name="school" size={30} color={COLORS.primary} />
                                            </View>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardText}>{batch.name}</Text>
                                            <Text style={styles.cardSubText}>Tap to select</Text>
                                        </View>
                                        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                                            {isSelected && <Icon name="check" size={16} color="white" />}
                                        </View>
                                    </TouchableOpacity>`;
cd = cd.replace(batchOld, batchNew);

// Add activeOpacity to PROCEED button and other cards to avoid "sudu kotu"
cd = cd.replace(
    `<TouchableOpacity disabled={totalAmount === 0 || loading} onPress={proceedToPayment} style={{width: 140}}>`,
    `<TouchableOpacity activeOpacity={0.8} disabled={totalAmount === 0 || loading} onPress={proceedToPayment} style={{width: 140}}>`
);
cd = cd.replace(/<TouchableOpacity key=\{idx\} onPress=\{/g, `<TouchableOpacity activeOpacity={0.8} key={idx} onPress={`);
cd = cd.replace(/<TouchableOpacity onPress=\{/g, `<TouchableOpacity activeOpacity={0.8} onPress={`);
cd = cd.replace(/<TouchableOpacity key=\{group.id\} style=\{styles.modernCard\}/g, `<TouchableOpacity activeOpacity={0.8} key={group.id} style={styles.modernCard}`);
cd = cd.replace(/<TouchableOpacity key=\{course.id\} style=\{styles.subjectCard\}/g, `<TouchableOpacity activeOpacity={0.8} key={course.id} style={styles.subjectCard}`);

fs.writeFileSync('src/screens/CourseDetailsScreen.jsx', cd);
console.log("CourseDetailsScreen updated");
