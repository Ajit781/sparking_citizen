const fs = require('fs');
const path = require('path');
const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

function setPastTime(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file === '.git') continue;
            const filepath = path.join(dir, file);
            try {
                const stat = fs.statSync(filepath);
                fs.utimesSync(filepath, pastTime, pastTime);
                if (stat.isDirectory()) {
                    setPastTime(filepath);
                }
            } catch (e) {}
        }
    } catch(e) {}
}

console.log("Setting timestamps to the past to fix Ninja...");
setPastTime(path.join(process.cwd(), 'node_modules', 'react-native-vision-camera'));
setPastTime(path.join(process.cwd(), 'node_modules', 'react-native-nitro-modules'));
setPastTime(path.join(process.cwd(), 'node_modules', 'react-native-nitro-image'));
setPastTime(path.join(process.cwd(), 'node_modules', 'react-native'));
setPastTime(path.join(process.cwd(), 'android'));
console.log("Done!");
