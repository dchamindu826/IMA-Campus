const fs = require('fs');

let content = fs.readFileSync('src/screens/MyCoursesScreen.jsx', 'utf8');

// Replace the iconBox with the lecturer Image.
// The iconBox is currently:
// <View style={styles.iconBox}>
//     <Icon name="book-open-variant" size={26} color={COLORS.primary} />
// </View>

let replacement = `<View style={[styles.iconBox, { padding: 0, overflow: 'hidden', backgroundColor: 'transparent', borderWidth: 0 }]}>
            <Image 
                source={{ uri: \`\${IMAGE_URL}icons/\${item.batchLogo && item.batchLogo !== 'default.png' ? item.batchLogo : item.businessLogo}\` }} 
                style={{ width: '100%', height: '100%', borderRadius: 15 }} 
                resizeMode="cover" 
            />
        </View>`;

content = content.replace(
    /<View style=\{styles\.iconBox\}>\s*<Icon name="book-open-variant" size=\{26\} color=\{COLORS\.primary\} \/>\s*<\/View>/g, 
    replacement
);

fs.writeFileSync('src/screens/MyCoursesScreen.jsx', content);
console.log("Lecture image updated");
