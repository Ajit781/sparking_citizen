const fs = require('fs');
const files = [
  'node_modules/react-native-nitro-modules/android/build.gradle',
  'node_modules/react-native-nitro-image/android/build.gradle',
  'node_modules/react-native-vision-camera/android/build.gradle'
];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/buildStagingDirectory file\("C:\/tmp\/cxx\/vc\d"\)\n/g, '');
    fs.writeFileSync(file, content);
    console.log(`Reverted ${file}`);
  } catch (e) {
    console.error(`Failed ${file}:`, e.message);
  }
});
