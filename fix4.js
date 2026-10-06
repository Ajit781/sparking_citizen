const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const regex = /    modalTitle: \{\r?\n        fontSize: 18,\r?\n        fontWeight: '800',\r?\n        color: '#0F172A',\r?\n        marginBottom: 8,\r?\n        textAlign: 'center',\r?\n    \},\r?\n/g;
content = content.replace(regex, '');

fs.writeFileSync('src/screens/HomeScreen.tsx', content);
console.log('Fixed modalTitle');
