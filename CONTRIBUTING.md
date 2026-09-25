# 参与贡献

欢迎提交问题、中文文案改进和代码修复。

1. 先在 [本仓库 Issues](https://github.com/Rosemary1812/qiaomu-reader/issues) 中说明问题或需求，较小的修复可直接提交 PR。上游版本的问题请提交到[上游仓库](https://github.com/joeseesun/qiaomu-reader/issues)。
2. 从 `main` 创建功能分支，不要直接向 `main` 推送。
3. 保持改动聚焦，并运行：

```bash
npm run check:i18n
npm run build
npx eslint src/
```

4. 涉及界面的改动，请附上真实 Obsidian 截图和复现步骤。

提交代码即表示你同意按本项目的 **GNU GPL v3.0 only**（`GPL-3.0-only`）发布贡献。第三方代码、字体和素材继续保留各自的许可证与版权声明。
