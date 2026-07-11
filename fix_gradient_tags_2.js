const fs = require('fs');

function fixClosingTags(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let inGradient = 0;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<LinearGradient')) {
            inGradient++;
        }
        
        // Find the `</View>` that corresponds to the end of the header
        // In PaymentScreen.jsx and CourseContentScreen.jsx, the header has a specific structure:
        // <LinearGradient ...>
        //   <Icon />
        //   <TouchableOpacity> ... </TouchableOpacity>
        //   <View> ... </View>
        // </View> <- This should be </LinearGradient>
        
        if (inGradient > 0 && lines[i].match(/^\s*<\/View>\s*$/)) {
            // Check if the previous lines close the inner View
            if (i >= 1 && lines[i-1].match(/^\s*<\/View>\s*$/)) {
                lines[i] = lines[i].replace('</View>', '</LinearGradient>');
                inGradient--;
            }
            // For PaymentScreen, maybe the structure is slightly different. Let's handle it manually.
        }
    }
}

// Let's do a direct replacement for CourseContentScreen.jsx
let cc = fs.readFileSync('src/screens/CourseContentScreen.jsx', 'utf8');
cc = cc.replace(/(<LinearGradient[^>]*>[\s\S]*?<View[^>]*>[\s\S]*?<\/View>\s*)<\/View>/g, '$1</LinearGradient>');
fs.writeFileSync('src/screens/CourseContentScreen.jsx', cc);

// For PaymentScreen.jsx
let ps = fs.readFileSync('src/screens/PaymentScreen.jsx', 'utf8');
ps = ps.replace(/(<LinearGradient[^>]*>[\s\S]*?<View[^>]*>[\s\S]*?<\/View>\s*)<\/View>/g, '$1</LinearGradient>');
fs.writeFileSync('src/screens/PaymentScreen.jsx', ps);
