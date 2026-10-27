/**
 * 樱雾 · Sakura Mist —— 宿主侧（Host half）
 *
 * 只做两件事：
 *  1. 记录插件被宿主加载的事实（`applied.json`），用于确认热加载链路打通；
 *  2. 提供 /sakura-mist/beacon 路由，接收页面侧（浏览器插件）发来的“样式已注入”回执，
 *     并把页面实测到的设计令牌写进同一个文件，用于无 DevTools 的验证。
 *
 * 主题的全部视觉效果都在 lib/client.js（浏览器侧）完成；宿主侧不参与渲染。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'sakura-mist-theme'
export const inject = ['webServer']

const STATE_FILE = join(homedir(), '.dsh', 'sakura-mist', 'applied.json')
const MAX_BEACON_BYTES = 16 * 1024

function writeState(patch) {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true })
    let previous = {}
    try {
      previous = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    } catch {}
    writeFileSync(STATE_FILE, JSON.stringify({ ...previous, ...patch }, null, 2), 'utf8')
  } catch {
    // 状态文件只是诊断用，写不进去不影响主题本身。
  }
}

function reply(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

export function apply(ctx) {
  writeState({
    hostLoadedAt: new Date().toISOString(),
    hostPid: process.pid,
    theme: 'sakura-mist',
    themeSource: fileURLToPath(new URL('.', import.meta.url)),
  })

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: '/sakura-mist/beacon',
      handler: (req, res) => {
        if (req.method !== 'POST') return reply(res, 405, { ok: false, error: 'POST only' })
        let size = 0
        const chunks = []
        req.on('data', (chunk) => {
          size += chunk.length
          if (size > MAX_BEACON_BYTES) {
            reply(res, 413, { ok: false, error: 'payload too large' })
            req.destroy()
            return
          }
          chunks.push(chunk)
        })
        req.on('end', () => {
          let body = null
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          } catch {}
          writeState({
            clientAppliedAt: new Date().toISOString(),
            client: body && typeof body === 'object' ? body : { raw: String(body).slice(0, 512) },
          })
          reply(res, 200, { ok: true, theme: 'sakura-mist' })
        })
        req.on('error', () => {
          try {
            reply(res, 400, { ok: false })
          } catch {}
        })
      },
    }),
    'sakura-mist: beacon route',
  )
}
