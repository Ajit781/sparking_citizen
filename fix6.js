const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const regex = /return \(\s*<View style=\{s\.cardWrapper\}>[\s\S]*?<\/View>\s*\);\s*\}\)/;

const newBlock = "return (\n" +
"                        <View style={s.cardWrapper}>\n" +
"                            <Pressable\n" +
"                                onPress={() => handleSelectMapPin(id)}\n" +
"                                style={[s.compactCard, isSelected && s.compactCardSelected, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }]}>\n" +
"                                <Text style={[s.lotNameText, { flex: 1, fontSize: 16 }]} numberOfLines={1}>{name}</Text>\n" +
"                                <View style={s.distSubBadge}>\n" +
"                                    <Text style={[s.distSubText, { fontSize: 12 }]}>{distance}</Text>\n" +
"                                </View>\n" +
"                            </Pressable>\n" +
"                        </View>\n" +
"                    );\n" +
"                })";

if (content.match(regex)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync('src/screens/HomeScreen.tsx', content);
    console.log('Fixed item rendering completely');
} else {
    console.log('Regex did not match');
}
