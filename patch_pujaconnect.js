const fs = require('fs');
const path = 'D:/Office_projects/Disshaa/PujaConnect/src/screens/profile/AddressScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('useFocusEffect')) {
  content = "import { useFocusEffect } from '@react-navigation/native';\n" + content;
}

const targetHook = "  const { data: addressCount }";
const insertion = "\n  useFocusEffect(\n    React.useCallback(() => {\n      if (refetchAddresses) {\n        refetchAddresses();\n      }\n    }, [refetchAddresses])\n  );\n\n";

if (!content.includes('useFocusEffect(')) {
   content = content.replace(targetHook, insertion + targetHook);
   fs.writeFileSync(path, content, 'utf8');
   console.log('Patched successfully');
} else {
   console.log('Already patched');
}
