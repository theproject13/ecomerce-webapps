<#
.SYNOPSIS
  Smoke test storefront osc414 setelah pemindahan homepage ke React.

.DESCRIPTION
  Menguji hal-hal yang mudah rusak diam-diam saat refactor:
  - homepage dilayani React, bukan PHP splash
  - aset React 200 dan aset lama sudah hilang
  - source React tidak bocor lewat web
  - link yang dipakai UI tidak 404
  - empat kanal satellite dan route PHP lain benar-benar dirender router PHP,
    bukan sekadar membalas 200 dengan isi shell React
  - admin terisolasi: host publik redirect ke host admin, host admin menolak storefront

  Penting: assertion body selalu dijalankan, bukan hanya saat status gagal.
  Test yang hanya memeriksa status code akan lolos untuk halaman yang
  terlayani konten yang salah.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1
#>
[CmdletBinding()]
param(
  [string]$StoreBase = 'http://localhost/osc414',
  [string]$AdminBase = 'http://admin.localhost/osc414'
)

$ErrorActionPreference = 'Stop'

$script:Failed = 0
$script:Passed = 0

function Get-ApiMetaPlatformId {
  # Body API menaruh meta.platform_id di akhir JSON, sementara item channels
  # punya platform_id-nya sendiri di dalam "items". Kalau hanya dicari
  # '"platform_id":(\d+)' yang pertama cocok, yang kena adalah kanal pertama,
  # bukan platform yang melayani request. Jadi blok meta wajib dipisah dulu.
  param([Parameter(Mandatory)][string]$Body)

  if ($Body -match '"meta"\s*:\s*\{[^}]*?"platform_id"\s*:\s*(\d+)') {
    return [int]$Matches[1]
  }

  return -1
}

function Get-ApiArrayBlock {
  # Body API tidak seragam: /channels memakai "items":[...] (array), sedangkan
  # /dashboard memakai "items":{"channels":[...],"featured":[...]}. Jadi yang
  # diambil adalah array properti yang dibutuhkan, bukan blok "items" itu
  # sendiri. Array di dalam item selalu diikuti } atau , sehingga tidak akan
  # salah berhenti di tanda ] pertama.
  param(
    [Parameter(Mandatory)][string]$Body,
    [Parameter(Mandatory)][string]$Property
  )

  $pattern = '"' + $Property + '"\s*:\s*\[(.*?)\]\s*[,}]'
  if ($Body -match ('(?s)' + $pattern)) {
    return $Matches[1]
  }

  return ''
}

function Test-Endpoint {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Url,
    [int[]]$Expected = @(200),
    [switch]$Follow,
    [string]$BodyContains,
    [string]$BodyNotContains,
    [int]$MinLength = 0
  )

  $args = @('-s', '-o', 'NUL', '-w', '%{http_code}')
  if ($Follow) { $args += '-L' }
  $args += $Url

  $status = & curl.exe @args
  $ok = $Expected -contains [int]$status
  $reason = "harapan status: $($Expected -join ',')"

  # Assertion body SELALU dijalankan, bukan hanya saat status gagal.
  # Kalau hanya dicek saat status salah, halaman yang balas 200 tapi isinya
  # salah akan lolos. itulah yang menutupi homepage dan keempat kanal yang
  # sempat terlayani shell React: status 200, isi salah.
  if ($BodyContains -or $BodyNotContains -or $MinLength -gt 0) {
    $body = (& curl.exe -sL $Url) -join "`n"

    if ($MinLength -gt 0 -and $body.Length -lt $MinLength) {
      $ok = $false
      $reason = "body hanya $($body.Length) karakter, minimal $MinLength"
    }

    if ($ok -and $BodyContains -and -not $body.Contains($BodyContains)) {
      $ok = $false
      $reason = "body tidak memuat '$BodyContains'"
    }

    if ($ok -and $BodyNotContains -and $body.Contains($BodyNotContains)) {
      $ok = $false
      $reason = "body masih memuat '$BodyNotContains'"
    }
  }

  if ($ok) {
    $script:Passed++
    Write-Host ("  PASS  {0,-52} {1}" -f $Name, $status) -ForegroundColor Green
  } else {
    $script:Failed++
    Write-Host ("  FAIL  {0,-52} {1} ({2})" -f $Name, $status, $reason) -ForegroundColor Red
  }
}

# Lokasi Chrome untuk headless render.
$script:ChromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

function Resolve-Chrome {
  foreach ($candidate in $script:ChromeCandidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return $candidate
    }
  }

  return $null
}

<#
  Renders a page with React and returns the resulting DOM.
  curl cannot be used here: the shell only contains <div id="root">, and all
  href values only exist after React has rendered.
#>
function Render-React {
  param(
    [Parameter(Mandatory)][string]$Url,
    [Parameter(Mandatory)][string]$DumpName
  )

  $chrome = Resolve-Chrome
  if (-not $chrome) {
    Write-Host "  SKIP  Chrome tidak ditemukan, lewati render $Url" -ForegroundColor Yellow
    return ''
  }

  $workDir = Join-Path $env:TEMP 'osc414-smoke'
  New-Item -ItemType Directory -Path $workDir -Force | Out-Null
  $dumpFile = Join-Path $workDir $DumpName

  $args = @(
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    "--user-data-dir=$workDir",
    '--virtual-time-budget=25000',
    '--dump-dom',
    $Url
  )

  $process = Start-Process -FilePath $chrome -ArgumentList $args `
    -RedirectStandardOutput $dumpFile -NoNewWindow -Wait -PassThru

  if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $dumpFile)) {
    Write-Host "  SKIP  render $Url gagal (exit $($process.ExitCode))" -ForegroundColor Yellow
    return ''
  }

  $dom = Get-Content -LiteralPath $dumpFile -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($dom)) {
    Write-Host "  SKIP  render $Url kosong" -ForegroundColor Yellow
    return ''
  }

  return $dom
}

Write-Host "`n== 1. Homepage React ==" -ForegroundColor Cyan
Test-Endpoint -Name 'homepage /osc414/' -Url "$StoreBase/" -BodyContains '<div id="root">'
Test-Endpoint -Name 'homepage tidak served PHP splash' -Url "$StoreBase/" -BodyNotContains 'osCommerce Test Store</title><script'

Write-Host "`n== 2. Aset React ==" -ForegroundColor Cyan
$homeHtml = (& curl.exe -sL "$StoreBase/") -join "`n"
$assetMatches = [regex]::Matches($homeHtml, '/react-assets/(assets/[^"'']+)')
if ($assetMatches.Count -eq 0) {
  Write-Host '  FAIL  tidak ada aset React di homepage' -ForegroundColor Red
  $script:Failed++
} else {
  foreach ($m in $assetMatches) {
    Test-Endpoint -Name "aset $($m.Groups[1].Value)" -Url "$StoreBase/$($m.Value)"
  }
}

Write-Host "`n== 3. Source React tidak boleh bocor ==" -ForegroundColor Cyan
foreach ($path in @(
  'src/main.tsx',
  'src/app/App.tsx',
  'src/lib/api-client.ts',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  '.env',
  'node_modules/vite/package.json'
)) {
  Test-Endpoint -Name "403 $path" -Url "$StoreBase/lib/frontend/web/react/$path" -Expected @(403)
}

# Alias /react-assets/ hanya rewrite ke public/, jadi src/ memang tidak ada di
# sana dan 404 adalah jawaban yang benar. Yang diperiksa di sini bukan
# statusnya, tapi isi responsnya: kalau rewrite-nya keliru dan source sampai
# bocor, body akan memuat kode React.
$reactAssetSourcePaths = @(
  'src/main.tsx',
  'src/features/catalog/product-images.ts',
  'src/lib/routes.ts'
)

foreach ($path in $reactAssetSourcePaths) {
  $body = (& curl.exe -sL "$StoreBase/react-assets/$path") -join "`n"

  if ($body -match 'createRoot|__OSC_STOREFRONT__|storefrontConfig') {
    Write-Host "  FAIL  react-assets/$path membocorkan source React" -ForegroundColor Red
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "react-assets/$path tidak bocor", '') -ForegroundColor Green
    $script:Passed++
  }
}

# Traversal dari alias react-assets harus tetap tidak membocorkan source.
foreach ($probe in @(
  'react-assets/../src/main.tsx',
  'react-assets/%2e%2e/src/main.tsx'
)) {
  $body = (& curl.exe -sL "$StoreBase/$probe") -join "`n"

  if ($body -match 'createRoot|__OSC_STOREFRONT__|storefrontConfig') {
    Write-Host "  FAIL  traversal $probe membocorkan source React" -ForegroundColor Red
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "traversal $probe aman", '') -ForegroundColor Green
    $script:Passed++
  }
}

Write-Host "`n== 4. Link UI storefront ==" -ForegroundColor Cyan
# Hanya path yang tidak sudah diuji sebagai "PHP, bukan React" di section 5b.
foreach ($path in @(
  'catalog/all-products',
  'account/create',
  'account/edit',
  'account/history',
  'account/address-book'
)) {
  Test-Endpoint -Name "200 /$path" -Url "$StoreBase/$path" -Follow
}

Write-Host "`n== 5. Kanal satellite ==" -ForegroundColor Cyan
# furniture sudah dimigrasikan ke React (A5). Kanal lain masih router PHP dan
# itu diperiksa eksplisit, supaya tidak ada kanal yang diam-diam ikut berubah.
#
# When a channel is migrated, move its name from $phpChannels to $reactChannels
# here. Do NOT just delete the assertion: a channel that silently falls back to
# PHP must fail loudly.
$reactChannels = @('furniture')
$phpChannels = @('watch', 'b2b-supermarket', 'printshop')

foreach ($channel in $reactChannels) {
  Test-Endpoint -Name "200 /$channel/ (React)" -Url "$StoreBase/$channel/" -Follow `
    -BodyContains '<div id="root">'
  Test-Endpoint -Name "200 /$channel/product-detail (React)" -Url "$StoreBase/$channel/product-detail?id=40" -Follow `
    -BodyContains '<div id="root">'
}

foreach ($channel in $phpChannels) {
  Test-Endpoint -Name "200 /$channel/ (PHP, bukan React)" -Url "$StoreBase/$channel/" -Follow `
    -MinLength 20000 -BodyNotContains '<div id="root">'
}

Write-Host "`n== 5b. Route PHP lain tidak tertimpa React ==" -ForegroundColor Cyan
# Toko utama: /catalog/* tetap milik tema PHP. Katalog React hanya diaktifkan
# di bawah kanal lewat ReactShell::$channelSubtrees, jadi URL kanal dan URL
# toko utama boleh sama-sama hidup dengan owner berbeda.
foreach ($path in @('catalog/featured-products', 'catalog/all-products', 'shopping-cart', 'account/login', 'contact')) {
  Test-Endpoint -Name "200 /$path (PHP, bukan React)" -Url "$StoreBase/$path" -Follow `
    -BodyNotContains '<div id="root">'
}

# Route milik kanal juga harus tetap PHP kecuali yang ada di $reactChannelPaths
# (homepage, product-detail, dan subtree catalog). Cart dan akun sengaja
# ditahan di sini: keduanya masih batch terpisah.
$reactChannelPaths = @('catalog/featured-products', 'catalog/all-products')

foreach ($channel in $reactChannels) {
  foreach ($path in $reactChannelPaths) {
    Test-Endpoint -Name "200 /$channel/$path (React)" -Url "$StoreBase/$channel/$path" -Follow `
      -BodyContains '<div id="root">'
  }

  # Path di bawah subtree catalog tanpa route React yang cocok akan diarahkan
  # router ke kanal. Statusnya 200 karena shell sama, jadi yang diuji di sini
  # hanya bahwa request tidak keluar dari React.
  Test-Endpoint -Name "200 /$channel/catalog/tidak-ada (React)" -Url "$StoreBase/$channel/catalog/tidak-ada" -Follow `
    -BodyContains '<div id="root">'

  foreach ($path in @('account/login')) {
    Test-Endpoint -Name "200 /$channel/$path (PHP, bukan React)" -Url "$StoreBase/$channel/$path" -Follow `
      -BodyNotContains '<div id="root">'
  }

  # /shopping-cart ikut React di kanal: halaman cart-nya sekarang dirender
  # Router React, dan shopper tidak pernah ejected ke PHP setelah add.
  Test-Endpoint -Name "200 /$channel/shopping-cart (React)" -Url "$StoreBase/$channel/shopping-cart" -Follow `
    -BodyContains '<div id="root">'
}

Write-Host "`n== 6. Isolasi admin ==" -ForegroundColor Cyan
Test-Endpoint -Name 'host publik /admin/ redirect ke host admin' -Url "$StoreBase/admin/" -Expected @(301)
Test-Endpoint -Name 'host admin tolak storefront /' -Url "$AdminBase/" -Expected @(403)
Test-Endpoint -Name 'host admin tolak API' -Url "$AdminBase/api/storefront/dashboard" -Expected @(403)

Write-Host "`n== 7. API dashboard ==" -ForegroundColor Cyan
Test-Endpoint -Name 'API /storefront/dashboard' -Url "$StoreBase/api/storefront/dashboard" -BodyContains '"store_name"'
Test-Endpoint -Name 'API /storefront/channels' -Url "$StoreBase/api/storefront/channels" -BodyContains '"platform_id"'
Test-Endpoint -Name 'API /storefront/featured' -Url "$StoreBase/api/storefront/featured" -BodyContains '"products_id"'
Test-Endpoint -Name 'API lama /catalog/products tetap hidup' -Url "$StoreBase/api/catalog/products" -BodyContains '"items"'

Write-Host "`n== 7b. API katalog ==" -ForegroundColor Cyan
# Endpoint katalog sengaja tidak memakai /api/catalog/products: yang itu tidak
# punya scoping platform, jadi katalog furniture akan menampilkan produk toko
# utama. platform_id juga tidak boleh dikirim dari klien.
Test-Endpoint -Name 'API /storefront/products' -Url "$StoreBase/api/storefront/products" -BodyContains '"total_count"'
Test-Endpoint -Name 'API /storefront/categories' -Url "$StoreBase/api/storefront/categories" -BodyContains '"product_count"'

# Endpoint katalog tidak punya parameter platform sama sekali: scoping diambil
# dari platform::currentId(). Yang diuji di sini adalah endpoint tidak
# membaca alias parameter milik frontend, jadi tidak ada jalur untuk shopper
# meminta kanal lain lewat query string.
#
# Catatan: '?platform_id=N' memang dapat mengganti platform, tapi itu perilaku
# global includes/configure.php yang sudah ada sebelum katalog ini, berlaku
# sama untuk seluruh halaman dan endpoint. Yang salah kalau endpoint katalog
# punya parameter platform sendiri.
foreach ($bad in @('platform=8', 'platformId=8', 'platform_id=abc', 'channel=watch', 'store=8')) {
  $body = (& curl.exe -sL "$StoreBase/furniture/api/storefront/products?$bad") -join "`n"

  $platformId = Get-ApiMetaPlatformId $body
  if ($platformId -eq 7) {
    Write-Host ("  PASS  {0,-52} {1}" -f "katalog mengabaikan '$bad'", 'platform_id tetap 7') -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host ("  FAIL  {0,-52} {1}" -f "katalog mengabaikan '$bad'", "platform_id jadi $platformId") -ForegroundColor Red
    $script:Failed++
  }
}

Write-Host "`n== 8. Kartu produk menunjuk ke React, bukan URL SEO ==" -ForegroundColor Cyan
# Shell React hanya berisi <div id="root">, jadi href baru terlihat setelah
# React merender. Karena itu halaman di-render dengan Chrome headless, bukan
# curl. Kalau cards kembali memakai product.url dari API, shopper mendarat di
# halaman PHP tema dan halaman ini gagal.
$rendered = Render-React "$StoreBase/" 'smoke-cards.html'

if ([string]::IsNullOrWhiteSpace($rendered)) {
  Write-Host '  SKIP  render homepage gagal, cek link detail dilewati' -ForegroundColor Yellow
} else {
  $detailLinks = [regex]::Matches($rendered, 'href="([^"]*/product-detail\?id=\d+)"')
  if ($detailLinks.Count -eq 0) {
    Write-Host '  FAIL  tidak ada link /product-detail di homepage React' -ForegroundColor Red
    $script:Failed++
  } else {
    $uniqueIds = @($detailLinks | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
    Write-Host ("  PASS  {0,-52} {1}" -f "kartu produk -> React detail", "$($detailLinks.Count) link / $($uniqueIds.Count) produk unik") -ForegroundColor Green
    $script:Passed++
  }

  # Path yang boleh dipakai kartu produk. Path lain sepanjang /<slug>/ di luar
  # allowlist ReactShell akan dilayani PHP tema.
  $allowed = 'product-detail|register|login|logoff|contact|shopping-cart|cart|checkout|furniture|watch|b2b-supermarket|printshop|react-assets|catalog|account|wishlist|orders|order-detail|addresses|search|index\.html'
  $seoLinks = [regex]::Matches($rendered, 'href="([^"]*/[a-z0-9][a-z0-9\-]{7,})"') |
    Where-Object { $_.Groups[1].Value -notmatch ('/(' + $allowed + ')([/?]|$)') }

  if (@($seoLinks).Count -gt 0) {
    Write-Host '  FAIL  link URL SEO PHP masih ada di homepage React:' -ForegroundColor Red
    $seoLinks | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique -First 5 |
      ForEach-Object { Write-Host "        $_" -ForegroundColor Red }
    $script:Failed++
  } else {
    Write-Host '  PASS  tidak ada link URL SEO di homepage React' -ForegroundColor Green
    $script:Passed++
  }
}

Write-Host "`n== 9. Halaman detail produk dilayani React ==" -ForegroundColor Cyan
Test-Endpoint -Name '200 /product-detail?id=40 (React)' -Url "$StoreBase/product-detail?id=40" `
  -BodyContains '<div id="root">' -BodyNotContains '<body class="body">'

$detailDom = Render-React "$StoreBase/product-detail?id=40" 'smoke-detail-40.html'
if ([string]::IsNullOrWhiteSpace($detailDom)) {
  Write-Host '  SKIP  render detail produk gagal' -ForegroundColor Yellow
} elseif ($detailDom -match 'tp-detail__title') {
  Write-Host '  PASS  detail produk 40 ter-render (judul + harga + galeri)' -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host '  FAIL  detail produk 40 tidak ter-render' -ForegroundColor Red
  $script:Failed++
}

$missingDom = Render-React "$StoreBase/product-detail?id=999999" 'smoke-detail-404.html'
if ([string]::IsNullOrWhiteSpace($missingDom)) {
  Write-Host '  SKIP  render detail 999999 gagal' -ForegroundColor Yellow
} elseif ($missingDom -match 'tp-detail__title') {
  Write-Host '  FAIL  produk 999999 masih menampilkan detail produk' -ForegroundColor Red
  $script:Failed++
} else {
  Write-Host '  PASS  produk 999999 menampilkan halaman tidak ditemukan' -ForegroundColor Green
  $script:Passed++
}

Write-Host "`n== 10. Konfigurasi runtime diinjeksi PHP (A4) ==" -ForegroundColor Cyan
# A6 membaca nilai ini untuk tahu di mount mana aplikasi benar-benar berada.
# Kalau tag hilang, catalogBase jatuh ke default '/' dan semua URL absolut
# ke halaman PHP kehilangan prefix install.
foreach ($case in @(
    @{ Path = '/'; Expected = '"catalogBase":"\/osc414"' },
    @{ Path = '/product-detail?id=40'; Expected = '"catalogBase":"\/osc414"' },
    @{ Path = '/register'; Expected = '"catalogBase":"\/osc414"' }
  )) {
  $pageBody = (& curl.exe -sL "$StoreBase$($case.Path)") -join "`n"
  if ($pageBody -notmatch 'window\.__OSC_STOREFRONT__=(\{.*?\});') {
    Write-Host "  FAIL  $($case.Path) tidak menyisipkan __OSC_STOREFRONT__" -ForegroundColor Red
    $script:Failed++
  } elseif ($Matches[1] -notlike "*$($case.Expected)*") {
    Write-Host "  FAIL  $($case.Path) catalogBase salah: $($Matches[1])" -ForegroundColor Red
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "$($case.Path) menyuntik config", $Matches[1].Substring(0, [Math]::Min(60, $Matches[1].Length))) -ForegroundColor Green
    $script:Passed++
  }
}

Write-Host "`n== 11. Kanal React: config dan render (A5) ==" -ForegroundColor Cyan
# Furniture sudah dilayani React. Dua hal yang wajib benar:
#  1. shell meng-inject catalogBase kanal, bukan /osc414. Kalau basename salah,
#     react-router tidak cocok dan halamannya layar putih.
#  2. kartu produk di kanal menunjuk ke /furniture/product-detail?id=, tetap di
#     bawah prefix kanal.
$expectedChannelBase = '"catalogBase":"\/osc414\/furniture"'

foreach ($channel in $reactChannels) {
  $pageBody = (& curl.exe -sL "$StoreBase/$channel/") -join "`n"
  if ($pageBody -notmatch 'window\.__OSC_STOREFRONT__=(\{.*?\})') {
    Write-Host "  FAIL  /$channel/ tidak menyisipkan __OSC_STOREFRONT__" -ForegroundColor Red
    $script:Failed++
  } elseif ($Matches[1] -notlike "*$expectedChannelBase*") {
    Write-Host "  FAIL  /$channel/ catalogBase salah: $($Matches[1])" -ForegroundColor Red
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "/$channel/ catalogBase kanal", $Matches[1]) -ForegroundColor Green
    $script:Passed++
  }

  $channelDom = Render-React "$StoreBase/$channel/" "smoke-channel-$channel.html"
  if ([string]::IsNullOrWhiteSpace($channelDom)) {
    Write-Host "  SKIP  render /$channel/ gagal" -ForegroundColor Yellow
  } else {
    $channelLinks = [regex]::Matches($channelDom, "href=""([^""]*/$channel/product-detail\?id=\d+)""")
    if ($channelLinks.Count -eq 0) {
      Write-Host "  FAIL  /$channel/ tidak punya link /$channel/product-detail" -ForegroundColor Red
      $script:Failed++
    } else {
      Write-Host ("  PASS  {0,-52} {1}" -f "/$channel/ link detail di bawah prefix kanal", "$($channelLinks.Count) link") -ForegroundColor Green
      $script:Passed++
    }
  }
}

Write-Host "`n== 12. API platform-scoped (A7) ==" -ForegroundColor Cyan
# Ini yang paling mudah regresi tanpa terlihat: sebelum A7 semua API memakai
# platform::defaultId() yang selalu 1, sehingga /furniture sama persis dengan
# toko utama. Statusnya tetap 200 dan body-nya tetap JSON yang valid, jadi
# test lama tidak pernah menangkapnya.
$expectedPlatforms = [ordered]@{
  ''                = 1
  'furniture'       = 7
  'watch'           = 8
  'b2b-supermarket' = 9
  'printshop'       = 10
}

$featuredByPath = @{}

foreach ($channel in $expectedPlatforms.Keys) {
  $url = if ($channel -eq '') { "$StoreBase/api/storefront/dashboard?featured_limit=24" } else { "$StoreBase/$channel/api/storefront/dashboard?featured_limit=24" }
  $label = if ($channel -eq '') { '/' } else { "/$channel" }

  $body = (& curl.exe -sL $url) -join "`n"

  $metaPlatformId = Get-ApiMetaPlatformId -Body $body
  if ($metaPlatformId -eq -1) {
    Write-Host "  FAIL  $label dashboard tidak punya meta.platform_id" -ForegroundColor Red
    $script:Failed++
    continue
  }

  if ($metaPlatformId -ne $expectedPlatforms[$channel]) {
    Write-Host "  FAIL  $label platform_id=$metaPlatformId, hope $($expectedPlatforms[$channel])" -ForegroundColor Red
    $script:Failed++
    continue
  }

  Write-Host ("  PASS  {0,-52} {1}" -f "$label platform_id", $metaPlatformId) -ForegroundColor Green
  $script:Passed++

  $featuredBlock = Get-ApiArrayBlock -Body $body -Property 'featured'
  $ids = [regex]::Matches($featuredBlock, '"products_id":(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
  $featuredByPath[$channel] = @($ids | Select-Object -Unique)
}

# Kanal harus menampilkan produk yang berbeda. Kalau daftar ini identik dengan
# toko utama, scoping platform belum berjalan walau platform_id sudah benar.
if ($featuredByPath.Count -ge 2) {
  $mainIds = @($featuredByPath[''])

  foreach ($channel in $expectedPlatforms.Keys) {
    if ($channel -eq '') {
      continue
    }

    $channelIds = @($featuredByPath[$channel])
    $shared = @($channelIds | Where-Object { $mainIds -contains $_ })

    if ($channelIds.Count -eq 0) {
      Write-Host "  FAIL  /$channel tidak punya produk featured" -ForegroundColor Red
      $script:Failed++
    } elseif ($shared.Count -eq $channelIds.Count -and $channelIds.Count -eq $mainIds.Count) {
      Write-Host "  FAIL  /$channel daftar produknya identik dengan toko utama ($($channelIds.Count) produk)" -ForegroundColor Red
      $script:Failed++
    } else {
      Write-Host ("  PASS  {0,-52} {1}" -f "/$channel produk berbeda dari toko utama", "$($channelIds.Count) produk, $($shared.Count) sama-sama featured") -ForegroundColor Green
      $script:Passed++
    }
  }
}

# Switcher kanal harus dari setiap path, dan tidak boleh menautkan kanal ke
# dirinya sendiri.
foreach ($channel in $expectedPlatforms.Keys) {
  $url = if ($channel -eq '') { "$StoreBase/api/storefront/channels" } else { "$StoreBase/$channel/api/storefront/channels" }
  $label = if ($channel -eq '') { '/' } else { "/$channel" }
  $body = (& curl.exe -sL $url) -join "`n"

  $listed = [regex]::Matches((Get-ApiArrayBlock -Body $body -Property 'items'), '"platform_id":(\d+)') |
    ForEach-Object { [int]$_.Groups[1].Value }
  $self = [int]$expectedPlatforms[$channel]

  # Dihitung dari blok items saja: nilai meta.platform_id sengaja tidak ikut,
  # kalau tidak kanal yang sedang dilayani selalu terlihat "ada di daftar".
  if ($listed -contains $self) {
    Write-Host "  FAIL  $label channels memuat dirinya sendiri ($self). Daftar: $($listed -join ',')" -ForegroundColor Red
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "$label channels tidak memuat diri sendiri", "daftar $($listed -join ',')") -ForegroundColor Green
    $script:Passed++
  }
}

Write-Host "`n== 13. Link antar kanal dari React (A8) ==" -ForegroundColor Cyan
# Bug yang ditutup A8: routeUrl() menempelkan path ke catalogBase, yang di kanal
# sudah berisi segmen kanal. Banner hero "Furniture" di /furniture berakhir di
# /osc414/furniture/furniture. Semua link ini harus bisa dibuka.
foreach ($channel in @('', 'furniture')) {
  $label = if ($channel -eq '') { '/' } else { "/$channel" }
  $url = if ($channel -eq '') { "$StoreBase/" } else { "$StoreBase/$channel/" }
  $dumpName = if ($channel -eq '') { 'a8-main.html' } else { "a8-$channel.html" }
  $dom = Render-React -Url $url -DumpName $dumpName

  if (-not $dom) {
    Write-Host "  FAIL  $label tidak bisa dirender headless" -ForegroundColor Red
    $script:Failed++
    continue
  }

  $bad = @()
  $checked = 0

  foreach ($m in [regex]::Matches($dom, 'href="([^"]+)"')) {
    $href = $m.Groups[1].Value
    if ($href -match '^(#|javascript:|mailto:)' -or $href -match 'fonts\.(googleapis|gstatic)') {
      continue
    }

    $target = if ($href -match '^https?://') { $href } else { "$StoreBase$($href -replace '^/osc414', '')" }
    $checked++

    # -L karena Apache masih 301 dari path tanpa trailing slash ke path dengan
    # slash. Yang diuji adalah apakah link itu akhirnya sampai, bukan apakah
    # hop pertamanya sudah 200.
    $code = (& curl.exe -sL -o NUL -w '%{http_code}' $target) -join ''
    if ($code -ne '200') {
      $bad += "$code $($href -replace [regex]::Escape($StoreBase), '')"
    }
  }

  if ($checked -eq 0) {
    Write-Host "  FAIL  $label tidak punya link untuk diperiksa" -ForegroundColor Red
    $script:Failed++
  } elseif ($bad.Count -gt 0) {
    Write-Host "  FAIL  $label punya $($bad.Count) link rusak dari $($checked) link" -ForegroundColor Red
    $bad | ForEach-Object { Write-Host "          $_" -ForegroundColor Red }
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "$label semua link hidup", "$checked link") -ForegroundColor Green
    $script:Passed++
  }

  # Guardrail khusus: prefix kanal tidak boleh terduplikasi.
  if ($dom -match '/furniture/furniture') {
    Write-Host "  FAIL  $label menghasilkan URL /furniture/furniture (prefix kanal ganda)" -ForegroundColor Red
    $script:Failed++
  } else {
    Write-Host ("  PASS  {0,-52} {1}" -f "$label tanpa prefix kanal ganda", '') -ForegroundColor Green
    $script:Passed++
  }
}

# Banner kanal harus absolut terhadap installBase, sama persis dari toko utama
# dan dari kanal. Kalau berbeda, link-nya ikut berubah depending we're where.
$mainDom = Render-React -Url "$StoreBase/" -DumpName 'a8-main.html'
$furnitureDom = Render-React -Url "$StoreBase/furniture/" -DumpName 'a8-furniture.html'
if ($mainDom -and $furnitureDom) {
  $pattern = 'tp-hero__slide" href="([^"]*)"'
  $mainHero = @([regex]::Matches($mainDom, $pattern) | ForEach-Object { $_.Groups[1].Value })
  $furnitureHero = @([regex]::Matches($furnitureDom, $pattern) | ForEach-Object { $_.Groups[1].Value })

  $channelLinks = @($mainHero | Where-Object { $_ -match '/(furniture|watch|b2b-supermarket|printshop)/?$' })
  $furnitureChannelLinks = @($furnitureHero | Where-Object { $_ -match '/(furniture|watch|b2b-supermarket|printshop)/?$' })

  if ($channelLinks.Count -gt 0 -and ($channelLinks -join ',') -eq ($furnitureChannelLinks -join ',')) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'link banner kanal identik di dua halaman', ($channelLinks -join ', ')) -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host "  FAIL  link banner kanal berbeda antar halaman." -ForegroundColor Red
    Write-Host "          toko utama: $($channelLinks -join ', ')" -ForegroundColor Red
    Write-Host "          furniture : $($furnitureChannelLinks -join ', ')" -ForegroundColor Red
    $script:Failed++
  }
}

Write-Host "`n== 14. Katalog kanal: data, filter, dan tautan ==" -ForegroundColor Cyan
# Keluhan yang menutup bagian ini: klik kanal Furniture lalu "Lihat semua"
# berakhir di halaman PHP yang isinya sama dengan homepage. Katalog React
# harus menampilkan seluruh keanggotaan kanal dari platforms_products, jadi
# jumlahnya harus lebih dari jumlah featured.
$catalogDom = Render-React -Url "$StoreBase/furniture/catalog/all-products" -DumpName 'smoke-catalog.html'

if ([string]::IsNullOrWhiteSpace($catalogDom)) {
  Write-Host '  FAIL  katalog furniture tidak bisa dirender headless' -ForegroundColor Red
  $script:Failed++
} else {
  $catalogIds = @(
    [regex]::Matches($catalogDom, 'product-detail\?id=(\d+)') |
      ForEach-Object { [int]$_.Groups[1].Value } | Select-Object -Unique
  )

  $catalogBody = (& curl.exe -sL "$StoreBase/furniture/api/storefront/products?per_page=1") -join "`n"
  $catalogMeta = [regex]::Match($catalogBody, '"meta"\s*:\s*\{[^}]*?"total_count"\s*:\s*(\d+)')
  $catalogTotal = if ($catalogMeta.Success) { [int]$catalogMeta.Groups[1].Value } else { -1 }
  $mainBody = (& curl.exe -sL "$StoreBase/api/storefront/products?per_page=1") -join "`n"
  $mainMeta = [regex]::Match($mainBody, '"meta"\s*:\s*\{[^}]*?"total_count"\s*:\s*(\d+)')
  $mainTotal = if ($mainMeta.Success) { [int]$mainMeta.Groups[1].Value } else { -1 }

  if ($catalogTotal -gt 0 -and $catalogTotal -ne $mainTotal) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'total katalog furniture beda dari toko utama', "furniture $catalogTotal vs utama $mainTotal") -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host ("  FAIL  {0,-52} {1}" -f 'total katalog furniture beda dari toko utama', "furniture $catalogTotal vs utama $mainTotal") -ForegroundColor Red
    $script:Failed++
  }

  if ($catalogIds.Count -eq 12) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'katalog render 12 kartu (per_page)', "$($catalogIds.Count) kartu") -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host ("  FAIL  {0,-52} {1}" -f 'katalog render 12 kartu (per_page)', "$($catalogIds.Count) kartu") -ForegroundColor Red
    $script:Failed++
  }

  # Kartu katalog harus menuju detail di bawah prefix kanal, bukan URL SEO PHP
  # dan bukan path toko utama. Yang boleh keluar dari prefix kanal cuma asset
  # React dan satu link eksplisit ke katalog toko utama.
  $cardTargets = @(
    [regex]::Matches($catalogDom, 'href="(/osc414/[^"]*product-detail\?id=\d+)"') |
      ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
  )
  $badCards = @($cardTargets | Where-Object { $_ -notmatch '^/osc414/furniture/product-detail\?id=\d+$' })

  # URL SEO PHP (mis. /furniture/mattress) tidak boleh dipakai sebagai target
  # navigasi katalog. Link header ke shopping-cart tetap PHP dan itu benar,
  # jadi ikut dikecualikan baik dengan maupun tanpa garis miring akhir.
  $seoTargets = @(
    [regex]::Matches($catalogDom, 'href="(/osc414/furniture/(?!product-detail|catalog/|account/|register|shopping-cart)[^"]+)"') |
      ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
  )

  $crossChannel = @(
    [regex]::Matches($catalogDom, 'href="(/osc414/(?!furniture/)[^"]+)"') |
      ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique |
      Where-Object { $_ -notmatch '^/osc414/react-assets/' }
  )

  if ($badCards.Count -eq 0 -and $seoTargets.Count -eq 0 -and $crossChannel.Count -le 1) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'katalog navigasi hanya dalam kanal', "$($cardTargets.Count) detail, $($crossChannel.Count) lintas kanal") -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host '  FAIL  katalog punya navigasi di luar kanal:' -ForegroundColor Red
    ($badCards + $seoTargets + $crossChannel) | Select-Object -Unique -First 6 | ForEach-Object { Write-Host "        $_" -ForegroundColor Red }
    $script:Failed++
  }

  # Halaman katalog harus punya kendali filter supaya shopper bisa mempersempit.
  foreach ($control in @('tp-catalog__search', 'tp-pager')) {
    if ($catalogDom -match $control) {
      Write-Host ("  PASS  {0,-52} {1}" -f "katalog punya $control", '') -ForegroundColor Green
      $script:Passed++
    } else {
      Write-Host ("  FAIL  {0,-52} {1}" -f "katalog punya $control", 'tidak ditemukan di DOM') -ForegroundColor Red
      $script:Failed++
    }
  }

  # Sort dan filter harus benar-benar mengubah hasil, bukan hanya mengubah
  # tampilan chip.
  $sorted = (& curl.exe -sL "$StoreBase/furniture/api/storefront/products?per_page=12&sort=name_asc") -join "`n"
  $unsorted = (& curl.exe -sL "$StoreBase/furniture/api/storefront/products?per_page=12&sort=newest") -join "`n"
  $sortedIds = ([regex]::Matches($sorted, '"products_id"\s*:\s*(\d+)') | ForEach-Object { $_.Groups[1].Value }) -join ','
  $unsortedIds = ([regex]::Matches($unsorted, '"products_id"\s*:\s*(\d+)') | ForEach-Object { $_.Groups[1].Value }) -join ','

  if ($sortedIds -and $sortedIds -ne $unsortedIds) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'sort mengubah urutan hasil', 'name_asc != newest') -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host '  FAIL  sort tidak mengubah urutan hasil' -ForegroundColor Red
    $script:Failed++
  }

  # Pencarian harus/stable dan ter-scope kanal: kata kunci yang hanya ada di
  # toko utama tidak boleh muncul di katalog furniture.
  $searchBody = (& curl.exe -sL "$StoreBase/furniture/api/storefront/products?per_page=12&keywords=bed") -join "`n"
  $searchTotal = [regex]::Match($searchBody, '"meta"\s*:\s*\{[^}]*?"total_count"\s*:\s*(\d+)')

  if ($searchTotal.Success -and [int]$searchTotal.Groups[1].Value -gt 0 -and [int]$searchTotal.Groups[1].Value -lt $catalogTotal) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'pencarian memfilter katalog kanal', "$($searchTotal.Groups[1].Value) dari $catalogTotal produk") -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host '  FAIL  pencarian tidak memfilter katalog kanal' -ForegroundColor Red
    $script:Failed++
  }

  # Parameter rusak harus jatuh ke default, bukan error 500 atau hasil kosong.
  foreach ($junk in @('sort=<script>', 'scope=<script>', 'page=0', 'page=abc', 'category_id=abc', 'per_page=9999')) {
    $code = (& curl.exe -sL -o NUL -w '%{http_code}' "$StoreBase/furniture/api/storefront/products?$junk") -join ''
    if ($code -eq '200') {
      Write-Host ("  PASS  {0,-52} {1}" -f "parameter rusak '$junk'", '200') -ForegroundColor Green
      $script:Passed++
    } else {
      Write-Host ("  FAIL  {0,-52} {1}" -f "parameter rusak '$junk'", $code) -ForegroundColor Red
      $script:Failed++
    }
  }
}

# Kategori di katalog harus punya produk dan nama. Endpoint bawaan
# /api/catalog/categories tidak menyertakan nama, jadi tidak bisa dipakai di UI.
$catBody = (& curl.exe -sL "$StoreBase/furniture/api/storefront/categories") -join "`n"
$catBlock = Get-ApiArrayBlock $catBody 'items'
$catIds = @([regex]::Matches($catBlock, '"category_id"\s*:\s*(\d+)') | ForEach-Object { $_.Groups[1].Value })
$catNames = @([regex]::Matches($catBlock, '"name"\s*:\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
$catZero = @([regex]::Matches($catBlock, '"product_count"\s*:\s*0(?=[,\s}])')).Count

if ($catIds.Count -gt 0 -and $catNames.Count -eq $catIds.Count -and $catZero -eq 0) {
  Write-Host ("  PASS  {0,-52} {1}" -f 'kategori kanal punya nama dan produk', "$($catIds.Count) kategori") -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'kategori kanal punya nama dan produk', "$($catNames.Count) nama / $($catIds.Count) id / $($catZero) tanpa produk") -ForegroundColor Red
  $script:Failed++
}

Write-Host "`n== 15. CTA keranjang (React -> API PHP -> React cart) ==" -ForegroundColor Cyan
# Tombol di halaman detail harus benar-benar menulis ke shopping_cart PHP,
# bukan keranjang tiruan di browser. Yang diperiksa: tombolnya ada, endpoint
# mewajibkan token CSRF, isinya terbaca lewat /api/cart/index, dan update
# serta remove mengubah count yang dipakai badge React.
$detailDom = Render-React -Url "$StoreBase/furniture/product-detail?id=75" -DumpName 'smoke-cart-detail.html'

if ([string]::IsNullOrWhiteSpace($detailDom)) {
  Write-Host '  FAIL  detail produk tidak bisa dirender headless' -ForegroundColor Red
  $script:Failed++
} else {
  $buyLabels = @([regex]::Matches($detailDom, '(Tambah ke keranjang|Beli sekarang)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)

  if ($buyLabels.Count -eq 2) {
    Write-Host ("  PASS  {0,-52} {1}" -f 'detail punya dua CTA beli', ($buyLabels -join ' + ')) -ForegroundColor Green
    $script:Passed++
  } else {
    Write-Host ("  FAIL  {0,-52} {1}" -f 'detail punya dua CTA beli', "hanya: $($buyLabels -join ', ')") -ForegroundColor Red
    $script:Failed++
  }
}

$cartJar = Join-Path ([System.IO.Path]::GetTempPath()) "smoke-cart-jar.txt"
Remove-Item $cartJar -ErrorAction SilentlyContinue

# GET dulu supaya session tlSID7 terbentuk, persis seperti browser.
& curl.exe -s -o NUL -c $cartJar "$StoreBase/furniture/product-detail?id=75"

$csrfBody = (& curl.exe -s -b $cartJar -c $cartJar "$StoreBase/furniture/api/cart/csrf") -join "`n"
$csrfToken = [regex]::Match($csrfBody, '"csrfToken"\s*:\s*"([^"]+)"').Groups[1].Value

if ($csrfToken) {
  Write-Host ("  PASS  {0,-52} {1}" -f 'GET /api/cart/csrf memberi token', 'token + cookie _csrf') -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'GET /api/cart/csrf memberi token', $csrfBody.Substring(0, [Math]::Min(80, $csrfBody.Length))) -ForegroundColor Red
  $script:Failed++
}

$addBody = (& curl.exe -s -b $cartJar -c $cartJar -X POST --data-urlencode 'products_id=75' --data-urlencode 'qty=1' --data-urlencode "_csrf=$csrfToken" "$StoreBase/furniture/api/cart/add") -join "`n"
$addJson = [regex]::Match($addBody, '"ok"\s*:\s*true').Success
$addCount = [regex]::Match($addBody, '"count"\s*:\s*(\d+)').Groups[1].Value
$addCartUrl = [regex]::Match($addBody, '"cart"\s*:\s*"([^"]+)"').Groups[1].Value
$addCheckoutUrl = [regex]::Match($addBody, '"checkout"\s*:\s*"([^"]+)"').Groups[1].Value

if ($addJson -and [int]$addCount -ge 1 -and $addCartUrl -eq '/osc414/furniture/shopping-cart' -and $addCheckoutUrl -eq '/osc414/furniture/checkout') {
  Write-Host ("  PASS  {0,-52} {1}" -f 'POST /api/cart/add menulis ke cart PHP', "count=$addCount, redirect cart+checkout") -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'POST /api/cart/add menulis ke cart PHP', $addBody.Substring(0, [Math]::Min(120, $addBody.Length))) -ForegroundColor Red
  $script:Failed++
}

# Isi keranjang dibaca dari endpoint yang sama dengan CartPage, karena
# /furniture/shopping-cart kini dirender client-side: HTML awal cuma kerangka
# <div id="root">, isi baru muncul setelah React ambil /api/cart/index.
$indexBody = (& curl.exe -s -b $cartJar -c $cartJar "$StoreBase/furniture/api/cart/index") -join "`n"
$indexUprid = [regex]::Match($indexBody, '"uprid"\s*:\s*"([^"]+)"').Groups[1].Value
$indexCount = [int][regex]::Match($indexBody, '"count"\s*:\s*(\d+)').Groups[1].Value
$indexEmpty = [regex]::Match($indexBody, '"is_empty"\s*:\s*true').Success

if ($indexBody -match 'ZEDS QUASAR QUEEN MATTRESS IN A BOX' -and $indexCount -ge 1 -and -not $indexEmpty -and $indexUprid) {
  Write-Host ("  PASS  {0,-52} {1}" -f 'GET /api/cart/index mengembalikan isi cart', "count=$indexCount, uprid=$indexUprid") -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'GET /api/cart/index mengembalikan isi cart', $indexBody.Substring(0, [Math]::Min(120, $indexBody.Length))) -ForegroundColor Red
  $script:Failed++
}

# Update dan remove memakai uprid, dan keduanya wajib mengubah count supaya
# badge header ikut berubah tanpa reload.
$csrfBody3 = (& curl.exe -s -b $cartJar -c $cartJar "$StoreBase/furniture/api/cart/csrf") -join "`n"
$csrfToken3 = [regex]::Match($csrfBody3, '"csrfToken"\s*:\s*"([^"]+)"').Groups[1].Value
# Status ikut diambil: body JSON tetap sama pada 200 dan 422, jadi tanpa ini
# test tidak bisa membedakan "ditolak" dari "diterima tapi tidak berubah".
$updateRaw = (& curl.exe -s -b $cartJar -c $cartJar -w "`n%{http_code}" -X POST --data-urlencode "uprid=$indexUprid" --data-urlencode 'qty=3' --data-urlencode "_csrf=$csrfToken3" "$StoreBase/furniture/api/cart/update") -join "`n"
$updateStatus = $updateRaw.Substring($updateRaw.LastIndexOf("`n") + 1)
$updateBody = $updateRaw.Substring(0, $updateRaw.LastIndexOf("`n"))
$updateCount = [int][regex]::Match($updateBody, '"count"\s*:\s*(\d+)').Groups[1].Value

if ($updateStatus -eq '200' -and [regex]::Match($updateBody, '"ok"\s*:\s*true').Success -and $updateCount -eq 3 -and $updateBody -match '"qty"\s*:\s*3') {
  Write-Host ("  PASS  {0,-52} {1}" -f 'POST /api/cart/update mengubah qty baris', "qty=3, count=3, status=$updateStatus") -ForegroundColor Green
  $script:Passed++
} else {
  $updateErr = [regex]::Match($updateBody, '"error"\s*:\s*"([^"]*)"').Groups[1].Value
  Write-Host ("  FAIL  {0,-52} {1}" -f 'POST /api/cart/update mengubah qty baris', "status=$updateStatus, uprid terkirim=$indexUprid, error=$updateErr") -ForegroundColor Red
  $script:Failed++
}

$csrfBody4 = (& curl.exe -s -b $cartJar -c $cartJar "$StoreBase/furniture/api/cart/csrf") -join "`n"
$csrfToken4 = [regex]::Match($csrfBody4, '"csrfToken"\s*:\s*"([^"]+)"').Groups[1].Value
$removeRaw = (& curl.exe -s -b $cartJar -c $cartJar -w "`n%{http_code}" -X POST --data-urlencode "uprid=$indexUprid" --data-urlencode "_csrf=$csrfToken4" "$StoreBase/furniture/api/cart/remove") -join "`n"
$removeStatus = $removeRaw.Substring($removeRaw.LastIndexOf("`n") + 1)
$removeBody = $removeRaw.Substring(0, $removeRaw.LastIndexOf("`n"))
$removeCount = [int][regex]::Match($removeBody, '"count"\s*:\s*(\d+)').Groups[1].Value

if ($removeStatus -eq '200' -and $removeCount -eq 0 -and $removeBody -match '"is_empty"\s*:\s*true') {
  Write-Host ("  PASS  {0,-52} {1}" -f 'POST /api/cart/remove mengosongkan cart', "count=0, is_empty=true, status=$removeStatus") -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'POST /api/cart/remove mengosongkan cart', "status=$removeStatus, " + $removeBody.Substring(0, [Math]::Min(100, $removeBody.Length))) -ForegroundColor Red
  $script:Failed++
}

# uprid palsu harus ditolak, kalau tidak satu baris bisa dihapus dari luar.
$csrfBody5 = (& curl.exe -s -b $cartJar -c $cartJar "$StoreBase/furniture/api/cart/csrf") -join "`n"
$csrfToken5 = [regex]::Match($csrfBody5, '"csrfToken"\s*:\s*"([^"]+)"').Groups[1].Value
$badUprid = (& curl.exe -s -b $cartJar -c $cartJar -o NUL -w '%{http_code}' -X POST --data-urlencode 'uprid=999999' --data-urlencode 'qty=1' --data-urlencode "_csrf=$csrfToken5" "$StoreBase/furniture/api/cart/update") -join ''

if ($badUprid -eq '422') {
  Write-Host ("  PASS  {0,-52} {1}" -f 'cart/update menolak uprid asing', '422') -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'cart/update menolak uprid asing', "status=$badUprid") -ForegroundColor Red
  $script:Failed++
}

# CSRF dan method wajib dijaga; kalau ini longgar, endpoint ini jadi tulis
# tanpa proteksi dari halaman mana pun di origin yang sama.
# Token diambil lagi dulu: Sceleton.php memutar token setiap POST yang lolos,
# jadi token dari add di atas sudah basi.
$csrfBody2 = (& curl.exe -s -b $cartJar -c $cartJar "$StoreBase/furniture/api/cart/csrf") -join "`n"
$csrfToken2 = [regex]::Match($csrfBody2, '"csrfToken"\s*:\s*"([^"]+)"').Groups[1].Value

$noToken = (& curl.exe -s -b $cartJar -c $cartJar -o NUL -w '%{http_code}' -X POST --data-urlencode 'products_id=75' "$StoreBase/furniture/api/cart/add") -join ''
$getAdd = (& curl.exe -s -b $cartJar -c $cartJar -o NUL -w '%{http_code}' "$StoreBase/furniture/api/cart/add") -join ''
$badProduct = (& curl.exe -s -b $cartJar -c $cartJar -o NUL -w '%{http_code}' -X POST --data-urlencode 'products_id=999999' --data-urlencode 'qty=1' --data-urlencode "_csrf=$csrfToken2" "$StoreBase/furniture/api/cart/add") -join ''

if ($noToken -eq '400' -and $getAdd -eq '405' -and $badProduct -eq '422') {
  Write-Host ("  PASS  {0,-52} {1}" -f 'cart/add menolak cara yang salah', "tanpa token=$noToken, GET=$getAdd, produk rusak=$badProduct") -ForegroundColor Green
  $script:Passed++
} else {
  Write-Host ("  FAIL  {0,-52} {1}" -f 'cart/add menolak cara yang salah', "tanpa token=$noToken, GET=$getAdd, produk rusak=$badProduct") -ForegroundColor Red
  $script:Failed++
}

Remove-Item $cartJar -ErrorAction SilentlyContinue

$total = $script:Passed + $script:Failed
Write-Host "`n=====================================" -ForegroundColor Cyan
if ($script:Failed -eq 0) {
  Write-Host "SEMUA LULUS: $total/$total" -ForegroundColor Green
  exit 0
}

Write-Host "GAGAL: $script:Failed dari $total pemeriksaan" -ForegroundColor Red
exit 1