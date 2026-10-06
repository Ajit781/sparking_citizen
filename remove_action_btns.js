const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const regex = /<View style=\{s\.actionBtnGroup\}>[\s\S]*?<\/View>/g;
content = content.replace(regex, '');

content = content.replace(/height: 580/g, 'height: 480');

fs.writeFileSync('src/screens/HomeScreen.tsx', content);
console.log('Removed action buttons and resized map');
