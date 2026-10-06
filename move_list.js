const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const listStartRegex = /\{\/\* List View Rendering \*\/\}\r?\n\{searchQuery\.trim\(\) !== '' && filteredLots\.slice\(0, 10\)\.map\(\(lot, lotIdx\) => \{[\s\S]*?return \([\s\S]*?<\/View>\r?\n\s*\);\r?\n\}\)\}/;

const match = content.match(listStartRegex);
if (match) {
    let block = match[0];
    content = content.replace(listStartRegex, '');
    
    // Find the end of s.sheet which is right before </ScrollView> ? No, there are other things?
    // Let's just put it right before the closing tag of the main ScrollView.
    // The main ScrollView closing tag is followed by {/* Scroll to Top */}
    const scrollEndMarker = "            </ScrollView>\r\n\r\n            {/* Scroll to Top */}";
    const altScrollEndMarker = "            </ScrollView>\n\n            {/* Scroll to Top */}";
    
    let marker = scrollEndMarker;
    if (content.indexOf(marker) === -1) {
        marker = altScrollEndMarker;
    }
    
    content = content.replace(marker, block + "\n" + marker);
    fs.writeFileSync('src/screens/HomeScreen.tsx', content);
    console.log("Moved list view successfully");
} else {
    console.log("List View Rendering not found");
}
