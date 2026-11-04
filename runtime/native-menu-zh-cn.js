'use strict';

const labels = new Map([
    ['Rename', '重命名'],
    ['Pin', '置顶'],
    ['Unpin', '取消置顶'],
    ['Mark Unread', '标为未读'],
    ['Mark Read', '标为已读'],
    ['Copy', '复制'],
    ['Split', '拆分'],
    ['Split Right', '向右拆分'],
    ['Split Down', '向下拆分'],
    ['Replace with New', '替换为新对话'],
    ['Conversation Name', '对话名称'],
    ['Conversation ID', '对话 ID'],
    ['Project Name', '项目名称'],
    ['Copy Project Name', '复制项目名称'],
    ['Project Settings', '项目设置'],
    ['Show in File Explorer', '在文件资源管理器中显示'],
    ['Delete Project', '删除项目'],
    ['Archive', '归档'],
    ['Delete', '删除'],
    ['No agents running', '无智能体正在运行'],
    ['Open Antigravity', '打开 Antigravity'],
    ['Quit', '退出'],
    ['Connect to WSL', '连接到 WSL'],
    ['Reopen Locally', '在本机重新打开'],
]);

const nativePatterns = [
    [/^(\d+) agents? running$/, '$1 个智能体正在运行'],
];

function translateNativeContextMenuLabel(label) {
    if (labels.has(label)) return labels.get(label);
    if (typeof label === 'string') {
        for (const [pattern, replacement] of nativePatterns) {
            if (pattern.test(label)) return label.replace(pattern, replacement);
        }
    }
    return label;
}

module.exports = { translateNativeContextMenuLabel };
