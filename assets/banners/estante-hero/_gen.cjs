const fs = require('fs')
const path = require('path')

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const range = (rng, min, max) => min + rng() * (max - min)
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
const f = (n) => +n.toFixed(2)

const SPINES = [
  '#3f3f46', '#52525b', '#6b7280', '#78716c', '#a8a29e', '#8b8580',
  '#57534e', '#44403c', '#292524', '#713f12', '#92400e', '#b45309',
  '#d97706', '#f59e0b', '#7c2d12', '#451a03', '#78350f', '#854d0e',
  '#1c1917', '#373a41', '#1e3a5f', '#37423b',
]

const STONE_950 = '#0c0a09'

// ---- Scene A: Editorial bookshelf with warm side lamp ----
function sceneA(seed) {
  const rng = mulberry32(seed)
  let out = ''
  out += `
  <defs>
    <radialGradient id="glowA" cx="0.72" cy="0.12" r="0.75">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.5"/>
      <stop offset="35%" stop-color="#92400e" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#92400e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wallA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#211c18"/>
      <stop offset="100%" stop-color="${STONE_950}"/>
    </linearGradient>
    <linearGradient id="plankA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3d352c"/>
      <stop offset="12%" stop-color="#332b23"/>
      <stop offset="100%" stop-color="#241f19"/>
    </linearGradient>
    <linearGradient id="rowShadeA" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="45%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.28"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="800" fill="url(#wallA)"/>
  <rect width="1600" height="800" fill="url(#glowA)"/>`

  const shelves = [
    { top: 520, maxH: 195, x0: 0 },
    { top: 760, maxH: 268, x0: 0 },
  ]
  for (const s of shelves) {
    let x = s.x0 + 10
    while (x < 1590) {
      const w = range(rng, 16, 34)
      const h = range(rng, s.maxH * 0.45, s.maxH)
      const y = s.top - h
      const c = pick(rng, SPINES)
      const lean = rng() < 0.1 ? range(rng, -3, 3) : 0
      if (lean !== 0) {
        const lw = range(rng, 14, 20)
        out += `<g transform="translate(${f(x + lw / 2)},${f(s.top - 2)}) rotate(${f(lean)})">`
        out += `<rect x="${f(-lw / 2)}" y="${f(-h)}" width="${f(lw)}" height="${f(h)}" rx="1" fill="${c}"/>`
        if (rng() < 0.55) out += `<rect x="${f(-lw / 2 + 3)}" y="${f(-h + 6)}" width="${f(1.5)}" height="${f(h - 12)}" fill="#e8c66a" opacity="0.4"/>`
        out += `</g>`
      } else {
        out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="1" fill="${c}"/>`
        if (rng() < 0.5) out += `<rect x="${f(x + 3)}" y="${f(y + 5)}" width="1.5" height="${f(h - 10)}" fill="#e8c66a" opacity="0.38"/>`
        if (rng() < 0.3) out += `<rect x="${f(x + w - 4)}" y="${f(y + h - 30)}" width="2.5" height="22" rx="1.2" fill="#000" opacity="0.5"/>`
      }
      x += w + range(rng, 1, 6)
    }
    out += `<rect x="0" y="${f(s.top)}" width="1600" height="24" fill="url(#plankA)"/>`
    out += `<rect x="0" y="${f(s.top)}" width="1600" height="2" fill="#4b4134" opacity="0.9"/>`
    out += `<rect x="0" y="${f(s.top - s.maxH * 0.9)}" width="1600" height="${f(s.maxH * 0.9)}" fill="url(#rowShadeA)" opacity="0.55"/>`
  }

  for (let i = 0; i < 16; i++) {
    const cx = range(rng, 850, 1500)
    const cy = range(rng, 20, 300)
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${range(rng, 0.6, 2)}" fill="#f5d79a" opacity="${range(rng, 0.04, 0.14)}"/>`
  }
  out += `<rect width="1600" height="800" fill="url(#vignette)" opacity="0"/>`
  return out
}

// ---- Scene B: stack of books on a desk under warm lamp ----
function sceneB(seed) {
  const rng = mulberry32(seed)
  let out = ''
  out += `
  <defs>
    <radialGradient id="glowB" cx="0.30" cy="0.10" r="0.9">
      <stop offset="0%" stop-color="#d97706" stop-opacity="0.55"/>
      <stop offset="40%" stop-color="#92400e" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#92400e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wallB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#221c17"/>
      <stop offset="100%" stop-color="${STONE_950}"/>
    </linearGradient>
    <linearGradient id="deskB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b3127"/>
      <stop offset="18%" stop-color="#2b241d"/>
      <stop offset="100%" stop-color="#171310"/>
    </linearGradient>
    <polygon id="coneB" points="220,0 720,0 420,620 0,620" fill="#d97706" opacity="0.05"/>
  </defs>
  <rect width="1600" height="800" fill="url(#wallB)"/>
  <rect width="1600" height="800" fill="url(#glowB)"/>
  <polygon points="160,0 620,0 360,620 40,620" fill="#d97706" opacity="0.05"/>
  <polygon points="240,0 520,0 300,620 140,620" fill="#f59e0b" opacity="0.05"/>`

  function stack(cx, n, seed2) {
    const rng2 = mulberry32(seed2)
    let y = 622
    const rot = range(rng2, -2.2, 2.2)
    for (let i = 0; i < n; i++) {
      const w = range(rng2, 190, 260)
      const h = range(rng2, 30, 44)
      const c = pick(rng2, SPINES)
      const off = range(rng2, -14, 14)
      const ry = y - h
      out += `<g transform="translate(${f(cx + off)},${f(ry + h / 2)}) rotate(${f(rot + range(rng2, -0.8, 0.8))})">`
      out += `<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="2" fill="${c}"/>`
      out += `<rect x="${f(w / 2 - 16)}" y="${f(-h / 2 + 2)}" width="13" height="${f(h - 4)}" fill="#d8cfc0" opacity="0.55"/>`
      out += `<rect x="${f(-w / 2 + 4)}" y="${f(-h / 2 + 2)}" width="3" height="${f(h - 4)}" fill="#e8c66a" opacity="0.35"/>`
      out += `</g>`
      y -= h + 2
    }
  }

  stack(470, 5, seed ^ 0xa1)
  stack(1010, 4, seed ^ 0xb2)
  out += `<g transform="translate(1290,600) rotate(14)">`
  out += `<rect x="-60" y="-150" width="34" height="150" rx="2" fill="#713f12"/>`
  out += `<rect x="-57" y="-146" width="2" height="140" fill="#e8c66a" opacity="0.4"/>`
  out += `</g>`
  out += `<g transform="translate(250,560) rotate(-8)">`
  out += `<rect x="-70" y="-120" width="30" height="120" rx="2" fill="#52525b"/>`
  out += `<rect x="-67" y="-116" width="2" height="112" fill="#e8c66a" opacity="0.35"/>`
  out += `</g>`

  out += `<rect x="0" y="620" width="1600" height="40" fill="url(#deskB)"/>`
  out += `<rect x="0" y="620" width="1600" height="2" fill="#4f4434" opacity="0.9"/>`

  for (let i = 0; i < 22; i++) {
    const cx = range(rng, 150, 1500)
    const cy = range(rng, 30, 560)
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${range(rng, 0.6, 2.2)}" fill="#f5d79a" opacity="${range(rng, 0.04, 0.15)}"/>`
  }
  return out
}

// ---- Scene C: close-up of tall spines, amber spotlight in center ----
function sceneC(seed) {
  const rng = mulberry32(seed)
  let out = ''
  out += `
  <defs>
    <linearGradient id="wallC" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#15120f"/>
      <stop offset="100%" stop-color="${STONE_950}"/>
    </linearGradient>
    <radialGradient id="spotC" cx="0.5" cy="0.45" r="0.45">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="#92400e" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#92400e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rowShadeC" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="50%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.3"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="800" fill="url(#wallC)"/>
  <rect width="1600" height="800" fill="url(#spotC)"/>`

  let x = 0
  let i = 0
  while (x < 1600) {
    const w = range(rng, 36, 66)
    const h = range(rng, 430, 600)
    const isCenter = x < 850 && x + w > 790
    const c = isCenter ? pick(rng, ['#b45309', '#92400e', '#d97706']) : pick(rng, SPINES)
    const y = 800 - h
    out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${c}"/>`
    if (isCenter) out += `<rect x="${f(x + w / 2 - 1)}" y="${f(y)}" width="2" height="${f(h)}" fill="#f5d79a" opacity="0.5"/>`
    if (rng() < 0.4) out += `<rect x="${f(x + 4)}" y="${f(y + 8)}" width="2" height="${f(h - 16)}" fill="#e8c66a" opacity="0.3"/>`
    if (rng() < 0.35) out += `<rect x="${f(x + w - 5)}" y="${f(y + h - 44)}" width="3" height="28" rx="1.4" fill="#000" opacity="0.55"/>`
    x += w
    i++
  }
  out += `<rect x="0" y="0" width="1600" height="800" fill="url(#rowShadeC)" opacity="0.5"/>`
  return out
}

const VIGNETTE = `
<defs>
  <linearGradient id="vignette" x1="0" y1="0.35" x2="0" y2="1">
    <stop offset="0%" stop-color="#0c0a09" stop-opacity="0"/>
    <stop offset="78%" stop-color="#0c0a09" stop-opacity="0"/>
    <stop offset="100%" stop-color="#0c0a09" stop-opacity="0.85"/>
  </linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0c0a09" stop-opacity="0.6"/>
    <stop offset="12%" stop-color="#0c0a09" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect width="1600" height="800" fill="url(#vignette)"/>
<rect width="1600" height="800" fill="url(#edge)"/>`

function page(svg, align, label) {
  const textClass = align === 'center' ? 'text-center' : 'text-left'
  const posClass = align === 'center' ? 'inset-x-0 bottom-0' : 'left-0 bottom-0'
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:100%; height:100%; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background:#0c0a09; overflow:hidden; }
  .hero { position:relative; width:100%; height:100vh; overflow:hidden; border-radius:24px; }
  .hero svg.scene { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .content { position:absolute; ${posClass}; width:100%; padding:56px 64px; }
  .inner { display:inline-block; ${textClass}; }
  .label { font-size:13px; letter-spacing:.28em; text-transform:uppercase; color:#f59e0b; font-weight:600; margin-bottom:12px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-weight:700; font-size:96px; line-height:.98; letter-spacing:-.02em; color:#f5f5f4; }
  h1 .dot { color:#f59e0b; }
  .tagline { margin-top:14px; font-size:22px; color:#d6d3d1; letter-spacing:.02em; }
  .tagline b { color:#f5f5f4; font-weight:600; }
</style>
</head>
<body>
  <div class="hero">
    <svg class="scene" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      ${svg}
      ${VIGNETTE}
    </svg>
    <div class="content">
      <div class="inner">
        <div class="label">${label}</div>
        <h1>Estante<span class="dot">.</span></h1>
        <p class="tagline">A biblioteca pessoal de <b>Willy Garabini Cornelissen</b></p>
      </div>
    </div>
  </div>
</body>
</html>`
}

if (require.main === module) {
  fs.writeFileSync(
    path.join(__dirname, 'hero-a-editorial-shelf.html'),
    page(sceneA(2026), 'left', 'Biblioteca pessoal')
  )
  fs.writeFileSync(
    path.join(__dirname, 'hero-b-stack.html'),
    page(sceneB(2026), 'left', 'Biblioteca pessoal')
  )
  fs.writeFileSync(
    path.join(__dirname, 'hero-c-spines.html'),
    page(sceneC(2026), 'center', 'Biblioteca pessoal')
  )
  console.log('generated 3 heroes')
}

module.exports = { sceneA, sceneB, sceneC, VIGNETTE, page, mulberry32 }
