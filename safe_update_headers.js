const fs = require('fs');

function replaceHeaderSafe(file, startMatch, endMatch, replaceStart, replaceEnd) {
    let content = fs.readFileSync(file, 'utf8');
    let lines = content.split('\n');
    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(startMatch)) {
            startIdx = i;
        }
        if (startIdx !== -1 && i > startIdx && lines[i].includes(endMatch)) {
            // Find the closest </View> BEFORE endMatch
            for (let j = i; j >= startIdx; j--) {
                if (lines[j].includes('</View>')) {
                    endIdx = j;
                    break;
                }
            }
            if (endIdx !== -1) break;
        }
    }

    if (startIdx !== -1 && endIdx !== -1) {
        lines[startIdx] = lines[startIdx].replace(startMatch, replaceStart);
        lines[endIdx] = lines[endIdx].replace('</View>', replaceEnd);
        fs.writeFileSync(file, lines.join('\n'));
        console.log(`Updated ${file}`);
    } else {
        console.log(`Failed to update ${file}`);
    }
}

// PaymentScreen.jsx
replaceHeaderSafe(
    'src/screens/PaymentScreen.jsx',
    '<View style={styles.header}>',
    'Floating Tabs', // The text that appears right after the header
    `<LinearGradient colors={['#9A0007', '#E53935']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.header, { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 8 }]}>`,
    '</LinearGradient>'
);

// LiveScreen.jsx
replaceHeaderSafe(
    'src/screens/LiveScreen.jsx',
    '<View style={[styles.topHeader, { paddingTop: insets.top + 20 }]}>',
    '<FlatList',
    `<LinearGradient colors={['#9A0007', '#E53935']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.topHeader, { paddingTop: insets.top + 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 }]}>`,
    '</LinearGradient>'
);
