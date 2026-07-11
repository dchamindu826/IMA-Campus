const fs = require('fs');
let content = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', 'utf8');

content = content.replace(
`            let downloadConfig = {
                path: securePath, 
                fileCache: true, 
                followRedirect: true,
                timeout: 3600000 // 🔥 1 hour timeout for large videos
            };`,
`            let downloadConfig = {
                path: securePath, 
                fileCache: true, 
                followRedirect: true,
                trusty: true, // 🔥 Fixes "Use of own trust manager" error on Android
                timeout: 3600000 // 🔥 1 hour timeout for large videos
            };`
);

fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', content);
console.log('Successfully added trusty: true');
