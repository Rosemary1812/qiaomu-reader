# Qiaomu Reader · 自用增强分叉

[上游仓库](https://github.com/joeseesun/qiaomu-reader) · [本分叉 Releases](https://github.com/Rosemary1812/qiaomu-reader/releases) · [反馈问题](https://github.com/Rosemary1812/qiaomu-reader/issues) · [提交 PR](https://github.com/Rosemary1812/qiaomu-reader/pulls) · [English](#english)

这是 [@Rosemary1812](https://github.com/Rosemary1812) 基于 [向阳乔木的 Qiaomu Reader](https://github.com/joeseesun/qiaomu-reader) 维护的**非官方分叉**。原项目提供 Obsidian 内的电子书阅读、划线、批注、阅读笔记和可选 AI 伴读；本分叉主要围绕个人阅读习惯，增加英文辅助阅读、书库管理和交互调整。

**目前主要用于自用，尚未经过长时间、高强度和多设备使用验证，可能存在 bug。** 部分功能只通过自动测试或个人桌面调试，不能视为完整验收。欢迎试用、反馈问题和提交 PR，尤其欢迎复现与修复。

下面描述的是本仓库 `main` 的代码，更新于 **2026-10-03**。GitHub Release 可能滞后于 `main`，安装已发布版本时请核对发行说明。

## 与上游的关系

- EPUB、PDF、FB2、MOBI、AZW3、CBZ 阅读、阅读笔记、原文回跳、主题、基础字体导入和 AI 伴读来自上游，保留原作者与第三方项目的署名。
- 本分叉已集成上游至 4.2.17 的一批修复，包括凭据设置、大型 PDF 内存、iOS PDF 打开和沉浸阅读等。集成这些修复不代表本分叉已完成对应平台的实机验证。
- 核对时上游已到 4.5.1。Qiaomu Agent、Home 联动和近期部分 EPUB／Android 修复尚未合入；找书入口已单独适配。本仓库不会自动跟随上游的所有功能与发行版本。
- Calibre 导入已回馈并合入上游；上游 4.5.0 也有查词、生词本和 Anki，但与本分叉采用不同实现。下面同时列出新增能力与交互差异，不将这些共有功能称为独有。
- 下表记录本分叉增加或调整的内容；上游也在持续演进，并非对上游最新版本的永久功能缺失声明。历史记录见 [CHANGELOG.md](CHANGELOG.md)。

## 本分叉增加或调整了什么

| 功能 | 本分叉的改动 | 在哪里使用 |
| --- | --- | --- |
| 找书 | 复用上游古腾堡目录搜索与 EPUB 下载，适配本分叉导入流程；其他来源仅单独点击外部搜索，不自动打开浏览器 | 书库 → 找书 |
| 离线英文查词 | 单词释义卡片、语境解释入口；调整卡片间距、关闭按钮及点击外部关闭 | 英文 EPUB 中点击单词或页内释义 |
| 英文页内小注 | 根据英语水平，在较难单词上方显示中文释义；处理句首词、释义重叠与点击 | 插件设置 → 英文阅读，开启小注并设置英语水平 |
| 生词本与 Anki | 保存单词、释义、例句和书籍来源到 Markdown 生词本；桌面端可通过 AnkiConnect 同步 | 单词卡片保存生词；插件设置 → 英文阅读 → 同步生词到 Anki，或同名命令 |
| 虚拟合集 | 手动创建合集、加入或移除图书，不移动原书文件；调整合集管理入口 | 书库 → 新建合集及图书菜单 |
| 书库列表与排序 | 网格／列表切换；按最近打开或阅读时间排序；移除顶部继续阅读卡片与列表重复按钮 | 书库；有记录的最近打开图书优先显示 |
| 封面操作 | 桌面网格的三点菜单在封面 hover 或键盘聚焦时显示，触控设备保留入口 | 书库网格封面 |
| 阅读热力图 | 按每日阅读目标显示一年记录；调整宽度和月份对齐，支持折叠，随书库内容滚动 | 书库 → 阅读热力图；阅读统计 |
| EPUB 连续滚动 | 跨章节上下滚动；修复从封面向下滚动的稳定性，目录高亮当前章节 | 阅读设置 → 翻页与布局 → 上下滚动 |
| 阅读快捷键 | Vim 风格导航、Windows 快捷键适配 | 阅读器内；快捷键与适用模式见设置 |
| 阅读字体 | 增加 OpenDyslexic；中文与英文字体分别设置，支持本书覆盖全局字体 | 插件设置 → 阅读外观，或书内阅读设置 → 文字与背景 |
| 自定义划线颜色 | 色盘与 HEX 输入、最近使用颜色、可设默认色；兼容已有预设颜色 | 选文工具栏 → 颜色菜单 → 自定义颜色… |
| 面板与按钮 | 统一目录、阅读设置和书库控件，收紧间距、调整信息分组；阅读设置标签改为文字与下划线 | 目录、阅读设置、书库 |
| 兼容性与导入修复 | Calibre 导入、封面、书库操作、GUI 启动时 Grok ACP 路径发现等调整 | 桌面书库与 AI 服务配置 |

中文与英文字体按字符范围分别生效，混排文本也可以使用不同字体；**不能替换 PDF 原页的正文字体**。离线查词和小注不需要 AI，语境解释需要配置并主动调用 AI。Anki 同步需要桌面 Anki 已打开并安装 AnkiConnect。

此前尝试的书籍标签 PR #10 已废弃，未合入 `main`，不属于当前功能。

## 哪些已经自测，哪些还待验证

这里区分三种证据：**自动测试**是代码、DOM 或模拟接口检查；**桌面自测**是个人 Obsidian 中的有限操作与界面调试；**待验证**表示没有完整的真实使用记录。它们都不代表长期稳定性保证。

截至 2026-10-03，在 macOS / Obsidian 1.13.7 的个人仓库中：

| 范围 | 已完成的验证 | 尚未覆盖的部分 |
| --- | --- | --- |
| 找书 | 个人 Obsidian 中搜索古腾堡、下载并导入《The Enchanted April》；有目录解析、导入失败、并发去重与关闭弹窗测试 | 外部站点实际可达性、移动端和慢网仍需验证 |
| 英文页内小注与单词卡片 | 个人书籍中调试释义间距、卡片关闭交互，确认设置开关可见；有词典、小注相关自动测试 | 大量不同 EPUB 排版、词汇分级准确性、长期阅读 |
| 虚拟合集与列表 | 个人书库中调试合集管理、搜索控件和列表入口；有合集与列表自动测试 | 大书库、跨设备同步及异常数据恢复 |
| 阅读热力图 | 使用模拟阅读数据查看布局，调整等宽、月份对齐与折叠；有日期、等级与 DOM 测试 | 模拟数据不证明真实阅读时长采集准确；长期统计仍需验证 |
| 生词本 | 有 Markdown 往返、去重、卡片字段及模拟 Anki 接口测试；确认设置中的同步入口 | 真实 AnkiConnect 连接、建卡及重复同步尚未实测 |
| 自定义颜色与中英文字体 | 已构建、部署并重启个人 Obsidian；确认两个字体控件可见；有色值校验、字体覆盖和字符范围测试 | 色盘完整交互、不同字体与阅读引擎的实际显示、笔记导出需进一步人工检查 |
| 书库与阅读面板 UI | 已部署个人 Obsidian，按实际使用反馈迭代 | 最新面板与 hover 状态尚未完成全部视觉回归，主题适配仍需反馈 |
| 连续滚动、快捷键及导入修复 | 有连续滚动、快捷键、Calibre 和引擎集成相关自动测试 | 不等同于全格式、全平台实机验收 |
| 移动端、Windows、其他 AI 服务 | 保留相关代码与自动检查 | 本轮未做完整实机与真实服务验证；桌面窄窗口不等于手机测试 |

当前 `main` 的 **325 项自动测试通过**，ESLint、生产构建与发布产物校验通过；本地安装文件也与构建产物核对一致。测试数量是当前快照，不代表 325 项真实用户场景均已人工验证。测试源码见 [tests/](tests/)。

旧截图与演示记录见 [docs/showcase.md](docs/showcase.md)，主要展示上游共享基线 4.2.4，**不代表本分叉当前界面**。阅读工作流的历史验证记录见 [docs/reading-workflow-plan.md](docs/reading-workflow-plan.md)。

## 安装与更新

> 本分叉仍沿用插件 ID `qiaomu-reader`，与官方版本使用同一个插件目录，不能作为两个独立插件并存。社区市场安装或更新 Qiaomu Reader 可能将本分叉替换为上游版本。请备份阅读数据，并确认更新来源。

### BRAT

1. 备份 Obsidian 仓库及 `.obsidian/plugins/qiaomu-reader/`，禁用已安装的官方版。
2. 安装并启用 BRAT，选择 **Add beta plugin**，输入 `Rosemary1812/qiaomu-reader`。
3. 启用增强版，重新打开图书检查阅读位置、笔记与设置。后续通过该分叉的 BRAT 订阅更新。

BRAT 安装依赖本仓库已发布的 Release；未发布的 `main` 改动需要本地构建。

### 手动安装

从[本分叉 Releases](https://github.com/Rosemary1812/qiaomu-reader/releases) 下载同一发行版的 `main.js`、`manifest.json` 和 `styles.css`，放入：

```text
<你的仓库>/.obsidian/plugins/qiaomu-reader/
```

重新加载 Obsidian 并启用插件。更新时保留已有数据文件，不要混用上游与本分叉的构建文件。使用旧插件 `qiaomu-book-reader` 的用户，应先备份并禁用旧版，避免两个阅读器同时注册书籍格式。

阅读、划线、离线词典和笔记可以离线使用。AI 是可选功能，主动发起请求时会将相应上下文发送给所选服务。CLI / ACP 和 Calibre 导入仅限桌面；扫描 PDF 没有可靠文字层时，不提供 OCR 或文字问答。

AI 可选择 DeepSeek 等 API 服务、自定义 OpenAI 兼容接口或本地模型；也保留 Codex CLI、Claude Code CLI、Grok CLI 等账户方式。CLI 模式仅支持桌面版 Obsidian，需要先完成对应工具的安装与登录。API 凭据使用 Obsidian 的密钥库；所选服务的费用与数据处理由该服务决定。这些入口的存在不代表本轮已逐一验证真实连接。

内置字体与导入字体的说明见 [fonts/README.md](fonts/README.md)；示例书来源与许可见 [assets/starter-books/README.md](assets/starter-books/README.md)。

## 开发与验证

```bash
npm ci
npm test
npm run check:i18n
npx eslint src/ --max-warnings=0
npm run build
npm run verify:release
```

构建生成的 `main.js` 和 `styles.css` 与 `manifest.json` 一起用于本地安装。版本号不等于上游同号发行版的内容，也不表示当前 `main` 已发布。

## 欢迎 Issue 与 PR

这个分叉目前主要服务个人使用习惯，功能和界面还在调整。**欢迎提 PR**：bug 修复、兼容性改进、界面优化、测试和文档补充都很有帮助。小修复可以直接提交；较大的功能建议先开 Issue 讨论。

反馈问题时，请尽量提供：

- Obsidian 与插件版本、系统，以及安装来源／对应 commit。
- 复现步骤、预期行为和实际行为。
- 相关截图或错误日志；涉及书籍排版时，说明文件格式，提供可分享的最小样例。

PR 请从 `main` 创建分支，说明修改与验证范围。界面改动附真实 Obsidian 截图；外部服务功能请注明测试使用真实服务还是模拟接口。不要把尚未测试的部分写成已通过。更多约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

本分叉问题请提交到[本仓库 Issues](https://github.com/Rosemary1812/qiaomu-reader/issues)，官方版问题请提交到[上游](https://github.com/joeseesun/qiaomu-reader/issues)。

## 致谢

感谢原作者 [向阳乔木 / @joeseesun](https://github.com/joeseesun) 及上游贡献者提供阅读器基础。本分叉由 [@Rosemary1812](https://github.com/Rosemary1812) 维护，保留原作者与第三方项目的版权及许可证声明。

项目包含改编自 [Elton Reader](https://github.com/swayinfo/elton-reader) 的代码。第三方来源与声明见 [NOTICE.md](NOTICE.md)，字体许可见 [fonts/OFL.txt](fonts/OFL.txt)。

<a id="english"></a>

## English

This is an **unofficial, personal-use fork** of [joeseesun/qiaomu-reader](https://github.com/joeseesun/qiaomu-reader), maintained by [@Rosemary1812](https://github.com/Rosemary1812). It has diverged from upstream and does not automatically include every upstream feature. Reading, notes and optional AI assistance are inherited from upstream.

Fork additions include offline English lookup and proficiency-based glosses, vocabulary notes and optional AnkiConnect sync, virtual collections and list view, a collapsible reading heatmap, continuous EPUB scrolling, Vim navigation, OpenDyslexic, separate Chinese/English fonts with per-book overrides, custom highlight colors, and reader/library UI adjustments. See the Chinese feature table above for entry points. PDF page fonts cannot be replaced. The abandoned tag PR #10 and upstream Qiaomu Agent support are not included. Upstream now also has lookup, vocabulary and Anki through a different implementation; Calibre import is shared. Book discovery was adapted separately: Gutenberg search/download plus optional external Anna’s Archive and Z-Library links.

**Expect bugs. This fork has not undergone sustained heavy use or broad device testing. Issues and PRs are welcome.** As of 2026-10-03, 325 automated tests, lint, production build and artifact verification pass. Personal macOS/Obsidian checks cover selected UI flows; heatmap layout was tested using fake data. Real Anki sync is untested. New color/font features have automated checks and were deployed, but full visual and interaction regression remains pending. These checks do not imply all features are production-ready.

Install through BRAT using `Rosemary1812/qiaomu-reader`, or copy `main.js`, `manifest.json` and `styles.css` from the same fork release into `<vault>/.obsidian/plugins/qiaomu-reader/`. Back up first: this fork shares the official plugin ID, and Community plugin updates may replace it. Releases may lag behind `main`; build locally to test unreleased changes.

For contributions, describe reproduction steps and validation scope, attach actual Obsidian screenshots for UI changes, and distinguish real-service tests from mocked tests. See [CONTRIBUTING.md](CONTRIBUTING.md). Attribution and licenses are preserved below.

## License

Copyright (c) 2026 向阳乔木.

Modifications in this unofficial fork, beginning in 2026, are copyright their respective contributors. The upstream copyright and attribution remain intact.

本项目整体采用 **GNU GPL v3.0 only**（`GPL-3.0-only`），完整条款见 [LICENSE](LICENSE)。除另有明确声明的第三方部分外，自有代码可按 GPL v3.0 使用、修改和分发，不提供任何担保。第三方代码、字体及素材保留各自许可证与版权声明。

GPL 允许免费商业使用；分发时须遵守相应源码、版权和许可证义务。需要 GPL 之外的授权时，[商业授权说明](COMMERCIAL-LICENSE.md)只覆盖上游作者有权再授权的部分；本 fork 的修改和第三方内容还需分别取得相应权利人的许可。本次变更不撤销此前已授予的许可证。

The project as a whole is licensed under GNU GPL version 3 only, with no warranty. Third-party components retain their own licenses. Commercial use is permitted under GPL. Any separate agreement from the upstream author covers only rights that author can grant; fork modifications and third-party content may require separate permission. Previously granted licenses remain valid.
