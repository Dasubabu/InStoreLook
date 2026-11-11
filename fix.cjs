const fs = require('fs');
const file = 'src/components/screens/AddEditProductScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\\`/g, '`');
fs.writeFileSync(file, content);
