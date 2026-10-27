# 樱雾 · Sakura Mist

> GitHub: <https://github.com/aLterofficial/dsh-theme-sakura-mist>

> 给 DeepSeek Harness Web 界面的一层「粉色护眼材质」：暖玫瑰纸色、低饱和、圆角石子感、纸纹与柔光。
> 朴素、不喧哗；深浅两套色随 DSH 的外观设置自动切换。

```jsonc
// ~/.dsh/profiles/desktop/package.json
"dependencies": {
  "dsh-theme-sakura-mist": "link:C:/Users/<you>/.dsh/themes/dsh-theme-sakura-mist"
},
"dsh": { "profile": { "bundles": [ ... , "dsh-theme-sakura-mist" ] } }
```

出现在 **设置 → 插件**（Settings → Plugins）的 bundle 列表里，可以像其他插件一样开关

维护命令（幂等；Windows PowerShell 5.1 / 7 均可）

```powershell
node "$env:USERPROFILE\.dsh\themes\dsh-theme-sakura-mist\qa\manage.mjs" status     # 查看登记状态
node "...\qa\manage.mjs" install                                                  # 安装 / 修复
node "...\qa\manage.mjs" uninstall                                                # 从 profile 移除（保留源码）
```

等价的 `.ps1` 包装：`qa/install.ps1`、`qa/uninstall.ps1`。
`install` 会依次：构建 bundle → 写 link 依赖 → 创建 node_modules 链接 → 选中 bundle → 触发一次 HMR 重算。

| 角色 | 浅色「暖樱纸」 | 深色「暮樱」 |
| --- | --- | --- |
| 画布 `bg-base` | `#fbf6f3` | `#241a1d` |
| 侧栏 `specific-sidebar-fill` | `#f4e9e3` | `#180f12` |
| 卡片 `bg-layer-1/2/3` | `#fffdfb` / `#fdf7f4` / `#f8f0eb` | `#2b1e23` / `#312227` / `#37272c` |
| 正文 `label-primary` | `#2c201b` | `#f3e8ea` |
| 次要文字 `label-secondary` | `#5f4a42` | `#d8c4c8` |
| 发丝线 `border-l3/l4` | `#7a4f473d` / `#7a4f4740` | `#f6e4e83d` / `#f6e4e83d` |
| 强调 `state-business-primary` | `#ad6277` | `#d48e9f` |
| 用户气泡 `specific-bubble` | `#fbe8eb` | `#3c262e` |
| 菜单 `specific-menu` | `#fcf6f2f0` | `#33242aea` |
| 选区 | `#c97e9673`（45%） | `#d896a666`（40%） |

完整令牌清单见 [`research/tokens.md`](research/tokens.md)。

## 使用与二次调整

### 改配色 / 改质感

```powershell
cd "$env:USERPROFILE\.dsh\themes\dsh-theme-sakura-mist"
node build.mjs      # 生成 lib/client.js
```

约 1 秒内打开着的 DSH 页面会**热替换**主题（无需刷新、无需重启）。`build.mjs` 无第三方依赖。

### 修复 / 重新安装 / 卸载

```powershell
node qa/manage.mjs status      # 登记状态 + 最近一次生效时间
node qa/manage.mjs install     # 安装或修复（幂等）
node qa/manage.mjs uninstall   # 从 profile 移除（保留源码）
pwsh -File qa/install.ps1      # 等价包装
pwsh -File qa/uninstall.ps1
```

### 静态检查 / 截图验证

```powershell
node --check lib/client.js
node --check lib/index.js
pwsh -File qa/capture-desktop.ps1 -Out preview/raw/desktop.png  # 截取 DSH 窗口（PrintWindow，不抢焦点）
node qa/check-katex.mjs                                    # 公式回退色校验（PASS/FAIL）
```

### 卸载

```powershell
node qa/manage.mjs uninstall
```

从 `dsh.profile.bundles` 取消选择、移除 link 依赖与 node_modules 链接；**不会删除**
`~/.dsh/themes` 下的源码。改动经 HMR 热应用，界面几秒内复原。

---

## 文件结构

```
dsh-theme-sakura-mist/
├─ package.json          # dsh.client 声明 + dsh.bundle.patch（正式 bundle 入口）
├─ cordis.patch.yml      # bundle 自带的 insert 补丁（由 DSH 加载，无需写入 profile patch）
├─ build.mjs             # 零依赖打包：theme.css + client-entry.js → lib/client.js
├─ src/
│  ├─ theme.css          # 材质本体（全部设计令牌、纸纹、区域分隔、选区、公式回退色）
│  └─ client-entry.js    # 浏览器侧插件逻辑（注入样式、回执、回滚）
├─ lib/
│  ├─ index.js           # 宿主侧：beacon 路由 + 状态文件
│  └─ client.js          # 构建产物（DSH 下发的自注册 bundle）
├─ qa/
│  ├─ manage.mjs         # bundle 安装/卸载/状态（依赖 link + bundles 列表 + HMR trigger）
│  ├─ install.ps1        # manage.mjs install 的包装
│  ├─ uninstall.ps1      # manage.mjs uninstall 的包装
│  ├─ capture-desktop.ps1# 截取 DSH 窗口
│  └─ check-katex.mjs    # 公式回退色校验（含 check-katex.html）
├─ preview/              # 实机局部截图（完整截图放在 preview/raw/ 且不提交）
└─ research/
   ├─ tokens.md          # --dsw 设计令牌要点（升级后重写版）
   └─ pipeline.md        # 客户端插件热加载管线要点（升级后重写版）
```

---

## 许可与声明

- 本仓库的**主题代码**（CSS 覆盖、插件胶水、构建与脚本）以 MIT 许可发布，见 [LICENSE](LICENSE)。
- 这是一个**非官方第三方主题**，与 DeepSeek 官方无隶属或背书关系；DeepSeek Harness 是独立的开源项目，本仓库不分发其代码或资源。
- `research/` 里的令牌名、色值与加载管线记录，是为插件互操作性整理的事实性笔记，不是 DSH 源码的副本。
- 界面截图中的 UI 组件版权归 DeepSeek；截图仅用于展示主题效果。
- “DeepSeek”“Harness”等商标归其各自所有者。若准备在官方社区发布，请先确认项目的品牌与分发规范。

## 发布到 GitHub

仓库已 `git init` 并暂存全部可公开文件（`preview/raw/` 中含会话内容的截图已被 `.gitignore` 排除）。发布步骤：

```powershell
cd "$env:USERPROFILE\.dsh\themes\dsh-theme-sakura-mist"
git config user.name  "你的名字"
git config user.email "you@example.com"
git commit -m "feat: Sakura Mist - pink eye-friendly theme for DeepSeek Harness"

# 在 GitHub 新建空仓库（不要勾选 README/.gitignore/LICENSE），然后：
git remote add origin git@github.com:<you>/dsh-theme-sakura-mist.git
git push -u origin main
```


