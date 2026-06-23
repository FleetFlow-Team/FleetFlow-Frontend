const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function getRelativeApiPath(filePath) {
    const relative = path.relative(rootDir, filePath);
    const depth = relative.split(path.sep).length - 1;
    if (depth === 0) {
        return 'js/api.js';
    } else if (depth === 1) {
        return '../js/api.js';
    } else if (depth === 2) {
        return '../../js/api.js';
    } else {
        return '../'.repeat(depth) + 'js/api.js';
    }
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.git' && f !== '.gemini' && f !== '.agents') {
                walkDir(dirPath, callback);
            }
        } else {
            if (f.endsWith('.html')) {
                callback(dirPath);
            }
        }
    });
}

console.log('Bắt đầu chèn script api.js...');

walkDir(rootDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Kiểm tra xem đã có api.js chưa
    if (content.includes('api.js')) {
        console.log(`[Đã tồn tại] ${filePath}`);
        return;
    }

    const apiPath = getRelativeApiPath(filePath);
    const scriptTag = `<script src="${apiPath}"></script>`;

    // Thử tìm vị trí chèn tối ưu
    // Ưu tiên 1: Chèn ngay trước script base.js (vì api.js độc lập và các script khác dùng nó)
    const baseScriptRegex = /(<script\s+[^>]*src=["'][^"']*base\.js["'][^>]*>\s*<\/script>)/i;
    // Ưu tiên 2: Chèn ngay trước script app.js
    const appScriptRegex = /(<script\s+[^>]*src=["'][^"']*app\.js["'][^>]*>\s*<\/script>)/i;
    // Ưu tiên 3: Chèn trước thẻ đóng </body>
    const bodyCloseRegex = /(<\/body>)/i;

    let updated = false;
    if (baseScriptRegex.test(content)) {
        content = content.replace(baseScriptRegex, `${scriptTag}\n    $1`);
        updated = true;
    } else if (appScriptRegex.test(content)) {
        content = content.replace(appScriptRegex, `${scriptTag}\n    $1`);
        updated = true;
    } else if (bodyCloseRegex.test(content)) {
        content = content.replace(bodyCloseRegex, `    ${scriptTag}\n$1`);
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[Đã chèn] ${filePath} -> ${apiPath}`);
    } else {
        console.log(`[Bỏ qua - Không tìm thấy chỗ chèn] ${filePath}`);
    }
});

console.log('Hoàn thành chèn script.');
