# DSH `--dsw-*` 设计令牌要点（升级后重写版）

本文件在 0.2.1-rc.3 上重建，记录主题实际覆盖的令牌与取值。DSH 的设计系统分两层：

- **static 基色阶**：`--dsw-static-neutral-bluish-00 … 1000`、`--dsw-static-neutral-*`、`--dsw-static-deepseek-*`、
  红/绿/琥珀语义色。声明在 `body` 与 `body[data-ds-dark-theme]` 上（两套值相同）。
- **alias 语义别名**：`--dsw-alias-bg-base`、`-bg-layer-1/2/3`、`-label-primary/secondary/tertiary/caption`、
  `-border-l1..l4`、`-interactive-bg-hover/active`、`-state-business-primary`、`-markdown-code-block`、
  `-bg-document-selection` 等，深浅两套别名引用同一 static 色阶的不同端点。

主题策略：**一次性替换 static 色阶为暖玫瑰中性阶**，浅色别名自然取亮端、深色别名取暗端，
再按模式覆盖少量写死 rgba 的别名（边框、交互层、菜单）以及圆角/阴影。

## 选择器（rc.3 实测）

| 用途 | 选择器 |
| --- | --- |
| 浅色令牌 | `body` |
| 深色令牌 | `body[data-ds-dark-theme]` |
| 圆角 / 阴影 / 焦点环 | `:root`，主题用 `html.dsh-sakura-mist` 覆盖 |
| 侧栏列 / 对话列 | `.<hash>_sidebarCol` / `.<hash>_centerCol`，用 `[class*="_sidebarCol"]` 命中 |

## 主色阶（主题替换值）

| 令牌 | 浅色端 | 暗端 |
| --- | --- | --- |
| `neutral-bluish-00` | `#fffcfb` | — |
| `neutral-bluish-50` | `#faf2f0` | — |
| `neutral-bluish-100` | `#ecddd8` | — |
| `neutral-bluish-300` | `#cbb2ac` | — |
| `neutral-bluish-600` | `#7e645f` | — |
| `neutral-bluish-800` | — | `#4a3733` |
| `neutral-bluish-950` | — | `#22161a` |
| `neutral-bluish-1000` | `#191011` | — |

## 关键语义令牌

| 令牌 | 浅色 | 深色 |
| --- | --- | --- |
| `alias-bg-base` | `#fbf6f3` | `#241a1d` |
| `alias-bg-layer-1` | `#fffdfb` | `#2b1e23` |
| `alias-bg-layer-2` | `#fdf7f4` | `#312227` |
| `alias-label-primary` | `#2c201b` | `#f3e8ea` |
| `alias-label-secondary` | `#5f4a42` | `#d8c4c8` |
| `alias-border-l3` | `#7a4f473d` | `#f6e4e83d` |
| `alias-state-business-primary` | `#ad6277` | `#d48e9f` |
| `alias-link` | `#a35a6f` | `#d48e9f` |
| `alias-markdown-code-block` | `#f7eee8` | `#2a1c21` |
| `specific-sidebar-fill` | `#f4e9e3` | `#180f12` |
| `specific-bubble` | `#fbe8eb` | `#3c262e` |
| `specific-menu` | `#fcf6f2f0` | `#33242aea` |
| `alias-bg-document-selection` | `#c97e9673` | `#d896a666` |
| `--dsw-focus-ring-color` | `#b06074` | `#d79cac` |
| `--dsw-radius-lg/xl/panel` | `20 / 26 / 32 px` | 同左 |
| `--dsw-corner-shape` | `superellipse(1.62)` | 同左 |

## 高价值参考

- 组件引用最多：`label-primary`（350 次）、`label-tertiary`（343）、`label-secondary`（261）、
  `state-business-primary`（183）、`interactive-bg-hover`（156）、`focus-ring-color`（105）、`radius-sm`（105）。
- 写死、不在令牌体系内的：hovercard `--dsw-hovercard-bg:#2C2C2E`、CodeMirror 选中态、xterm、
  macOS 侧栏渐变、**KaTeX 回退内联 `color:#cc0000`**（主题用 `.katex-error{!important}` 覆盖）。
- 语义色（红/绿/琥珀）保留含义，仅降饱和，不参与粉色化。
