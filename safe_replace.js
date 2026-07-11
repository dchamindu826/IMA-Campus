const fs = require('fs');

let content = fs.readFileSync('src/screens/CourseContentScreen.jsx', 'utf8');
let lines = content.split('\n');

// 1. Line 408 is `<Text style={styles.headerTitle} numberOfLines={1}>{courseTitle}</Text>`
// 2. Line 409 is `                </View>`
// Let's replace line 409
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<Text style={styles.headerTitle} numberOfLines={1}>{courseTitle}</Text>') && 
        lines[i+1].includes('</View>')) {
        lines[i+1] = lines[i+1].replace('</View>', '</LinearGradient>');
    }
}

fs.writeFileSync('src/screens/CourseContentScreen.jsx', lines.join('\n'));
