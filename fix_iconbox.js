const fs = require('fs');
let content = fs.readFileSync('src/screens/MyCoursesScreen.jsx', 'utf8');

const target = `<View style={styles.iconBox}>
            <Icon name="book-open-variant" size={26} color={COLORS.primary} />
        </View>`;

const replacement = `<View style={[styles.iconBox, { padding: 0, overflow: 'hidden', backgroundColor: 'transparent' }]}>
            <Image 
                source={{ uri: \`\${IMAGE_URL}icons/\${item.batchLogo && item.batchLogo !== 'default.png' ? item.batchLogo : item.businessLogo}\` }} 
                style={{ width: '100%', height: '100%', borderRadius: 12 }} 
                resizeMode="cover" 
            />
        </View>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/screens/MyCoursesScreen.jsx', content);
console.log("Fixed iconbox");
