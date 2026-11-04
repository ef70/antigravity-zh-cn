'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const allowed = new Set([
    '.gitignore', '.gitattributes', 'LICENSE', 'README.md', 'package.json', 'package-lock.json', 'supported.json',
    'lib/patch.cjs', 'runtime/renderer.js', 'runtime/native-menu-zh-cn.js',
    'scripts/patch.cjs', 'scripts/catalog.cjs', 'scripts/audit.cjs',
    'tests/translation.test.cjs', 'tests/patch.test.cjs',
    'docs/catalog.json', 'docs/catalog.csv', 'docs/catalog.md', 'docs/verification.md',
]);
const forbidden = [
    /gh[opsu]_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /[A-Z]:[\\/]Users[\\/]/i,
    /[\w.%+-]+@(?:gmail|qq|163|outlook|hotmail)\.com/i,
    /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i,
];
const found = [];
function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        if (directory === root && ['.git', 'node_modules'].includes(item.name)) continue;
        const file = path.join(directory, item.name);
        assert.ok(!item.isSymbolicLink(), `不发布符号链接：${item.name}`);
        if (item.isDirectory()) { visit(file); continue; }
        const relative = path.relative(root, file).split(path.sep).join('/');
        assert.ok(allowed.has(relative), `非白名单文件：${relative}`);
        const content = fs.readFileSync(file, 'utf8');
        assert.ok(Buffer.byteLength(content) < 150000, `文件过大：${relative}`);
        assert.ok(!content.includes('\0'), `不发布二进制文件：${relative}`);
        for (const pattern of forbidden) assert.ok(!pattern.test(content), `疑似敏感内容：${relative}`);
        found.push(relative);
    }
}
visit(root);
for (const file of allowed) assert.ok(found.includes(file), `缺少发布文件：${file}`);
console.log(JSON.stringify({ result: 'PASS', fileCount: found.length, files: found.sort() }, null, 2));
