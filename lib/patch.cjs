'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const manifest = require('../supported.json');
const root = path.resolve(__dirname, '..');
const marker = '/* antigravity-zh-cn:begin */';
const fileNames = ['preload.js', 'ipcHandlers.js', 'tray.js'];
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function replaceExactly(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) throw new Error(`补丁锚点数量异常：预期 ${expected}，实际 ${count}`);
    return source.split(from).join(to);
}

function transform(files, renderer) {
    if (files['preload.js'].includes(marker)) throw new Error('已有汉化标记，请先恢复同版本备份。');
    const hook = 'const electron_1 = require("electron");';
    const translatedHook = hook + '\nconst { translateNativeContextMenuLabel } = require("./native-menu-zh-cn");';
    let ipc = replaceExactly(files['ipcHandlers.js'], hook, translatedHook);
    ipc = replaceExactly(ipc, "label: item.label ?? '',", "label: translateNativeContextMenuLabel(item.label ?? ''),", 2);
    let tray = replaceExactly(files['tray.js'], hook, translatedHook);
    tray = replaceExactly(tray, 'electron_1.Menu.buildFromTemplate(actions)', 'electron_1.Menu.buildFromTemplate(actions.map(item => item.label === undefined ? item : { ...item, label: translateNativeContextMenuLabel(item.label) }))');
    tray = replaceExactly(tray, 'new electron_1.MenuItem(options)', 'new electron_1.MenuItem({ ...options, label: translateNativeContextMenuLabel(options.label) })');
    tray = replaceExactly(tray, 'countItem.label =', 'countItem.label = translateNativeContextMenuLabel(');
    tray = replaceExactly(tray, "' running';", "' running');");
    return {
        'preload.js': files['preload.js'] + '\n' + marker + '\n(() => {\n' + renderer + '\n})();\n/* antigravity-zh-cn:end */\n',
        'ipcHandlers.js': ipc,
        'tray.js': tray,
    };
}

function planPatch(directory) {
    const target = path.resolve(directory);
    const info = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
    const support = manifest.versions[info.version];
    if (info.name !== 'antigravity' || !support) throw new Error(`不支持的应用版本：${info.version}`);
    const originals = Object.fromEntries(fileNames.map(name => [name, fs.readFileSync(path.join(target, 'dist', name), 'utf8')]));
    const native = fs.readFileSync(path.join(root, 'runtime', 'native-menu-zh-cn.js'), 'utf8');
    const nativeTarget = path.join(target, 'dist', 'native-menu-zh-cn.js');
    const alreadyPatched = support.patched && fileNames.every(name => digest(originals[name]) === support.patched[name]);
    if (alreadyPatched) {
        if (!fs.existsSync(nativeTarget) || fs.readFileSync(nativeTarget, 'utf8') !== native) throw new Error('原生词库不匹配，请恢复备份后重试。');
        return { target, version: info.version, alreadyPatched: true, files: {} };
    }
    for (const name of fileNames) {
        if (digest(originals[name]) !== support.original[name]) throw new Error(`原始文件指纹不匹配：${name}。不会覆盖未知版本或其他补丁。`);
    }
    if (fs.existsSync(nativeTarget)) throw new Error('检测到未登记的原生汉化文件，不自动覆盖。');
    const renderer = fs.readFileSync(path.join(root, 'runtime', 'renderer.js'), 'utf8');
    const files = transform(originals, renderer);
    files['native-menu-zh-cn.js'] = native;
    return { target, version: info.version, alreadyPatched: false, originals, files };
}

function applyPatch(directory, dryRun = false) {
    const plan = planPatch(directory);
    if (dryRun || plan.alreadyPatched) return plan;
    const backup = plan.target + '.zh-cn-backup';
    if (fs.existsSync(backup)) throw new Error('备份目录已存在，不覆盖旧备份。');
    fs.mkdirSync(backup);
    for (const name of fileNames) fs.copyFileSync(path.join(plan.target, 'dist', name), path.join(backup, name));
    const written = [];
    try {
        for (const [name, value] of Object.entries(plan.files)) {
            written.push(name);
            fs.writeFileSync(path.join(plan.target, 'dist', name), value, 'utf8');
        }
    } catch (error) {
        for (const name of written) {
            const destination = path.join(plan.target, 'dist', name);
            if (Object.hasOwn(plan.originals, name)) fs.copyFileSync(path.join(backup, name), destination);
            else fs.unlinkSync(destination);
        }
        throw error;
    }
    return plan;
}

module.exports = { applyPatch, planPatch, transform, replaceExactly, digest };
