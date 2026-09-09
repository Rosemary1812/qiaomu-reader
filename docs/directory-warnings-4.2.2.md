# 4.2.2 目录检查修复

2026-09-09，基于已发布的 4.2.1。

## 代码变化

- 插件样式表不再使用 `!important`：通过组件、宿主容器及模式选择器处理层叠；低动效规则放在组件规则之后。
- 设置卡片由自身渲染/隐藏生命周期增删 `qiaomu-reader-settings-card` 类，替代父级 `:has()`，不改变其他插件设置。
- 选文菜单的划线颜色标记用内阴影绘制，保持 3px 色条，移除兼容性检查标记的复合 text-decoration。
- 清理旧阅读容器的通用 break-inside/break-after 限制；EPUB/MOBI 使用已有 Foliate 布局，PDF 保留其原始页面结构和分页逻辑，没有关闭单/双页功能。
- 复用 PDF 阅读容器时清理上个布局的位移、列宽、列间距和最小高度；滚动模式不再依赖样式优先级盖住旧布局。
- 发布检查拒绝重新引入样式优先级或 `:has()`；版本同步为 4.2.2，不复用 4.2.1 tag。

## 验证

- 202 项测试通过；新增分页→滚动→分页时的容器几何状态回归。
- 国际化 1277 keys、ESLint、standard/community 构建和产物检查通过。
- 独立 Obsidian 1.13.7：MOBI 单/双列各 20 次翻页、滚动正文、三个搜索命中通过；检查窗口中的双列正文截图。
- PDF 滚动时实际 computed style 为 transform:none、column-width:auto、will-change:auto；阅读区 padding 为 0。低动效模式按钮为 0s transition、黑色边框、无阴影。
- 选文浮层宽度 304px，小于 980px 阅读区；三种颜色选项可见；色条为粉色，辅助技术标签保持视觉隐藏。
- 六个设置页面在 680px 窗口模拟下均为 clientWidth=scrollWidth=416，设置卡片透明继承宿主背景。该检查不等于移动端真机验收。

## 目录同步故障

4.2.1 已发布到 GitHub，tag 无 v 前缀，目标为合并提交 9fe8936。三个正式下载资产与已测试的 community 构建哈希一致。GitHub API 可读取 main/manifest.json，版本为 4.2.1。

但目录后台仍显示 v4.0.0、13 个 Release、236 stars；当前 GitHub 仓库创建于 2026-09-08、2 stars。点击 Check for new releases 后，目录报无法读取默认分支 manifest。这提示目录端可能仍持有旧仓库信息，但仅凭页面不能确定内部原因。不能通过捏造 tag 或降低 manifest 版本掩盖此错误；需以目录最终同步及扫描结果判定是否解决。
