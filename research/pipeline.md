# 第三方客户端插件热加载管线（升级后重写版，0.2.1-rc.3 复核）

樱雾主题以一个**第三方浏览器插件**接入运行中的 Desktop GUI，无需修改 `app.asar`，也无需重启应用。

## 声明

`package.json`：

```json
{
  "name": "dsh-theme-sakura-mist",
  "type": "module",
  "main": "lib/index.js",
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js" },
  "dsh": { "client": { "platform": "web", "immediately": true } }
}
```

- 宿主侧 `lib/index.js` 必须有导出（`apply`），否则没有 Loader fiber，浏览器侧不会被下发；
- 浏览器侧 `./client` 指向自注册脚本：`window.__ModuleLoader__.load({ id: "<包名>", factory })`，
  factory 返回 `{ apply, name }`（Cordis 插件面）。

## 安装（正式 bundle，与升级解耦）

1. 包放在用户数据目录：`%USERPROFILE%\.dsh\themes\dsh-theme-sakura-mist`；
2. profile `package.json` 增加 link 依赖并选中 bundle：

```jsonc
"dependencies": { "dsh-theme-sakura-mist": "link:C:/Users/<you>/.dsh/themes/dsh-theme-sakura-mist" },
"dsh": { "profile": { "bundles": [ ..., "dsh-theme-sakura-mist" ] } }
```

3. `node_modules` 里存在指向该目录的链接（`pnpm add link:` 或 junction）；
4. 包自己的 `cordis.patch.yml`（`dsh.bundle.patch`）负责插入 `sakura-mist-theme` 行，
   profile 的 `cordis.patch.yml` **不再需要**手工 insert。

这些由 `qa/manage.mjs install` 幂等完成；`qa/manage.mjs uninstall` 反向移除选中、依赖与链接（保留源码）。

### 开关语义

`dsh.profile.bundles` 变化会触发 HMR 重算：取消选中 → 插件行移除、页面卸载样式（beacon 404）；
重新选中 → 宿主重新 import、SSE 推送新 graph、页面重新注入（`clientAppliedAt` 更新）。
实测（0.2.1-rc.3）：取消后约 7 秒卸载，重新选中后约 1 秒恢复；无需重启应用。
设置 → 插件 页面的开关等价于改这个列表。

## 运行期链路

```
patch 变更 → dsh-hmr 监听 profile patch → 重算 Loader
          → 新 row 被 import（宿主侧 lib/index.js）
          → internal/plugin 事件 → dsh-client-modules 增量扫描 dsh.client
          → SSE /plugins/events 推送新 graph
          → 打开着的页面 entries.sync 加载 /plugins/??<pkg>/client.js&rev=…
          → 执行 factory → apply(ctx) → 注入样式（无刷新）
```

- `lib/client.js` 单独改动不需要重算配置：client-hmr 以约 500 ms 轮询 bundle 元信息，检测到 rev 变化即热替换；
- 桌面外壳的 boot injections 是启动时缓存的一份，**首次**启用插件时不必刷新页面，SSE 首帧即可补上；
- 应用升级后若 junction 悬空，row 会在启动时解析失败。运行 `qa/install.ps1` 重建 junction 并触发一次
  HMR 重算即可恢复，无需重启。

## 验证

- 宿主侧在 `apply()` 写 `~/.dsh/sakura-mist/applied.json` 的 `hostLoadedAt`；
- 浏览器侧样式注入后 POST `/sakura-mist/beacon`，写 `clientAppliedAt` 与实测令牌；
- 两者时间戳更新即说明链路打通；界面截图用 `qa/capture-desktop.ps1`（Win32 PrintWindow，不抢焦点）。

## 风险与边界

- patch YAML 写错会静默不应用（保留旧树）；安装脚本使用固定块，避免手写错误；
- 包必须先存在再启用：负缓存可能要到下一次重算/重启才消失；
- 不要直接改安装目录里的文件（升级会覆盖）；源码与构建产物都放 `~/.dsh/themes`；
- pnpm 管理 profile `node_modules`，若被 prune，重跑 `qa/install.ps1`。
