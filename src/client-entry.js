/**
 * 樱雾 · Sakura Mist —— 浏览器侧插件主体（由 build.mjs 包进 __ModuleLoader__）
 *
 * 这段代码不是独立模块：它运行在 client bundle 的 factory 里，可直接使用上方
 * 注入的 __SAKURA_CSS__ 常量；末尾由 build.mjs 补上 `exports.apply = apply`。
 *
 * 行为：
 *  1. 把主题样式表以 constructable stylesheet 挂到 document（回退到 <style>）；
 *  2. 给 <html> 加 dsh-sakura-mist 类，作为全部覆盖规则的作用域；
 *  3. 样式生效后向宿主 /sakura-mist/beacon 发一次回执，附带页面上实测到的令牌值，
 *     便于无 DevTools 时确认主题真的应用到了当前窗口；
 *  4. 卸载（插件禁用 / HMR 替换）时完整回滚，界面立刻恢复原样。
 */

const ROOT_CLASS = 'dsh-sakura-mist'
const THEME_ID = 'sakura-mist'
const STYLE_KEY = 'data-dsh-sakura-mist'

/** 回执里抽查的令牌：覆盖底色、卡片、正文、边框、强调、圆角、气泡。 */
const PROBE_TOKENS = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-label-primary',
  '--dsw-alias-border-l4',
  '--dsw-alias-state-business-primary',
  '--dsw-radius-lg',
  '--dsw-specific-bubble',
  '--dsw-alias-bg-document-selection',
]

function readProbe() {
  const probe = {}
  try {
    const styles = getComputedStyle(document.body)
    for (const token of PROBE_TOKENS) probe[token] = styles.getPropertyValue(token).trim()
  } catch {}
  return probe
}

function installStyleElement(css) {
  const element = document.createElement('style')
  element.setAttribute(STYLE_KEY, THEME_ID)
  element.textContent = css
  document.head.appendChild(element)
  return () => {
    element.remove()
  }
}

function installAdoptedSheet(css) {
  if (typeof CSSStyleSheet === 'undefined' || !('adoptedStyleSheets' in document)) return null
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    const before = document.adoptedStyleSheets
    document.adoptedStyleSheets = [...before, sheet]
    return () => {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((item) => item !== sheet)
    }
  } catch {
    return null
  }
}

function sendBeacon(payload) {
  try {
    fetch('/sakura-mist/beacon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // 回执失败不影响主题
  }
}

function apply(ctx) {
  ctx.effect(() => {
    const root = document.documentElement
    const removeAdopted = installAdoptedSheet(__SAKURA_CSS__)
    const removeElement = removeAdopted === null ? installStyleElement(__SAKURA_CSS__) : null
    root.classList.add(ROOT_CLASS)
    root.setAttribute('data-dsh-theme', THEME_ID)

    const startedAt = Date.now()
    const report = () => {
      const dark = document.body?.hasAttribute('data-ds-dark-theme') === true
      sendBeacon({
        theme: THEME_ID,
        version: __SAKURA_VERSION__,
        dark,
        url: location.href,
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        appliedMs: Date.now() - startedAt,
        tokens: readProbe(),
      })
    }
    // 等主题 presenter 写完 body 的深色标记与令牌，再回执一次实测值。
    const timer = setTimeout(report, 700)

    return () => {
      clearTimeout(timer)
      removeAdopted?.()
      removeElement?.()
      root.classList.remove(ROOT_CLASS)
      root.removeAttribute('data-dsh-theme')
    }
  }, 'sakura-mist: theme stylesheet')
}

function disposeStyles() {
  // 兜底：effect 未建立前的异常路径不留下半套样式。
  for (const element of document.querySelectorAll(`style[${STYLE_KEY}]`)) element.remove()
  document.documentElement.classList.remove(ROOT_CLASS)
}

// build.mjs 在此之后补上 `exports.apply = apply` / `exports.disposeStyles = ...`。
