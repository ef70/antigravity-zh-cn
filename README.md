# Antigravity 简体中文补丁

面向 Windows 桌面版 Antigravity 的非官方汉化源码。
当前适配 **2.29.0**，补丁版本 **2026.11.05.1**。
本项目与 Google 没有隶属关系，不提供完整应用、修改后的安装包或账号服务。

## 汉化范围

补丁覆盖主界面、设置、提示文字、项目和对话菜单，以及后台托盘菜单。
新版新增的内置浏览器设置、下载位置、浏览历史和语音输入设置也已补译。
补充概览栏目、用量提示、自定义市场、自动化空状态、语音音色、
外观无障碍、快捷键及项目设置文案。

- 保留模型名称、文件路径、日期数字和快捷键组合。
- 保留新版原有 preload 接口，不替换浏览器、安全或脚本隔离逻辑。
- 不修改登录、权限预设、模型额度、更新设置、项目或聊天记录。
- 不包含第三方插件内部页面，例如 Science 的分子结构查看器。
- 不是完整官方本地化，尚未匹配的英文会保持原样。

词库和对照表见 [Markdown 词库](docs/catalog.md)、
[CSV 词库](docs/catalog.csv) 和 [JSON 词库](docs/catalog.json)。
CSV 使用 UTF-8 BOM，可用 Excel 打开。

## 使用前检查

补丁会修改本机 `app.asar`，有启动失败和更新后被覆盖的风险。
先保存任务并退出 Antigravity，备份同版本的原始 `app.asar` 及其
`app.asar.unpacked` 配套目录，再进行以下操作。

需要 Node.js 22.12 或更高版本。依赖由 npm 官方仓库安装，版本已锁定。
仅支持登记的 2.29.0 文件指纹；版本相同但打包文件不同，也会拒绝修改。
不要删除指纹校验来强行安装，先确认新版差异并重新测试。

## 应用补丁

在仓库目录执行以下步骤。`<解包目录>` 是你自己从本机安装包解出的目录，
不是本仓库目录。补丁工具只修改该目录，不会自动退出应用或覆盖安装文件。

```powershell
npm ci --ignore-scripts
npm test
npm run catalog:check
npm run audit

# 换成自己的路径；不要把原始程序放进 Git 仓库。
npx --no-install asar extract "<安装目录>\resources\app.asar" "<解包目录>"
npm run patch -- --tree "<解包目录>" --dry-run
npm run patch -- --tree "<解包目录>"
npx --no-install asar pack --unpack-dir "node_modules/chrome-devtools-mcp" "<解包目录>" "<输出目录>\app.asar"
```

工具先校验全部目标文件，随后把三个原文件备份到解包目录旁的
`<解包目录>.zh-cn-backup`，只更改三个入口文件并增加原生菜单词库。
同一补丁重复执行会识别为已应用；未知修改、部分应用或备份冲突会报错。
不能把旧版 preload 或整个主进程文件覆盖到新版应用。

确认 Antigravity 已退出后，使用打包结果替换本机程序的主包。
输出的 `app.asar.unpacked` 与主包必须配套，不能误混其他版本。
重启后检查主页、设置、对话右键、托盘菜单及主要工作流。
如果启动异常，退出应用并恢复原始主包及配套目录，不清空用户数据。

## 后续补译

按文案来源选择维护位置，不要只编辑生成的对照表。

| 文件 | 内容 |
| --- | --- |
| `runtime/renderer.js` | 页面词库、设置专用词库、动态文本规则和 DOM 翻译器 |
| `runtime/native-menu-zh-cn.js` | 原生右键和托盘词库、运行数量提示 |
| `lib/patch.cjs` | 保留上游逻辑的补丁接入与拒绝覆盖检查 |
| `supported.json` | 已验证版本和文件 SHA-256 指纹 |
| `tests/` | 汉化、用户输入保护、菜单行为和补丁拒绝测试 |

修改词条后运行以下检查。界面属性中的完整英文、大小写、空格和快捷键
都可能影响匹配，尤其不要遗漏动态日期或快捷键后缀。

```powershell
npm test
npm run catalog
npm run catalog:check
npm run audit
```

`AGY_ASAR_DIR` 可指向本机已打补丁的解包目录，额外运行原生菜单、托盘和
preload 桥接集成测试。未设置时，这三个依赖私有安装文件的测试会明确跳过，
其余单元测试不依赖 Antigravity 安装包。

```powershell
$env:AGY_ASAR_DIR = "<已打补丁的解包目录>"
npm test
```

## 更新和隐私

Antigravity 更新可能覆盖补丁；新版本必须重新核对接口和指纹再适配。
不要覆盖更新器、放宽安全设置、修改认证信息或重新分发完整应用来保留汉化。
补丁不发起网络请求，不收集遥测，不接触聊天和账号目录。

仓库按发布白名单检查，仅发布汉化源码、词库、补丁工具、测试及说明。
不发布 `app.asar`、安装包、程序解包树、运行日志、配置备份或截图。
提交问题时也要自行遮挡账号、密钥和聊天内容。
本项目的原创源码按 MIT 许可提供；Antigravity、模型名称和其他商标归各权利人。

本次适配检查范围见 [验证记录](docs/verification.md)。
