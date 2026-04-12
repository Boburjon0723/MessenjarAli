const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../out');

function walk(dir, depth = 0) {
    const files = fs.readdirSync(dir);
    // For root files, path should stay relative or use index.html.
    // For subdir files, we need ../.
    const prefix = depth === 0 ? './' : '../'.repeat(depth);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, depth + 1);
        } else if (filePath.endsWith('.html')) {
            let content = fs.readFileSync(filePath, 'utf8');

            console.log(`Fixing paths in ${filePath} (depth: ${depth}, prefix: ${prefix})`);

            // 1. Fix absolute to relative for all src/href
            // This catches "/_next/...", "/favicon.png", etc.
            content = content.replace(/(src|href)="\/([^/][^"]*)"/g, `$1="${prefix}$2"`);

            // 2. Fix directory links for file:// protocol
            // href="./auth/" -> href="./auth/index.html"
            // href="../messages/" -> href="../messages/index.html"
            // Note: Next.js with trailingSlash: true always uses trailing slashes.
            content = content.replace(/href="([^"]*\/)"/g, (match, p1) => {
                // If it's a relative link (doesn't start with http/mailto/etc)
                if (!p1.includes(':') && !p1.startsWith('//')) {
                    return `href="${p1}index.html"`;
                }
                return match;
            });

            // 3. Fix Next.js serialized JSON data (hydration fix)
            // Next.js stores route information in script tags.
            content = content.replace(/"\/_next\//g, `"${prefix}_next/`);

            // 4. Fix specific absolute assets in strings
            const assets = ['favicon.png', 'welcome-bg.png', 'auth-bg.png', 'next.svg', 'window.svg', 'globe.svg', 'file.svg'];
            assets.forEach(asset => {
                const regex = new RegExp(`"/\\${asset}"`, 'g');
                content = content.replace(regex, `"${prefix}${asset}"`);
            });

            // 5. Fix CSS url() paths
            content = content.replace(/url\(&quot;\/([^&]+)&quot;\)/g, `url(&quot;${prefix}$1&quot;)`);
            content = content.replace(/url\('\/([^']+)'\)/g, `url('${prefix}$1')`);
            content = content.replace(/url\("\/([^"]+)"/g, `url("${prefix}$1")`);

            fs.writeFileSync(filePath, content);
        }
    });
}

if (fs.existsSync(outDir)) {
    walk(outDir);
    console.log('Final path fixing completed.');
} else {
    console.log('Out directory not found');
}
