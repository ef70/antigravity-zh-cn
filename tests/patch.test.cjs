'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { transform, planPatch, replaceExactly } = require('../lib/patch.cjs');

test('strict replacement refuses missing or duplicated anchors', () => {
    assert.throws(() => replaceExactly('missing', 'hook', 'translated'));
    assert.throws(() => replaceExactly('hook hook', 'hook', 'translated'));
    assert.equal(replaceExactly('before hook after', 'hook', 'translated'), 'before translated after');
});

test('patch transforms retain original preload and target only label paths', () => {
    const hook = 'const electron_1 = require("electron");';
    const input = {
        'preload.js': 'const newBrowserAPI = { untouched: true };',
        'ipcHandlers.js': hook + '\nlabel: item.label ?? \'\',\nlabel: item.label ?? \'\',',
        'tray.js': hook + '\nelectron_1.Menu.buildFromTemplate(actions); new electron_1.MenuItem(options); countItem.label = "example" + \' running\';',
    };
    const saved = JSON.stringify(input);
    const result = transform(input, 'const chineseLabel = "zh-CN";');
    assert.ok(result['preload.js'].startsWith(input['preload.js']));
    assert.ok(result['preload.js'].includes('const chineseLabel'));
    assert.equal((result['ipcHandlers.js'].match(/translateNativeContextMenuLabel\(item.label/g) || []).length, 2);
    assert.ok(result['tray.js'].includes('item.label === undefined ? item'));
    assert.equal(JSON.stringify(input), saved);
    assert.throws(() => transform(result, 'anything'), /已有汉化标记/);
});

test('unsupported versions and mismatched sources fail before any write', () => {
    const prefix = path.join(os.tmpdir(), 'antigravity-zh-test-');
    const directory = fs.mkdtempSync(prefix);
    try {
        fs.mkdirSync(path.join(directory, 'dist'));
        const packageFile = path.join(directory, 'package.json');
        fs.writeFileSync(packageFile, JSON.stringify({ name: 'antigravity', version: '0.0.0' }));
        assert.throws(() => planPatch(directory), /不支持/);
        fs.writeFileSync(packageFile, JSON.stringify({ name: 'antigravity', version: '2.29.0' }));
        for (const name of ['preload.js', 'ipcHandlers.js', 'tray.js']) fs.writeFileSync(path.join(directory, 'dist', name), 'different source');
        assert.throws(() => planPatch(directory), /指纹不匹配/);
        assert.equal(fs.readFileSync(path.join(directory, 'dist/preload.js'), 'utf8'), 'different source');
    } finally {
        assert.ok(path.resolve(directory).startsWith(prefix));
        fs.rmSync(directory, { recursive: true });
    }
});
