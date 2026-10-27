// 樱雾 · Sakura Mist —— 公式回退色校验（无第三方依赖）
// 原理：用本机 Chrome/Edge 的 headless --dump-dom 打开 qa/check-katex.html，
//       页面内把 KaTeX 回退（内联 color:#cc0000）在深浅两套下的计算色写进 DOM，
//       这里解析结果并断言等于主题设定的柔和色。
//
// 用法：node qa/check-katex.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const page = pathToFileURL(join(here, 'check-katex.html')).href

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean)
const chrome = candidates.find((p) => existsSync(p))
if (!chrome) {
  console.error('未找到 Chrome/Edge，可设置 CHROME_PATH 后重试')
  process.exit(2)
}

const userDataDir = mkdtempSync(join(tmpdir(), 'sakura-katex-'))
let stdout = ''
try {
  const run = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--user-data-dir=${userDataDir}`,
    '--virtual-time-budget=2500',
    '--dump-dom',
    page,
  ], { encoding: 'utf8', timeout: 30000 })
  stdout = run.stdout || ''
  if (!stdout) {
    console.error(run.stderr?.slice(0, 800) || 'Chrome 无输出')
    process.exit(2)
  }
} finally {
  try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
}

const match = stdout.match(/RESULT dark=(rgb\([^)]*\)) light=(rgb\([^)]*\))/)
if (!match) {
  console.error('未在页面里找到 RESULT，可能样式表未加载')
  process.exit(2)
}
const [, dark, light] = match
const expectDark = 'rgb(201,145,140)'
const expectLight = 'rgb(177,116,110)'
const ok = dark === expectDark && light === expectLight
console.log(JSON.stringify({ dark, light, expectDark, expectLight }, null, 2))
console.log(ok ? 'PASS' : 'FAIL')
process.exitCode = ok ? 0 : 1
