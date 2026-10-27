#!/usr/bin/env node
/**
 * 樱雾 · Sakura Mist —— profile bundle 安装 / 卸载 / 状态
 *
 * 正式 bundle 模式登记三件事：
 *   1. profile package.json 依赖： "dsh-theme-sakura-mist": "link:<主题目录>"
 *   2. profile package.json 的 dsh.profile.bundles 列表包含 "dsh-theme-sakura-mist"
 *   3. node_modules 里存在指向主题目录的链接（pnpm link 或 junction）
 *
 * 登记后主题会出现在 设置 → 插件（Settings → Plugins）里，可开关；开关走 HMR 热重算。
 *
 * 用法：
 *   node qa/manage.mjs install     # 安装/修复（幂等）
 *   node qa/manage.mjs uninstall   # 从 profile 移除（保留源码目录）
 *   node qa/manage.mjs status      # 查看当前登记状态
 */
import { existsSync, lstatSync, readFileSync, rmSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const THEME_DIR = resolve(HERE, '..')
const PKG = JSON.parse(readFileSync(join(THEME_DIR, 'package.json'), 'utf8'))
const NAME = PKG.name
const PROFILE_DIR = process.env.DSH_PROFILE_DIR || join(homedir(), '.dsh', 'profiles', 'desktop')
const MANIFEST = join(PROFILE_DIR, 'package.json')
const LINK_PATH = join(PROFILE_DIR, 'node_modules', NAME)
const STATE_FILE = join(homedir(), '.dsh', 'sakura-mist', 'applied.json')

function log(msg) { console.log('[sakura] ' + msg) }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')) }
function writeJson(file, value) { writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8') }
function linkTarget() {
  try { return lstatSync(LINK_PATH).isSymbolicLink() || lstatSync(LINK_PATH).isDirectory() ? LINK_PATH : null } catch { return null }
}
function linkResolves() {
  try {
    const target = readFileSync(join(LINK_PATH, 'package.json'), 'utf8')
    return JSON.parse(target).name === NAME
  } catch { return false }
}

function build() {
  log('building lib/client.js ...')
  const run = spawnSync(process.execPath, [join(THEME_DIR, 'build.mjs')], { stdio: 'inherit', cwd: THEME_DIR })
  if (run.status !== 0) throw new Error('build failed')
}

function ensureDependency(enabled) {
  const pkg = readJson(MANIFEST)
  pkg.dependencies ??= {}
  if (enabled) {
    const spec = 'link:' + THEME_DIR.replace(/\\/g, '/')
    if (pkg.dependencies[NAME] !== spec) {
      pkg.dependencies[NAME] = spec
      writeJson(MANIFEST, pkg)
      log('dependency added: ' + spec)
    } else {
      log('dependency already present')
    }
  } else if (pkg.dependencies[NAME] !== undefined) {
    delete pkg.dependencies[NAME]
    writeJson(MANIFEST, pkg)
    log('dependency removed')
  }
}

function ensureBundle(enabled) {
  const pkg = readJson(MANIFEST)
  pkg.dsh ??= {}
  pkg.dsh.profile ??= {}
  const list = Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : []
  const has = list.includes(NAME)
  if (enabled && !has) {
    list.push(NAME)
    pkg.dsh.profile.bundles = list
    writeJson(MANIFEST, pkg)
    log('bundle selection added')
  } else if (!enabled && has) {
    pkg.dsh.profile.bundles = list.filter((item) => item !== NAME)
    writeJson(MANIFEST, pkg)
    log('bundle selection removed')
  } else {
    log(enabled ? 'bundle selection already present' : 'bundle selection already absent')
  }
}

function ensureLink() {
  if (linkResolves()) { log('node_modules link ok'); return }
  // 优先交给 DSH 自带 CLI / pnpm 创建 link（与插件管理器一致）
  const cli = join(dirname(process.execPath), '..', '..', 'cli', 'bin', 'dsh.cmd')
  const dshCandidates = [
    process.env.DSH_CLI,
    'C:/Program Files/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd',
    'D:/Deepseek Harness/resources/runtime/cli/bin/dsh.cmd',
    cli,
  ].filter(Boolean)
  const found = dshCandidates.find((p) => existsSync(p))
  if (found) {
    log('creating link through DSH CLI ...')
    const run = spawnSync(found, ['plugin', '--profile', 'desktop', 'add', 'link:' + THEME_DIR], { stdio: 'inherit', cwd: PROFILE_DIR })
    if (run.status === 0 && linkResolves()) { log('link created by pnpm'); return }
    log('CLI link failed; falling back to a directory junction')
  }
  try {
    if (linkTarget()) rmSync(LINK_PATH, { recursive: false, force: true })
    spawnSync(process.execPath, ['-e', `
      const fs = require('node:fs');
      fs.symlinkSync(${JSON.stringify(THEME_DIR)}, ${JSON.stringify(LINK_PATH)}, 'junction');
    `], { stdio: 'inherit' })
  } catch (error) {
    log('junction failed: ' + error.message)
  }
  if (!linkResolves()) throw new Error('node_modules link is not resolvable: ' + LINK_PATH)
  log('junction created')
}

function removeLink() {
  if (!linkTarget()) { log('node_modules link absent'); return }
  rmSync(LINK_PATH, { recursive: false, force: true })
  log('node_modules link removed')
}

/** 触发一次 HMR 重算：对 profile patch 追加/更新一行注释，等价于手工改配置。 */
function triggerRecompose() {
  const patch = join(PROFILE_DIR, 'cordis.patch.yml')
  if (!existsSync(patch)) { log('profile patch missing; skip HMR trigger'); return }
  const marker = '# sakura-mist: hmr trigger'
  let text = readFileSync(patch, 'utf8')
  text = text.split(/\r?\n/).filter((line) => line !== marker).join('\n')
  writeFileSync(patch, text.replace(/\n*$/, '\n') + marker + '\n', 'utf8')
  log('HMR trigger written; waiting for recomposition ...')
  spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 3500)'])
}

function state() {
  if (!existsSync(STATE_FILE)) { log('no applied.json yet'); return }
  try {
    const json = readJson(STATE_FILE)
    log('hostLoadedAt   = ' + json.hostLoadedAt)
    log('clientAppliedAt= ' + json.clientAppliedAt)
    log('bg-base token  = ' + json.client?.tokens?.['--dsw-alias-bg-base'])
  } catch (error) {
    log('cannot read applied.json: ' + error.message)
  }
}

const command = process.argv[2] || 'install'
if (command === 'status') {
  const pkg = readJson(MANIFEST)
  log('theme dir      : ' + THEME_DIR)
  log('dependency     : ' + (pkg.dependencies?.[NAME] ?? 'absent'))
  log('bundle selected: ' + ((pkg.dsh?.profile?.bundles ?? []).includes(NAME) ? 'yes' : 'no'))
  log('node_modules   : ' + (linkResolves() ? 'ok' : 'missing/dangling'))
  state()
} else if (command === 'install') {
  build()
  ensureDependency(true)
  ensureLink()
  ensureBundle(true)
  triggerRecompose()
  state()
  log('installed as a profile bundle (Settings -> Plugins).')
} else if (command === 'uninstall') {
  ensureBundle(false)
  log('bundle deselected; waiting for host to unload the theme ...')
  spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 2500)'])
  ensureDependency(false)
  removeLink()
  log('uninstalled from the profile; sources kept at ' + THEME_DIR)
} else {
  console.error('unknown command: ' + command)
  process.exitCode = 1
}
