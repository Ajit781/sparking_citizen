const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// 1. Remove the List View Rendering block from inside main ScrollView
// It spans from line 828-967 ("List View Rendering" comment to the closing })}
const listBlockRegex = /\s*\{\/\* List View Rendering \*\/\}\r?\n\s*\{viewMode === 'list' && filteredLots\.map[\s\S]*?\}\)\}/;
content = content.replace(listBlockRegex, '');

// 2. Insert a standalone absolutely-positioned bottom sheet right before the closing </View> of s.container
// The closing </View> of container is right after all the modals
// We find the Notifications Modal start and insert before it after the main ScrollView ends

const insertAfterMarker = '            </ScrollView>\r\n\r\n            {/* Scroll to Top */}';
const insertAfterMarkerAlt = '            </ScrollView>\n\n            {/* Scroll to Top */}';

const bottomSheetJSX = "\n" +
"            {/* ===== FLOATING BOTTOM PARKING LIST SHEET ===== */}\n" +
"            {searchQuery.trim() !== '' && filteredLots.length > 0 && (\n" +
"                <View\n" +
"                    style={{\n" +
"                        position: 'absolute',\n" +
"                        bottom: 0,\n" +
"                        left: 0,\n" +
"                        right: 0,\n" +
"                        height: '38%',\n" +
"                        backgroundColor: '#FFFFFF',\n" +
"                        borderTopLeftRadius: 20,\n" +
"                        borderTopRightRadius: 20,\n" +
"                        elevation: 20,\n" +
"                        shadowColor: '#000',\n" +
"                        shadowOffset: { width: 0, height: -4 },\n" +
"                        shadowOpacity: 0.12,\n" +
"                        shadowRadius: 10,\n" +
"                        zIndex: 9999,\n" +
"                    }}\n" +
"                >\n" +
"                    {/* Handle bar */}\n" +
"                    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>\n" +
"                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />\n" +
"                    </View>\n" +
"                    {/* Header */}\n" +
"                    <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>\n" +
"                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>\n" +
"                            {filteredLots.length} Parking Areas Nearby\n" +
"                        </Text>\n" +
"                        <Text style={{ fontSize: 11, color: '#64748B' }}>Scroll to explore</Text>\n" +
"                    </View>\n" +
"                    {/* Scrollable list */}\n" +
"                    <ScrollView\n" +
"                        nestedScrollEnabled\n" +
"                        showsVerticalScrollIndicator={false}\n" +
"                        keyboardShouldPersistTaps='handled'\n" +
"                        style={{ flex: 1 }}\n" +
"                        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}\n" +
"                    >\n" +
"                        {filteredLots.slice(0, 10).map((lot, lotIdx) => {\n" +
"                            const id = String(lot.parking_area_id || lot.id || 'lot_' + lotIdx);\n" +
"                            const isSelected = id === selectedLotId;\n" +
"                            const name = lot.location || lot.name || 'Parking Slot';\n" +
"                            const distance = lot.distance_km ? lot.distance_km.toFixed(1) + ' km' : '';\n" +
"                            return (\n" +
"                                <Pressable\n" +
"                                    key={id}\n" +
"                                    onPress={() => handleSelectMapPin(id)}\n" +
"                                    style={[\n" +
"                                        {\n" +
"                                            flexDirection: 'row',\n" +
"                                            alignItems: 'center',\n" +
"                                            justifyContent: 'space-between',\n" +
"                                            paddingVertical: 12,\n" +
"                                            paddingHorizontal: 12,\n" +
"                                            marginBottom: 6,\n" +
"                                            borderRadius: 12,\n" +
"                                            backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',\n" +
"                                            borderWidth: 1,\n" +
"                                            borderColor: isSelected ? '#2563EB' : '#E2E8F0',\n" +
"                                        }\n" +
"                                    ]}\n" +
"                                >\n" +
"                                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', marginRight: 8 }} numberOfLines={1}>{name}</Text>\n" +
"                                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>\n" +
"                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>{distance}</Text>\n" +
"                                    </View>\n" +
"                                </Pressable>\n" +
"                            );\n" +
"                        })}\n" +
"                    </ScrollView>\n" +
"                </View>\n" +
"            )}\n";

if (content.includes(insertAfterMarker)) {
    content = content.replace(insertAfterMarker, bottomSheetJSX + '\n            </ScrollView>\r\n\r\n            {/* Scroll to Top */}');
} else {
    content = content.replace(insertAfterMarkerAlt, bottomSheetJSX + '\n            </ScrollView>\n\n            {/* Scroll to Top */}');
}

fs.writeFileSync('src/screens/HomeScreen.tsx', content);
console.log('Bottom sheet added');
