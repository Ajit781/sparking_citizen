const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const listStartRegex = /\{\/\* List View Rendering \*\/\}\r?\n\s*\{viewMode === 'list' && filteredLots\.map\(\(lot, lotIdx\) => \{[\s\S]*?return \([\s\S]*?<\/View>\r?\n\s*\);\r?\n\s*\}\)\}/;

const listReplacement = "{/* List View Rendering */}\n" +
"{searchQuery.trim() !== '' && filteredLots.slice(0, 10).map((lot, lotIdx) => {\n" +
"    const id = String(lot.parking_area_id || lot.id || 'lot_' + lotIdx);\n" +
"    const isSelected = id === selectedLotId;\n" +
"    const name = lot.location || lot.name || 'Parking Slot';\n" +
"    const distance = lot.distance_km ? lot.distance_km.toFixed(1) + ' km' : '1.2 km';\n\n" +
"    return (\n" +
"        <View style={s.cardWrapper} key={id}>\n" +
"            <Pressable\n" +
"                onPress={() => handleSelectMapPin(id)}\n" +
"                style={[s.compactCard, isSelected && s.compactCardSelected, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }]}>\n" +
"                <Text style={[s.lotNameText, { flex: 1, fontSize: 16 }]} numberOfLines={1}>{name}</Text>\n" +
"                <View style={s.distSubBadge}>\n" +
"                    <Text style={[s.distSubText, { fontSize: 12 }]}>{distance}</Text>\n" +
"                </View>\n" +
"            </Pressable>\n" +
"        </View>\n" +
"    );\n" +
"})}\n";

if (content.match(listStartRegex)) {
    content = content.replace(listStartRegex, listReplacement);
    console.log("Replaced list");
}

const greenDotRegex = /<View style=\{\[s\.pulseGreenDot, \{ position: 'absolute'[\s\S]*?<\/View>/g;
content = content.replace(greenDotRegex, '');

const greetingRegex = /userSession\?\.user_name \|\| \(userSession\?\.mobile_no \? \Citizen \(\$\{userSession\.mobile_no\}\)\ : 'Citizen'\)/g;
content = content.replace(greetingRegex, "citizenProfile?.full_name || userSession?.user_name || userSession?.mobile_no || 'Citizen'");

content = content.replace(/height: 580/g, 'height: 480');

fs.writeFileSync('src/screens/HomeScreen.tsx', content);
console.log('Fixed everything');
