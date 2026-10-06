const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const regex = /return \(\s*<View style=\{s\.cardWrapper\}>[\s\S]*?<\/View>\s*\);\s*\}\)/;

const newBlock = eturn (
                        <View style={s.cardWrapper}>
                            <Pressable
                                onPress={() => handleSelectMapPin(id)}
                                style={[s.compactCard, isSelected && s.compactCardSelected, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }]}>
                                <Text style={[s.lotNameText, { flex: 1, fontSize: 16 }]} numberOfLines={1}>{name}</Text>
                                <View style={s.distSubBadge}>
                                    <Text style={[s.distSubText, { fontSize: 12 }]}>{distance}</Text>
                                </View>
                            </Pressable>
                        </View>
                    );
                });

if (content.match(regex)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync('src/screens/HomeScreen.tsx', content);
    console.log('Fixed item rendering');
} else {
    console.log('Regex did not match');
}
