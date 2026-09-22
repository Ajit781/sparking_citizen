const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '..', 'assets', 'vehicle_hero_saffron.png');
const b64 = fs.readFileSync(imgPath).toString('base64');
const output = `// Auto-generated default vehicle image base64\nexport const DEFAULT_VEHICLE_IMAGE_BASE64 = "${b64}";\n`;
const outPath = path.join(__dirname, '..', 'src', 'constants', 'defaultVehicleImage.ts');
fs.writeFileSync(outPath, output);
console.log('Done! Size:', b64.length, 'chars');
