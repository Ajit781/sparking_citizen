const fs = require('fs');
const files = [
  'node_modules/react-native-nitro-modules/android/build.gradle',
  'node_modules/react-native-nitro-image/android/build.gradle',
  'node_modules/react-native-vision-camera/android/build.gradle'
];

files.forEach((file, idx) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if we already patched it
    if (content.includes('buildStagingDirectory')) {
        // replace the old patch
        content = content.replace(/buildStagingDirectory file\("C:\/tmp\/cxx\/[a-z0-9]+"\)/g, `buildStagingDirectory file("C:/tmp/cxx/vc${idx}")`);
    } else {
        content = content.replace(/externalNativeBuild \{[\s\n]*cmake \{/g, `externalNativeBuild { cmake { buildStagingDirectory file("C:/tmp/cxx/vc${idx}")\n`);
    }
    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
  } catch (e) {
    console.error(`Failed ${file}:`, e.message);
  }
});
