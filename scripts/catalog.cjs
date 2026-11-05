'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'runtime/renderer.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(0, source.lastIndexOf('installZhCnRuntimeTranslation();')) + '\nglobalThis.data = { global: zhCnText, settings: zhCnSettingsFragments, rules: zhCnPatterns, settingsRules: zhCnSettingsPatterns };', context, { timeout: 1000 });
const nativeContext = vm.createContext({ module: { exports: {} } });
vm.runInContext(fs.readFileSync(path.join(root, 'runtime/native-menu-zh-cn.js'), 'utf8') + '\nglobalThis.data = { native: Object.fromEntries(labels), rules: nativePatterns };', nativeContext, { timeout: 1000 });
const dictionaries = { global: context.data.global, settings: context.data.settings, native: nativeContext.data.native };
const entries = Object.entries(dictionaries).flatMap(([scope, dictionary]) => Object.entries(dictionary).map(([english, chinese]) => ({ scope, english, chinese })));
const rules = [
    ...Array.from(context.data.rules, rule => ['global', rule]),
    ...Array.from(context.data.settingsRules, rule => ['settings', rule]),
    ...Array.from(nativeContext.data.rules, rule => ['native', rule]),
].map(([scope, [pattern, replacement]]) => ({ scope, pattern: pattern.toString(), replacement: String(replacement) }));
const manifest = require('../supported.json');
const data = { patchVersion: manifest.patchVersion, supportedVersions: Object.keys(manifest.versions), counts: { entries: entries.length, uniqueEnglish: new Set(entries.map(x => x.english)).size, dynamicRules: rules.length + 1 }, settingsRule: { pattern: '/^(\\d+) projects?$/', replacement: '$1 个项目' }, entries, rules };
const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
const csv = '\uFEFF' + [['Scope', 'English', 'Chinese'], ...entries.map(x => [x.scope, x.english, x.chinese])].map(row => row.map(quote).join(',')).join('\n') + '\n';
const markdown = ['# 中文词条表', '', `本表由 npm run catalog 从汉化源码生成，共 ${entries.length} 条作用域词条。`, '', '| 作用域 | 英文 | 中文 |', '| --- | --- | --- |', ...entries.map(x => '| ' + [x.scope, x.english, x.chinese].map(v => v.replace(/\|/g, '&#124;').replace(/\n/g, '<br>')).join(' | ') + ' |'), ''].join('\n');
const outputs = { 'catalog.json': JSON.stringify(data, null, 2) + '\n', 'catalog.csv': csv, 'catalog.md': markdown };
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
for (const [name, value] of Object.entries(outputs)) {
    const file = path.join(root, 'docs', name);
    if (process.argv.includes('--check')) assert.equal(fs.readFileSync(file, 'utf8'), value, `词库未同步：${name}`);
    else fs.writeFileSync(file, value, 'utf8');
}
console.log(JSON.stringify(data.counts));
