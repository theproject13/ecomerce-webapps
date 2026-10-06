/**
 * Uji alur keranjang di browser sungguhan: klik CTA di detail, lalu pastikan
 * shopper mendarat di halaman cart React dan bisa mengubah serta menghapus
 * item tanpa reload.
 *
 * Smoke HTTP (smoke-storefront.ps1) sudah membuktikan endpoint-nya benar, tapi
 * itu belum membuktikan hal-hal yang hanya terlihat di browser: CTA-nya benar
 *-benar diklik, navigasi menuju /shopping-cart, badge ikut berubah, dan checkout
 * masih menunjuk ke PHP. Script ini menutup gap itu lewat Chrome DevTools
 * Protocol, tanpa dependency tambahan (pakai WebSocket bawaan Node 18+).
 *
 * Jalankan: node tests/regression/cart-flow.browser.mjs [baseUrl]
 * Exit code 0 kalau semua pemeriksaan lolos.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = (process.argv[2] ?? 'http://localhost/osc414').replace(/\/$/, '')
const PRODUCTS_ID = 75
const PRODUCT_NAME_PATTERN = 'ZEDS QUASAR QUEEN MATTRESS IN A BOX'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))

const checks = []
const check = (name, pass, detail = '') => {
  checks.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`)
}

function finish() {
  const failed = checks.filter((c) => !c.pass)
  console.log(`\n${checks.length - failed.length}/${checks.length} lolos`)
  process.exit(failed.length === 0 ? 0 : 1)
}

if (!chromePath) {
  console.log('SKIP  Chrome tidak ditemukan, uji alur keranjang dilewati')
  process.exit(0)
}

const profile = mkdtempSync(join(tmpdir(), 'osc414-cart-flow-'))
const port = 9200 + Math.floor(Math.random() * 600)
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore' }
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function devToolsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* Chrome belum siap menerima koneksi */
    }
    await sleep(250)
  }
  throw new Error('Chrome tidak membuka debugging port')
}

const ws = new WebSocket(await devToolsUrl())
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

let seq = 0
const pending = new Map()

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.id || !pending.has(msg.id)) return
  const { resolve, reject } = pending.get(msg.id)
  pending.delete(msg.id)
  msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
})

function send(method, params = {}) {
  const id = ++seq
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (res.exceptionDetails) {
    throw new Error(
      `${res.exceptionDetails.text}: ${res.exceptionDetails.exception?.description ?? ''}`
    )
  }
  return res.result.value
}

/** Tunggu predicate di browser terpenuhi, atau gagal setelah ~40 detik. */
async function waitFor(expression, label) {
  for (let i = 0; i < 160; i++) {
    await sleep(250)
    let value = false
    try {
      value = await evaluate(expression)
    } catch {
      /* halaman belum siap, coba lagi */
    }
    if (value) return true
  }
  throw new Error(`timeout menunggu: ${label}`)
}

const rootHtml = `document.getElementById('root') ? document.getElementById('root').innerHTML : ''`
const badgeCount = `(() => {
  const m = document.getElementById('root').innerHTML.match(/tp-header__badge">(\\d+)</)
  return m ? Number(m[1]) : 0
})()`
const lineQty = `Number(document.querySelector('.cart-line__qty input')?.value ?? -1)`
const clickButton = (label) => `(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})
  if (!btn) return 'tidak-ada-tombol'
  btn.click()
  return 'ok'
})()`
const setQtyAndEnter = (value) => `(() => {
  const input = document.querySelector('.cart-line__qty input')
  if (!input) return false
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, ${JSON.stringify(String(value))})
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  return true
})()`

try {
  await send('Page.enable')
  await send('Runtime.enable')

  await send('Page.navigate', { url: `${BASE}/furniture/product-detail?id=${PRODUCTS_ID}` })
  await waitFor(`location.pathname.endsWith('/product-detail')`, 'navigasi ke detail')
  // Detail mengambil datanya async, jadi tunggu tombolnya, bukan <main> terisi.
  await waitFor(
    `[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Tambah ke keranjang')`,
    'CTA Tambah ke keranjang'
  )

  const detailHtml = String(await evaluate(rootHtml))
  check('detail produk React ter-render', detailHtml.includes('Tambah ke keranjang'))
  check(
    'detail punya CTA Beli sekarang juga',
    detailHtml.includes('Beli sekarang')
  )

  const clicked = await evaluate(clickButton('Tambah ke keranjang'))
  check('CTA Tambah ke keranjang diklik', clicked === 'ok', String(clicked))

  await waitFor(`location.pathname.endsWith('/shopping-cart')`, 'mendarat di shopping-cart')
  check('mendarat di /furniture/shopping-cart', true)

  await waitFor(`document.querySelectorAll('.cart-line__name').length > 0`, 'baris cart muncul')
  const cartHtml = String(await evaluate(rootHtml))

  check('halaman cart bukan HTML PHP', !/cart-contents|class="items-count"/.test(cartHtml))
  check('baris cart React tampil', cartHtml.includes('cart-line__name'))
  check('produk hasil add tampil', cartHtml.includes(PRODUCT_NAME_PATTERN))
  check('qty baris sesuai default CTA', (await evaluate(lineQty)) === 1)
  check('badge header menunjukkan 1', (await evaluate(badgeCount)) === 1)
  check('tombol hapus tersedia', cartHtml.includes('cart-line__remove'))

  const checkoutHref = await evaluate(
    `document.querySelector('a.cart__checkout')?.getAttribute('href') ?? null`
  )
  check(
    'checkout tetap menunjuk PHP',
    checkoutHref === `${BASE}/furniture/checkout`,
    String(checkoutHref)
  )

  // Enter harus commit: blur tidak selalu terjadi untuk shopper keyboard atau
  // keypad Android, jadi onBlur saja tidak cukup.
  await evaluate(setQtyAndEnter(3))
  await waitFor(`(${badgeCount}) === 3`, 'badge berubah jadi 3')
  check('qty baris jadi 3', (await evaluate(lineQty)) === 3)
  check('badge ikut jadi 3', (await evaluate(badgeCount)) === 3)

  await evaluate(`document.querySelector('button.cart-line__remove').click()`)
  await waitFor(
    `${rootHtml}.includes('Keranjangmu masih kosong')`,
    'empty state setelah remove'
  )
  const afterRemove = String(await evaluate(rootHtml))
  check('baris hilang setelah remove', !afterRemove.includes('cart-line__name'))
  check('badge kembali kosong', !(await evaluate(badgeCount)))
  check('empty state tampil', afterRemove.includes('Keranjangmu masih kosong'))
} catch (error) {
  check('error', false, String(error))
} finally {
  ws.close()
  chrome.kill()
  finish()
}
