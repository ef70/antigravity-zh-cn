const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'runtime', 'renderer.js'), 'utf8');
const start = source.indexOf('const zhCnText =');
const end = source.lastIndexOf('installZhCnRuntimeTranslation();');
assert.ok(start >= 0 && end > start);
const context = vm.createContext({ Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 } });
vm.runInContext(source.slice(start, end) + '\nglobalThis.translation = { translateString, translateNode, zhCnSettingsFragments };', context);
const { translateString, translateNode, zhCnSettingsFragments } = context.translation;
const { translateNativeContextMenuLabel } = require('../runtime/native-menu-zh-cn');
const distRoot = process.env.AGY_ASAR_DIR;
let buildTemplate;
if (distRoot) {
    const nativeSource = fs.readFileSync(path.join(distRoot, 'dist', 'ipcHandlers.js'), 'utf8');
    const nativeStart = nativeSource.indexOf('function buildContextMenuTemplate(');
    const nativeEnd = nativeSource.indexOf('/**', nativeStart);
    const nativeContext = vm.createContext({ translateNativeContextMenuLabel });
    vm.runInContext(nativeSource.slice(nativeStart, nativeEnd) + '\nglobalThis.buildTemplate = buildContextMenuTemplate;', nativeContext);
    buildTemplate = nativeContext.buildTemplate;
}

class Element {
    constructor(tagName, parentElement = null, attributes = {}) {
        this.nodeType = 1;
        this.tagName = tagName.toUpperCase();
        this.parentElement = parentElement;
        this.attributes = { ...attributes };
        this.childNodes = [];
        this.value = '';
    }
    closest(selector) {
        for (let element = this; element; element = element.parentElement) {
            if (selector === '[role="dialog"]') {
                if (element.attributes.role === 'dialog') return element;
            } else if (selector.split(',').some(tag => tag.trim() === '[contenteditable="true"]' ? element.attributes.contenteditable === 'true' : tag.trim().toUpperCase() === element.tagName)) {
                return element;
            }
        }
        return null;
    }
    getAttribute(name) { return this.attributes[name]; }
    setAttribute(name, value) { this.attributes[name] = value; }
}

test('new settings entries are scoped to dialogs and preserve whitespace', () => {
    for (const [english, chinese] of Object.entries(zhCnSettingsFragments)) {
        assert.equal(translateString(english, true), chinese);
        assert.equal(translateString(english, false), english);
    }
    const key = 'Automatic Check for Updates';
    assert.equal(translateString(`  ${key}\n`, true), `  ${zhCnSettingsFragments[key]}\n`);
});

test('feedback account translation preserves the dynamic address', () => {
    assert.equal(translateString('Send feedback as user@example.test', true), '\u4ee5 user@example.test \u53d1\u9001\u53cd\u9988');
});

test('top-level menus translate outside settings without changing versions or hotkeys', () => {
    const labels = {
        Minimize: '\u6700\u5c0f\u5316',
        Maximize: '\u6700\u5927\u5316',
        Restore: '\u8fd8\u539f',
        'Zoom In': '\u653e\u5927',
        'Zoom Out': '\u7f29\u5c0f',
        'Reset Zoom': '\u91cd\u7f6e\u7f29\u653e',
        'Create Project': '\u521b\u5efa\u9879\u76ee',
        'Quick Start': '\u5feb\u901f\u5f00\u59cb',
        'Command Palette': '\u547d\u4ee4\u9762\u677f',
        'Check for Updates': '\u68c0\u67e5\u66f4\u65b0',
        Version: '\u7248\u672c',
    };
    for (const [english, chinese] of Object.entries(labels)) {
        assert.equal(translateString(english), chinese);
        assert.equal(translateString(english, true), chinese);
    }
    for (const version of ['2.26.0', '2.27.1-beta.2', '2.26.0.0']) {
        assert.equal(translateString(`Version ${version}`), `\u7248\u672c ${version}`);
    }
    assert.equal(translateString('Ctrl+Shift+P'), 'Ctrl+Shift+P');
    assert.equal(translateString('Version control is useful.'), 'Version control is useful.');
    assert.equal(translateString('science/biomolecular_structure_viewer'), 'science/biomolecular_structure_viewer');
});

test('shortcut headings translate before CSS uppercase styling', () => {
    for (const heading of ['Recommended', 'Navigation', 'Conversation', 'Layout Controls']) {
        const expected = zhCnSettingsFragments[heading];
        for (const variant of [heading, heading.toLowerCase(), heading.toUpperCase()]) {
            assert.equal(translateString(variant, true), expected);
        }
    }
});

test('model, permissions, and extension menus translate without selecting anything', () => {
    const labels = {
        Model: '\u6a21\u578b',
        Project: '\u9879\u76ee',
        'Project Settings': '\u9879\u76ee\u8bbe\u7f6e',
        'Select Project': '\u9009\u62e9\u9879\u76ee',
        'Select Model': '\u9009\u62e9\u6a21\u578b',
        'View Usage': '\u67e5\u770b\u7528\u91cf',
        'Refreshing...': '\u6b63\u5728\u5237\u65b0\u2026\u2026',
        Medium: '\u4e2d\u7b49',
        New: '\u65b0',
        Notice: '\u63d0\u793a',
        'Auto (Preview)': '\u81ea\u52a8\uff08\u9884\u89c8\uff09',
        'Use Global Settings': '\u4f7f\u7528\u5168\u5c40\u8bbe\u7f6e',
        Extensions: '\u6269\u5c55',
        'Biomolecular Structure Viewer': '\u751f\u7269\u5206\u5b50\u7ed3\u6784\u67e5\u770b\u5668',
    };
    for (const [english, chinese] of Object.entries(labels)) {
        assert.equal(translateString(english), chinese);
    }
    for (const name of ['Gemini 4 Argon', 'Gemini 3.8 Flash', 'Claude Opus 5.5', 'Claude Sonnet 5.5', 'science/biomolecular_structure_viewer']) {
        assert.equal(translateString(name), name);
    }
    assert.equal(translateString('Select Project Ctrl+;'), '\u9009\u62e9\u9879\u76ee Ctrl+;');
    assert.equal(translateString('Select Model Ctrl+/'), '\u9009\u62e9\u6a21\u578b Ctrl+/');
    assert.equal(translateString('Select project, current: No Project'), '\u9009\u62e9\u9879\u76ee\uff0c\u5f53\u524d\uff1a\u65e0\u9879\u76ee');
});

test('quota reset countdowns translate all duration units and preserve numbers', () => {
    const cases = [
        ['6d 23h', '6 \u5929 23 \u5c0f\u65f6'],
        ['2h 30m', '2 \u5c0f\u65f6 30 \u5206\u949f'],
        ['45m', '45 \u5206\u949f'],
        ['9s', '9 \u79d2'],
    ];
    for (const [english, chinese] of cases) {
        assert.equal(translateString(`Resets in ${english}`), `\u5c06\u5728 ${chinese} \u540e\u91cd\u7f6e`);
    }
    assert.equal(translateString('Resets in an unknown time'), 'Resets in an unknown time');
});

test('conversation actions, nested menus, and tooltips translate with shortcuts intact', () => {
    const labels = {
        Agents: '\u667a\u80fd\u4f53',
        'Click to Open Docs': '\u70b9\u51fb\u6253\u5f00\u6587\u6863',
        'Send Message': '\u53d1\u9001\u6d88\u606f',
        'Record Audio': '\u5f55\u5236\u97f3\u9891',
        Overview: '\u6982\u89c8',
        Review: '\u5ba1\u9605',
        Files: '\u6587\u4ef6',
        Terminal: '\u7ec8\u7aef',
        'Toggle Overview Panel': '\u663e\u793a\u6216\u9690\u85cf\u6982\u89c8\u9762\u677f',
        'Open in Antigravity IDE': '\u5728 Antigravity IDE \u4e2d\u6253\u5f00',
        Rename: '\u91cd\u547d\u540d',
        Pin: '\u7f6e\u9876',
        Unpin: '\u53d6\u6d88\u7f6e\u9876',
        Archive: '\u5f52\u6863',
        Split: '\u62c6\u5206',
        Copy: '\u590d\u5236',
        'Split Right': '\u5411\u53f3\u62c6\u5206',
        'Split Down': '\u5411\u4e0b\u62c6\u5206',
        'Replace with New': '\u66ff\u6362\u4e3a\u65b0\u5bf9\u8bdd',
        'Conversation Name': '\u5bf9\u8bdd\u540d\u79f0',
        'Conversation ID': '\u5bf9\u8bdd ID',
        'Project Name': '\u9879\u76ee\u540d\u79f0',
    };
    for (const [english, chinese] of Object.entries(labels)) {
        assert.equal(translateString(english), chinese);
    }
    for (const name of ['firestore-rules-author', 'flutter_a11y_agent', 'Ctrl+M', 'Ctrl+Shift+D', 'Enter']) {
        assert.equal(translateString(name), name);
    }
});

test('relative message timestamps preserve elapsed values', () => {
    const cases = [['20d ago', '20 \u5929\u524d'], ['2mo ago', '2 \u4e2a\u6708\u524d'], ['45m ago', '45 \u5206\u949f\u524d']];
    for (const [english, chinese] of cases) {
        assert.equal(translateString(english), chinese);
    }
    assert.equal(translateString('20d'), '20d');
});

test('sidebar menus and combined tooltip shortcuts translate outside settings', () => {
    const labels = {
        'Group By': '\u5206\u7ec4\u65b9\u5f0f',
        'Sort Conversations': '\u5bf9\u8bdd\u6392\u5e8f',
        'Sort Projects': '\u9879\u76ee\u6392\u5e8f',
        'Last Updated': '\u6700\u8fd1\u66f4\u65b0',
        'Last Prompt': '\u6700\u8fd1\u63d0\u95ee',
        'Custom Order': '\u81ea\u5b9a\u4e49\u987a\u5e8f',
        'Mark Unread': '\u6807\u4e3a\u672a\u8bfb',
        'Mark All as Read': '\u5168\u90e8\u6807\u4e3a\u5df2\u8bfb',
        Delete: '\u5220\u9664',
        'Good Response': '\u56de\u7b54\u4e0d\u9519',
        'Bad Response': '\u56de\u7b54\u4e0d\u4f73',
        'Toggle Auxiliary Pane': '\u663e\u793a\u6216\u9690\u85cf\u8f85\u52a9\u9762\u677f',
    };
    for (const [english, chinese] of Object.entries(labels)) {
        assert.equal(translateString(english), chinese);
    }
    assert.equal(translateString('Send Message Enter'), '\u53d1\u9001\u6d88\u606f Enter');
    assert.equal(translateString('Send Message Ctrl+Enter'), '\u53d1\u9001\u6d88\u606f Ctrl+Enter');
    assert.equal(translateString('Record Audio Ctrl+M'), '\u5f55\u5236\u97f3\u9891 Ctrl+M');
    assert.equal(translateString('Toggle Auxiliary Pane Ctrl+Shift+B'), '\u663e\u793a\u6216\u9690\u85cf\u8f85\u52a9\u9762\u677f Ctrl+Shift+B');
});

test('conversation hovercards and auxiliary pane labels preserve shortcuts and input', () => {
    const labels = {
        'Archive Conversation': '\u5f52\u6863\u5bf9\u8bdd',
        'Pin Conversation': '\u7f6e\u9876\u5bf9\u8bdd',
        'Unpin Conversation': '\u53d6\u6d88\u7f6e\u9876\u5bf9\u8bdd',
        'Maximize Pane': '\u6700\u5927\u5316\u9762\u677f',
        'Open File': '\u6253\u5f00\u6587\u4ef6',
        Active: '\u8fdb\u884c\u4e2d',
        Idle: '\u7a7a\u95f2',
        Updated: '\u66f4\u65b0\u4e8e',
    };
    for (const [english, chinese] of Object.entries(labels)) {
        assert.equal(translateString(english), chinese);
    }
    for (const action of ['Archive Conversation', 'Pin Conversation', 'Unpin Conversation', 'Maximize Pane']) {
        for (const shortcut of ['Ctrl+Alt+A', 'Alt+Shift+P', 'Ctrl+Shift+M']) {
            assert.equal(translateString(`${action} ${shortcut}`), `${labels[action]} ${shortcut}`);
        }
    }
    const placeholder = 'Search tabs, files, extensions, subagents, artifacts, tasks...';
    const input = new Element('input', null, { placeholder, 'aria-label': 'Search for content to open' });
    input.value = 'Active project notes';
    translateNode(input);
    assert.equal(input.getAttribute('placeholder'), '\u641c\u7d22\u6807\u7b7e\u9875\u3001\u6587\u4ef6\u3001\u6269\u5c55\u3001\u5b50\u667a\u80fd\u4f53\u3001\u4ea7\u7269\u3001\u4efb\u52a1\u2026\u2026');
    assert.equal(input.getAttribute('aria-label'), '\u641c\u7d22\u8981\u6253\u5f00\u7684\u5185\u5bb9');
    assert.equal(input.value, 'Active project notes');
    assert.equal(translateString('10\u67085\u65e5, 16:46'), '10\u67085\u65e5, 16:46');
    assert.equal(translateString('Updated project dependencies.'), 'Updated project dependencies.');
    for (const date of ['7\u670824\u65e5, 20:53', '10\u67085\u65e5, 16:46', '2026\u5e747\u670824\u65e5\uff0c20:53:01']) {
        assert.equal(translateString(`Updated ${date}`), `\u66f4\u65b0\u4e8e ${date}`);
        assert.equal(translateString(`  Updated ${date}\n`), `  \u66f4\u65b0\u4e8e ${date}\n`);
    }
});

test('native context menus translate recursively without changing action metadata', { skip: !distRoot }, () => {
    const submenu = Object.freeze([
        Object.freeze({ id: 'copy-title', label: 'Conversation Name', accelerator: 'Ctrl+C', disabled: true }),
        Object.freeze({ id: 'copy-id', label: 'Conversation ID', type: 'checkbox', checked: true }),
    ]);
    const original = Object.freeze([
        Object.freeze({ id: 'rename', label: 'Rename', accelerator: 'Alt+Shift+R' }),
        Object.freeze({ type: 'separator' }),
        Object.freeze({ id: 'copy', label: 'Copy', type: 'submenu', submenu }),
        Object.freeze({ id: 'delete', label: 'Delete', disabled: false }),
    ]);
    const before = JSON.stringify(original);
    const selections = [];
    const translated = buildTemplate(original, id => selections.push(id));
    assert.equal(translated[0].label, '\u91cd\u547d\u540d');
    assert.equal(translated[2].label, '\u590d\u5236');
    assert.equal(translated[2].submenu[0].label, '\u5bf9\u8bdd\u540d\u79f0');
    assert.equal(translated[2].submenu[1].label, '\u5bf9\u8bdd ID');
    assert.equal(translated[3].label, '\u5220\u9664');
    for (let i = 0; i < original.length; i++) {
        for (const key of ['id', 'accelerator', 'checked']) {
            assert.equal(translated[i][key], original[i][key]);
        }
        if (original[i].type !== 'separator') {
            assert.equal(translated[i].enabled, !original[i].disabled);
        }
    }
    assert.equal(translated[2].submenu[0].enabled, false);
    assert.equal(translated[2].submenu[0].accelerator, 'Ctrl+C');
    assert.equal(translated[2].submenu[1].checked, true);
    assert.equal(JSON.stringify(original), before);
    translated[2].submenu[1].click();
    translated[3].click();
    assert.deepEqual(selections, ['copy-id', 'delete']);
});

test('native menu translation preserves unknown labels', () => {
    for (const label of ['constructor', 'firestore-rules-author', 'My Project', '']) {
        assert.equal(translateNativeContextMenuLabel(label), label);
    }
});

test('tray menu translates initial, asynchronous, and live count labels without changing actions', { skip: !distRoot }, () => {
    const traySource = fs.readFileSync(path.join(distRoot, 'dist', 'tray.js'), 'utf8');
    const captures = { tray: null, menu: null };
    class Tray {
        constructor() { captures.tray = this; }
        setToolTip(value) { this.tooltip = value; }
        setContextMenu(menu) { this.menu = menu; }
        on(event, handler) { this[event] = handler; }
    }
    const electron = {
        Tray,
        app: { getName: () => 'Antigravity' },
        nativeImage: { createFromPath: () => ({}) },
        Menu: { buildFromTemplate: items => {
            captures.menu = { items, insert: (position, item) => captures.menu.items.splice(position, 0, item) };
            return captures.menu;
        } },
        MenuItem: function (options) { Object.assign(this, options); },
    };
    const trayContext = vm.createContext({
        exports: {}, __dirname,
        require: name => {
            if (name === 'electron') return electron;
            if (name === 'path') return path;
            if (name === './utils') return { isMacOS: () => false };
            if (name === './native-menu-zh-cn') return { translateNativeContextMenuLabel };
            throw new Error(`Unexpected import: ${name}`);
        },
    });
    vm.runInContext(traySource, trayContext);
    const open = () => {};
    const quit = () => {};
    const focus = () => {};
    const actions = Object.freeze([
        Object.freeze({ id: 'running-agents', label: 'No agents running', enabled: false }),
        Object.freeze({ type: 'separator' }),
        Object.freeze({ label: 'Open Antigravity', click: open }),
        Object.freeze({ label: 'Quit', click: quit }),
    ]);
    trayContext.exports.createTray(actions, focus);
    assert.equal(captures.menu.items[0].label, '\u65e0\u667a\u80fd\u4f53\u6b63\u5728\u8fd0\u884c');
    assert.equal(captures.menu.items[0].enabled, false);
    assert.equal(captures.menu.items[1], actions[1]);
    assert.equal(captures.menu.items[2].label, '\u6253\u5f00 Antigravity');
    assert.equal(captures.menu.items[2].click, open);
    assert.equal(captures.menu.items[3].label, '\u9000\u51fa');
    assert.equal(captures.menu.items[3].click, quit);
    assert.equal(captures.tray.click, focus);
    assert.equal(actions[0].label, 'No agents running');
    const submenu = Object.freeze([Object.freeze({ label: 'Ubuntu-24.04', checked: true, click: open })]);
    trayContext.exports.insertTrayMenuItem(2, Object.freeze({ label: 'Connect to WSL', submenu }));
    assert.equal(captures.menu.items[2].label, '\u8fde\u63a5\u5230 WSL');
    assert.equal(captures.menu.items[2].submenu, submenu);
    assert.equal(submenu[0].label, 'Ubuntu-24.04');
    trayContext.exports.insertTrayMenuItem(3, Object.freeze({ label: 'Reopen Locally', click: open }));
    assert.equal(captures.menu.items[3].label, '\u5728\u672c\u673a\u91cd\u65b0\u6253\u5f00');
    assert.equal(captures.menu.items[3].click, open);
    for (const count of [1, 2, 123, 0]) {
        trayContext.exports.updateTrayAgentCount(count);
        assert.equal(captures.menu.items[0].label, count > 0 ? `${count} \u4e2a\u667a\u80fd\u4f53\u6b63\u5728\u8fd0\u884c` : '\u65e0\u667a\u80fd\u4f53\u6b63\u5728\u8fd0\u884c');
        assert.equal(captures.menu.items[0].enabled, false);
    }
});

test('project menu labels translate in both rendered and native menus', () => {
    const labels = {
        'Copy Project Name': '\u590d\u5236\u9879\u76ee\u540d\u79f0',
        'Project Settings': '\u9879\u76ee\u8bbe\u7f6e',
        'Show in File Explorer': '\u5728\u6587\u4ef6\u8d44\u6e90\u7ba1\u7406\u5668\u4e2d\u663e\u793a',
        'Delete Project': '\u5220\u9664\u9879\u76ee',
    };
    for (const [english, chinese] of Object.entries(labels)) {
        assert.equal(translateString(english), chinese);
        assert.equal(translateNativeContextMenuLabel(english), chinese);
    }
});

test('preload context-menu bridge remains unchanged and preserves selection results', { skip: !distRoot }, async () => {
    const exposed = {};
    const calls = [];
    const electron = {
        contextBridge: { exposeInMainWorld: (name, api) => { exposed[name] = api; } },
        ipcRenderer: { on: () => {}, removeListener: () => {}, invoke: async (...args) => { calls.push(args); return 'copy-id'; } },
    };
    const fullContext = vm.createContext({
        exports: {},
        require: (name) => { assert.equal(name, 'electron'); return electron; },
        document: { readyState: 'loading' },
        window: { addEventListener: () => {} },
    });
    vm.runInContext(fs.readFileSync(path.join(distRoot, 'dist', 'preload.js'), 'utf8'), fullContext);
    const original = [
        { id: 'copy-id', label: 'Copy', accelerator: 'Ctrl+C' },
    ];
    const result = await exposed.electronNative.showContextMenu(original);
    assert.equal(result, 'copy-id');
    assert.equal(calls[0][0], 'window:show-context-menu');
    assert.equal(calls[0][1], original);
    assert.equal(calls[0][1][0].label, 'Copy');
    assert.equal(calls[0][1][0].id, 'copy-id');
    assert.equal(calls[0][1][0].accelerator, 'Ctrl+C');
});

test('textarea placeholders translate without touching entered content', () => {
    const dialog = new Element('div', null, { role: 'dialog' });
    const textarea = new Element('textarea', dialog, { placeholder: 'Describe the bug you encountered...' });
    const userText = { nodeType: 3, nodeValue: 'Bug Report', parentElement: textarea };
    textarea.value = 'Bug Report';
    textarea.childNodes.push(userText);
    translateNode(textarea);
    translateNode(userText);
    assert.equal(textarea.getAttribute('placeholder'), zhCnSettingsFragments['Describe the bug you encountered...']);
    assert.equal(textarea.value, 'Bug Report');
    assert.equal(userText.nodeValue, 'Bug Report');
});

test('all feedback placeholders translate after changing feedback type', () => {
    const dialog = new Element('div', null, { role: 'dialog' });
    const textarea = new Element('textarea', dialog);
    const placeholders = [
        'Describe the bug you encountered...',
        'Describe the feature you would like to see...',
        'Describe your auth or billing issue...',
        'Describe your Remote Control issue...',
        'Enter your feedback here...',
        'Please list the steps to reproduce the issue',
    ];
    for (const placeholder of placeholders) {
        textarea.setAttribute('placeholder', placeholder);
        translateNode(textarea);
        assert.equal(textarea.getAttribute('placeholder'), zhCnSettingsFragments[placeholder]);
    }
});

test('settings text translates while code and chat content stay unchanged', () => {
    const dialog = new Element('div', null, { role: 'dialog' });
    const label = { nodeType: 3, nodeValue: 'Focus Input', parentElement: dialog };
    translateNode(label);
    assert.equal(label.nodeValue, zhCnSettingsFragments['Focus Input']);
    const chat = { nodeType: 3, nodeValue: 'Focus Input', parentElement: new Element('div') };
    translateNode(chat);
    assert.equal(chat.nodeValue, 'Focus Input');
    const code = new Element('code', dialog);
    const nested = new Element('span', code);
    const codeText = { nodeType: 3, nodeValue: 'Open Settings', parentElement: nested };
    translateNode(codeText);
    assert.equal(codeText.nodeValue, 'Open Settings');
});

test('2.29 browser settings and greeting translate without changing identities', () => {
    assert.equal(translateString('Workspace'), '\u5de5\u4f5c\u533a');
    assert.equal(translateString('Built-in Browser', true), '\u5185\u7f6e\u6d4f\u89c8\u5668');
    assert.equal(translateString('Built-in Browser'), 'Built-in Browser');
    assert.equal(translateString('Download Location', true), '\u4e0b\u8f7d\u4f4d\u7f6e');
    assert.equal(translateString('to be installed. The browser subagent can be invoked by typing /browser in the conversation input box.', true), '。在对话输入框中输入 /browser 即可调用浏览器子智能体。');
    assert.equal(translateString('3 projects', true), '3 \u4e2a\u9879\u76ee');
    assert.equal(translateString('3 projects'), '3 projects');
    assert.equal(translateString('Hi Example, what can we get done today?'), '\u4f60\u597d\uff0cExample\uff0c\u4eca\u5929\u9700\u8981\u5b8c\u6210\u4ec0\u4e48\uff1f');
    for (const name of ['constructor', 'toString', '__proto__']) assert.equal(translateString(name), name);
});

test('rich text input is never rewritten', () => {
    const editable = new Element('div', null, { contenteditable: 'true' });
    const child = new Element('span', editable);
    const text = { nodeType: 3, parentElement: child, nodeValue: 'Open File' };
    child.childNodes.push(text);
    editable.childNodes.push(child);
    translateNode(editable);
    translateNode(text);
    assert.equal(text.nodeValue, 'Open File');
});
