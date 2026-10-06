const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const regex = /<Text style=\{s\.navBtnText\}>Directions<\/Text>[\s\S]*?<\/Pressable>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/screens/HomeScreen.tsx', content);
console.log('Fixed');
