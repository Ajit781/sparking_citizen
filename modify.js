const fs = require('fs');
let content = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const startMarker = '            {/* Bottom Floating Parking List */}';
const endMarker = '                    </ScrollView>\r\n                </View>\r\n            )}\r\n\r\n            {/* Scroll to Top */}';
const altEndMarker = '                    </ScrollView>\n                </View>\n            )}\n\n            {/* Scroll to Top */}';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);
if (endIndex === -1) endIndex = content.indexOf(altEndMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const endStrLength = endIndex === content.indexOf(endMarker) ? endMarker.length - '{/* Scroll to Top */}'.length : altEndMarker.length - '{/* Scroll to Top */}'.length;
    const blockToMove = content.slice(startIndex, endIndex + endStrLength);
    
    // Remove the block
    content = content.replace(blockToMove, '');
    
    // Find insertion point
    const insertMarker = '                        </View>\r\n                    )}\r\n                </View>';
    const altInsertMarker = '                        </View>\n                    )}\n                </View>';
    
    let insertIndex = content.indexOf(insertMarker);
    let insertStrLength = insertMarker.length;
    if (insertIndex === -1) {
        insertIndex = content.indexOf(altInsertMarker);
        insertStrLength = altInsertMarker.length;
    }
    
    if (insertIndex !== -1) {
        // Extract inner logic
        const innerRegex = /\{filteredLots\.slice\(0, 10\)\.map\(\(lot, lotIdx\) => \{([\s\S]*?)\}\)\}/;
        const match = blockToMove.match(innerRegex);
        if (match) {
            const innerCode = match[1];
            const newBlock = '\n\n                {/* List View Rendering */}\n                {searchQuery.trim() !== \'\' && filteredLots.slice(0, 10).map((lot, lotIdx) => {' + innerCode + '})}\n';
            
            content = content.slice(0, insertIndex + insertStrLength) + newBlock + content.slice(insertIndex + insertStrLength);
            fs.writeFileSync('src/screens/HomeScreen.tsx', content);
            console.log('Successfully reverted.');
        } else {
            console.log('Inner code not found');
        }
    } else {
        console.log('Insert marker not found');
    }
} else {
    console.log('Start or end marker not found');
}
