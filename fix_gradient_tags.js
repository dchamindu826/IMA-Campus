const fs = require('fs');

const files = [
    'src/screens/MyCoursesScreen.jsx',
    'src/screens/PaymentScreen.jsx',
    'src/screens/LiveScreen.jsx',
    'src/screens/CourseContentScreen.jsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // The structure is:
    // <LinearGradient ...>
    //   <Icon ... />
    //   <TouchableOpacity ...>...</TouchableOpacity>
    //   <View ...>...</View>
    // </View>
    
    // We want to replace that specific </View> with </LinearGradient>
    // We can do it by finding <LinearGradient and then finding the matching closing tag?
    // Or we can just look for `</View>\n\n      <View style={styles.content}>` or something.
    // Let's use a regex to replace the first `</View>` that comes after `<LinearGradient...>` and before `<View style={styles.content}>` or similar.
    
    // Actually, in all these files, I can just replace:
    // `        </View>\n      </View>`
    // with:
    // `        </View>\n      </LinearGradient>`
    // Let's try replacing it:
    
    let regex1 = /<\/View>\n\s*<\/View>\n\n\s*<View style={styles\.content}>/;
    let replace1 = `</View>\n      </LinearGradient>\n\n      <View style={styles.content}>`;
    
    let regex2 = /<\/View>\r?\n\s*<\/View>\r?\n\r?\n\s*<View style=\{styles\.content\}>/;
    
    if (regex2.test(content)) {
        content = content.replace(regex2, `</View>\n      </LinearGradient>\n\n      <View style={styles.content}>`);
        console.log("Fixed", file);
    } else {
        console.log("Could not find target in", file);
    }

    fs.writeFileSync(file, content);
}
