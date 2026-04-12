const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Desktop/Новая папка/frontend/src/lib/translations.ts', 'utf8');

const blocks = ['uz', 'ru', 'en'];
blocks.forEach(block => {
    const startIdx = content.indexOf(block + ': {');
    if (startIdx === -1) return;
    
    // Find matching brace for the block
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx + block.length + 2; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
            if (depth === 0) {
                endIdx = i;
                break;
            }
            depth--;
        }
    }
    
    if (endIdx === -1) return;
    
    const blockContent = content.substring(startIdx, endIdx);
    const lines = blockContent.split('\n');
    const keys = new Map();
    
    lines.forEach((line, lineNum) => {
        const match = line.match(/^\s*([a-zA-Z0-9_]+):/);
        if (match) {
            const key = match[1];
            if (keys.has(key)) {
                console.log(`Duplicate key "${key}" in block "${block}" at line ${lineNum + 1 + content.substring(0, startIdx).split('\n').length} (previous at line ${keys.get(key)})`);
            }
            keys.set(key, lineNum + 1 + content.substring(0, startIdx).split('\n').length);
        }
    });
});
