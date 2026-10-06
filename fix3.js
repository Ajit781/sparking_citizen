const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const regex = /<Pressable\s+onPress=\{\(\) => handleBookPress\(lot\)\}[\s\S]*?<\/View>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/screens/HomeScreen.tsx', content);
console.log('Fixed completely');
