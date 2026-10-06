/**
 * Ubah HTML deskripsi produk menjadi teks biasa.
 *
 * `products_description` disimpan sebagai HTML oleh admin, jadi tema PHP
 * mencetaknya mentah. Di React itu tidak boleh lewat `dangerouslySetInnerHTML`
 * karena isinya bisa mengandung markup dari sumber yang tidak dipercaya, dan
 * `package.json` tidak punya pustaka sanitizer.
 *
 * Cara di sini bukan regex. Parsing dilakukan dengan DOMParser milik browser,
 * lalu teks diambil dari node yang sudah terurai. Parser yang sama dipakai
 * browser untuk menampilkan halaman, jadi tag menacing seperti
 * `<img src=x onerror=...>` tidak pernah masuk ke DOM dokumen ini; ia hanya
 * menghasilkan teks atau dihapus.
 *
 * Batasnya jelas: hasil akhir kehilangan formatting. Paragraf dan baris baru
 * dari blok HTML tetap dipertahankan supaya teks tidak menjadi satu blok
 * padat, tapi `<strong>`, `<ul>`, dan `<a>` berubah jadi teks biasa.
 *
 * Kalau suatu saat deskripsi memang harus tampil dengan formatting penuh,
 * ganti isi fungsi ini dengan DOMPurify dan pakai
 * `dangerouslySetInnerHTML` pada hasil sanitasi. Jangan hanya menghapus
 * `sanitize` lalu menempelkan HTML mentah.
 */

/** Tag yang jadi pemisah baris baru saatitis. */
const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
])

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) {
    return ''
  }

  // Parse sebagai fragment di dalam elemen supaya DOMParser tidak
  // memindahkan node ke <html>/<body> secara diam-diam.
  const parsed = new DOMParser().parseFromString(
    `<div id="tp-sanitize-root">${html}</div>`,
    'text/html'
  )

  const root = parsed.getElementById('tp-sanitize-root')
  if (!root) {
    return ''
  }

  walk(root)

  return root.textContent?.replace(/[ \t\u00a0]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim() ?? ''
}

/**
 * Sisipkan pemisah baris pada batas blok, lalu buang sisipan yang dobel.
 */
function walk(node: Node): void {
  const children = Array.from(node.childNodes)

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      continue
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element

      if (BLOCK_TAGS.has(element.tagName)) {
        element.prepend(document.createTextNode('\n'))
        element.append(document.createTextNode('\n'))
      }

      walk(element)
    }
  }

  // Elemen yang isinya cuma script/style tidak boleh sampai ke teks.
  if (
    (node.nodeType === Node.ELEMENT_NODE && /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test((node as Element).tagName))
  ) {
    node.textContent = ''
  }
}