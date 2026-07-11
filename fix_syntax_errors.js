const fs = require('fs');

// Fix CourseContentScreen.jsx
let cc = fs.readFileSync('src/screens/CourseContentScreen.jsx', 'utf8');
// Fix first header (access denied)
cc = cc.replace(/<\/View>\r?\n\s*<\/View>\r?\n\s*\);\r?\n\s*}/, '</View>\n                </LinearGradient>\n            </View>\n        );\n    }');
// Fix second header (main render)
cc = cc.replace(/<\/View>\r?\n\s*<\/View>\r?\n\s*<View style=\{styles\.tabContainer\}>/, '</View>\n            </LinearGradient>\n\n            <View style={styles.tabContainer}>');
fs.writeFileSync('src/screens/CourseContentScreen.jsx', cc);

// Fix PaymentScreen.jsx
let ps = fs.readFileSync('src/screens/PaymentScreen.jsx', 'utf8');
// "Expected corresponding JSX closing tag for 'View'" on 237
// This means the script replaced `</View>` with `</LinearGradient>` when the opening tag was NOT `LinearGradient`, OR it replaced the WRONG `</View>`.
// Wait, my `fix_gradient_tags.js` replaced `</View>` with `</LinearGradient>`. Did it replace the outer View?
// Let's just restore PaymentScreen.jsx from git and apply the regex manually correctly.
