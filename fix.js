const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const startMarker = '            {/* Bottom Floating Parking List */}';
const endMarker = '                    </ScrollView>\r\n                </View>\r\n            )}';
const altEndMarker = '                    </ScrollView>\n                </View>\n            )}';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);
let endLength = endMarker.length;
if (endIndex === -1) {
    endIndex = content.indexOf(altEndMarker);
    endLength = altEndMarker.length;
}

if (startIndex !== -1 && endIndex !== -1) {
    const block = content.slice(startIndex, endIndex + endLength);
    content = content.replace(block + '\r\n\r\n', '');
    content = content.replace(block + '\n\n', '');
    content = content.replace(block, ''); // fallback
    
    const innerRegex = /\{filteredLots\.slice\(0, 10\)\.map\(\(lot, lotIdx\) => \{([\s\S]*?)\}\)\}/;
    const match = block.match(innerRegex);
    
    if (match) {
        const innerCode = match[1];
        const newBlock = '\n                {/* List View Rendering */}\n                {searchQuery.trim() !== \'\' && filteredLots.slice(0, 10).map((lot, lotIdx) => {' + innerCode + '})}\n';
        
        const insertMarker = '                    )}\r\n                </View>\r\n\r\n            </ScrollView>';
        const altInsertMarker = '                    )}\n                </View>\n\n            </ScrollView>';
        
        let insertIndex = content.indexOf(insertMarker);
        let replaceTarget = insertMarker;
        if (insertIndex === -1) {
            insertIndex = content.indexOf(altInsertMarker);
            replaceTarget = altInsertMarker;
        }
        
        if (insertIndex !== -1) {
            content = content.replace(replaceTarget, replaceTarget.replace('</View>', '</View>' + newBlock));
            fs.writeFileSync('src/screens/HomeScreen.tsx', content);
            console.log('Fixed successfully');
        } else {
            console.log('Insert marker not found');
        }
    } else {
        console.log('Inner code not found');
    }
} else {
    console.log('Start/end not found');
}
