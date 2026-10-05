const fs = require('fs');
const path = 'D:/Office_projects/Disshaa/PujaConnect/src/screens/profile/UpdateProfileScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/clearRelForm\(\);\s*setShowAddRelative\(true\);/g, "navigation.navigate('AddFamilyMember');");
content = content.replace(/setRelErrors\(\{.*?\}\);\s*setShowAddRelative\(true\);/g, "setRelErrors({});\n    navigation.navigate('AddFamilyMember', { relative: rel });");

fs.writeFileSync(path, content, 'utf8');
console.log('Regex patched UpdateProfileScreen');
