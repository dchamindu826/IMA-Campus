const fs = require('fs');

// 1. PaymentScreen.jsx
let ps = fs.readFileSync('src/screens/PaymentScreen.jsx', 'utf8');
ps = ps.replace(
    '<View style={styles.header}>',
    `<LinearGradient colors={['#9A0007', '#E53935']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.header, { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 8 }]}>`
);
ps = ps.replace(
    '</View>\n\n      {/* 🔥 Floating Tabs */}',
    '</LinearGradient>\n\n      {/* 🔥 Floating Tabs */}'
);
fs.writeFileSync('src/screens/PaymentScreen.jsx', ps);

// 2. LiveScreen.jsx
let ls = fs.readFileSync('src/screens/LiveScreen.jsx', 'utf8');
ls = ls.replace(
    '<View style={[styles.topHeader, { paddingTop: insets.top + 20 }]}>',
    `<LinearGradient colors={['#9A0007', '#E53935']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.topHeader, { paddingTop: insets.top + 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 }]}>`
);
ls = ls.replace(
    '</View>\n\n      <FlatList',
    '</LinearGradient>\n\n      <FlatList'
);
fs.writeFileSync('src/screens/LiveScreen.jsx', ls);

console.log("Headers updated successfully!");
