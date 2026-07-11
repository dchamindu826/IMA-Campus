const fs = require('fs');
const glob = require('glob'); // Need to glob files? Or just array

const filesToUpdate = [
    'src/screens/MyCoursesScreen.jsx',
    'src/screens/PaymentScreen.jsx',
    'src/screens/LiveScreen.jsx',
    'src/screens/CourseContentScreen.jsx',
];

filesToUpdate.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // 1. Make sure LinearGradient and Icon are imported
    if (!content.includes("import LinearGradient")) {
        content = content.replace(/(import .* from 'react-native';)/, "$1\nimport LinearGradient from 'react-native-linear-gradient';");
    }

    // 2. Replace <View style={[styles.redHeader... or <View style={styles.redHeader}
    content = content.replace(/<View style={(\[?styles\.redHeader.*?\]?)}>/g, 
        `<LinearGradient colors={[COLORS.primary, '#9A0007']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={$1}>\n        <Icon name="school" size={150} color="rgba(255,255,255,0.06)" style={{position: 'absolute', right: -30, top: -20, transform: [{rotate: '-15deg'}]}} />`);
    
    // 3. Fix styles.redHeader to include overflow: 'hidden' and remove backgroundColor
    content = content.replace(/redHeader:\s*{([^}]+)}/g, (match, inner) => {
        let newInner = inner.replace(/backgroundColor:\s*COLORS\.primary,?\s*/g, '');
        if (!newInner.includes("overflow:")) {
            newInner += ", overflow: 'hidden'";
        }
        return `redHeader: {${newInner}}`;
    });

    // Write back
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
