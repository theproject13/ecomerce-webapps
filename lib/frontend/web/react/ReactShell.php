<?php
/**
 * This file is part of osCommerce ecommerce platform.
 * osCommerce the ecommerce
 *
 * @link https://www.oscommerce.com
 * @copyright Copyright (c) 2000-2022 osCommerce LTD
 *
 * Released under the GNU General Public License
 * For the full copyright and license information, please view the LICENSE.TXT file that was distributed with this source code.
 */

/**
 * Hands the storefront homepage over to the built React shell.
 *
 * Why this decision lives in PHP and not in .htaccess: the satellite
 * platforms (furniture, watch, b2b-supermarket, printshop) are real
 * directories under the install root. A per-directory
 * "RewriteRule ^$ react/public/index.html [L]" matches those directories as
 * well, because the per-directory path of a directory request is the empty
 * string. Every channel URL would then answer with the React shell instead
 * of its own PHP page.
 *
 * Deciding here means the URL manager has already resolved which platform
 * the request belongs to (OSC_DETECTED_PLATFORM_ID), so the homepage can be
 * enabled per platform without hardcoding any folder name in the rewrite
 * rules.
 */
class ReactShell
{
    /**
     * Path di bawah base install yang juga dilayani React, selain homepage.
     *
     * Sengaja daftar nama, bukan pola. Kalau memakai catch-all, route PHP
     * seperti /catalog atau /account ikut tertangkap dan batas hibrida
     * STOREFRONT (PHP) dan REACT (homepage) runtuh.
     *
     * Path ditulis relatif terhadap base install, tanpa slash tepi.
     */
    protected static $reactPaths = [
        'register',
        // Detail produk. ID-nya lewat query string (?id=<products_id>), bukan
        // segmen path, supaya nama path ini tetap bisa dicocokkan sebagai
        // daftar nama. URL SEO produk (/osc414/<slug>) tetap dilayani tema
        // PHP; lihat docs/README.md.
        'product-detail',
    ];

    /**
     * Jalur kanal di bawah base install yang homepage-nya dilayani React.
     *
     * Sama seperti $reactPaths, ini daftar nama eksplisit, bukan pola.
     * Kanal-kanal ini adalah junction Windows yang menunjuk ke root instalasi
     * ini sendiri (lihat docs/migrasi-kanal-react.md 1.1), jadi request
     * /furniture/ sudah dieksekusi oleh kode yang sama dengan toko utama.
     * Yang membedakan hanya platform yang terdeteksi, bukan instalasinya.
     *
     * Kanal yang tidak ada di daftar ini tetap dilayani PHP-nya sendiri, jadi
     * menambah kanal baru selalu butuh perubahan kode yang terlihat.
     *
     * PERUBAHAN KANAL: tambah satu baris di sini, lalu balik assertion
     * smoke test seksi 5 untuk kanal itu dari "PHP" jadi "React". Satu kanal
     * pada satu waktu, supaya kalau ada yang rusak penyebabnya jelas.
     */
    protected static $channelPaths = [
        'furniture',
        // 'watch',              // platform 8 - belum diaktifkan
        // 'b2b-supermarket',   // platform 9 - belum diaktifkan
        // 'printshop',         // platform 10 - belum diaktifkan
    ];

    /**
     * Sub-pohon di bawah kanal yang juga dilayani React.
     *
     * Bedakan dengan $reactPaths: yang di sini boleh punya segmen tambahan di
     * bawahnya, jadi /osc414/furniture/catalog/all-products ikut React, bukan
     * hanya /osc414/furniture/product-detail.
     *
     * Sengaja hanya berlaku untuk kanal. /osc414/catalog/... milik toko utama
     * tetap dilayani tema PHP karena URL kategori SEO (/osc414/<slug> disobek
     * TlUrlRule) dan halaman hasil pencarian sudah punya kontrak lama. Mengaktifkannya
     * di toko utama tanpa audit SEO tersendiri berisiko merusak indeksasi.
     *
     * Setiap nilai di sini harus punya route React yang cocok di src/app/router.tsx.
     */
    protected static $channelSubtrees = [
        'catalog',
        'shopping-cart',
    ];

    /**
     * True when the current request should be answered by the React shell.
     */
    public static function isReactRequest()
    {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
            return false;
        }

        // The install base path is the deciding condition. It is derived from
        // the filesystem instead of OSC_DETECTED_BASE_URL because that
        // constant only exists once the AdditionalPlatforms extension has
        // run, which is not guaranteed at this point in the bootstrap.
        $base = self::normalizePath(self::installBasePath());
        $current = self::normalizePath(self::requestPath());

        $prefix = rtrim($base, '/') . '/';

        if (strpos($current, $prefix) !== 0) {
            return false;
        }

        // normalizePath() selalu menambah slash di akhir, jadi path relatif
        // harus dibersihkan lagi sebelum dicocokkan dengan daftar nama.
        $relative = rtrim(substr($current, strlen($prefix)), '/');

        if ($relative === '') {
            // Homepage toko utama, contoh /osc414/.
            return self::isMainPlatform();
        }

        $segments = explode('/', $relative);
        $channel = strtolower($segments[0]);

        if (in_array($channel, self::$channelPaths, true) && self::isChannelPlatform()) {
            // Homepage kanal, contoh /osc414/furniture/.
            if (count($segments) === 1) {
                return true;
            }

            // Path React di bawah kanal, contoh /osc414/furniture/product-detail.
            if (count($segments) === 2 && in_array($segments[1], self::$reactPaths, true)) {
                return true;
            }

            // Sub-pohon kanal, contoh /osc414/furniture/catalog/all-products.
            // Segmen setelahnya bebas karena router React yang memutuskan
            // route mana yang ada.
            if (
                count($segments) >= 2
                && in_array(strtolower($segments[1]), self::$channelSubtrees, true)
            ) {
                return true;
            }

            // Sisanya milik PHP kanal: /furniture/catalog, /furniture/shopping-cart,
            // /furniture/account, dan seterusnya.
            return false;
        }

        return in_array($relative, self::$reactPaths, true) && self::isMainPlatform();
    }

    /**
     * Hanya toko utama yang boleh memakai shell React.
     *
     * Dipakai untuk path yang bukan milik kanal (/osc414/register,
     * /osc414/product-detail). Kanal punya daftar path sendiri di bawah.
     */
    protected static function isMainPlatform()
    {
        if (self::detectedPlatformId() !== 1) {
            return false;
        }

        return true;
    }

    /**
     * True when the request belongs to a satellite channel rather than the
     * main store.
     *
     * Hanya memeriksa id platform, bukan nama platform dari database.
     * send() dan isReactRequest() jalan sebelum bootstrap selesai, jadi query
     * ke Platforms tidak boleh di sini. Pasangan dengan $channelPaths sudah
     * cukup: nama folder harus ada di allowlist DAN id platform harus bukan 1,
     * sehingga request toko utama tidak bisa ikut dilayani sebagai kanal.
     *
     * @return bool
     */
    protected static function isChannelPlatform()
    {
        return self::detectedPlatformId() > 1;
    }

    /**
     * @deprecated Gunakan isReactRequest().
     */
    public static function isReactHomepage()
    {
        return self::isReactRequest();
    }

    /**
     * Sends the built shell.
     *
     * Returns false when the build is missing or empty so the caller can
     * fall back to the PHP theme instead of showing a blank page.
     */
    public static function send()
    {
        $indexFile = __DIR__ . '/public/index.html';

        if (!is_file($indexFile)) {
            return false;
        }

        $html = file_get_contents($indexFile);

        if ($html === false || trim($html) === '') {
            return false;
        }

        $html = self::injectConfig($html);
        // The root .htaccess sets "ExpiresDefault access 2 days" for
        // text/html. The shell must not be cached that long, otherwise
        // browsers keep requesting asset hashes that a later build has
        // already replaced.
        header('Cache-Control: no-cache, must-revalidate');
        header('Content-Type: text/html; charset=utf-8');

        // send() echoes the shell directly instead of handing it to
        // Yii::$app->response, so the cookies Yii collected are never
        // written. That silently dropped the _csrf cookie, and without it
        // Yii issues a brand new CSRF token on every request: the token
        // injected into the config could never validate, so any POST from
        // React (add to cart) failed with "The form is expired" even though
        // the same flow worked on the PHP pages. Order matters:
        // injectConfig() is what makes Yii generate the token.
        self::flushCookies();

        echo $html;

        return true;
    }

    /**
     * Writes the cookies Yii collected into raw Set-Cookie headers.
     *
     * Response::sendCookies() is protected and __toString() on a cookie returns
     * only the value, not "name=value", so the header has to be assembled here.
     *
     * Only in-memory headers are touched, so this stays within the rule that
     * send() must not touch the database.
     */
    protected static function flushCookies()
    {
        foreach (Yii::$app->response->cookies as $cookie) {
            $parts = [$cookie->name . '=' . rawurlencode((string)$cookie->value)];

            if ((string)$cookie->path !== '') {
                $parts[] = 'Path=' . $cookie->path;
            }
            if ((string)$cookie->domain !== '') {
                $parts[] = 'Domain=' . $cookie->domain;
            }
            if ($cookie->expire) {
                $parts[] = 'Max-Age=' . max(0, (int)$cookie->expire - time());
            }
            if ($cookie->httpOnly) {
                $parts[] = 'HttpOnly';
            }
            if ($cookie->secure) {
                $parts[] = 'Secure';
            }
            if ((string)$cookie->sameSite !== '') {
                $parts[] = 'SameSite=' . $cookie->sameSite;
            }

            header('Set-Cookie: ' . implode('; ', $parts), false);
        }
    }

    /**
     * Injects window.__OSC_STOREFRONT__ into the shell.
     *
     * The values are computed from the request that is being served, not from
     * VITE_*, because the channel base path (/furniture) is only known to PHP.
     * If the build kept it hardcoded, React on /furniture would call /api/,
     * PHP would resolve PLATFORM_ID=1, and the channel would show main store
     * data.
     *
     * Nothing in here may touch the database. send() runs from
     * web/index.php before the platform bootstrap has finished, so
     * OSC_DETECTED_PLATFORM_ID is not defined yet and platform::defaultId()
     * throws because the DB connection is not open. That is the same reason
     * isReactRequest() derives the base path from the filesystem instead of
     * OSC_DETECTED_BASE_URL. Platform name and store name are therefore left
     * empty here; React reads them from /api/storefront/dashboard, which is
     * platform-scoped already and becomes correct per channel in A7.
     *
     * JSON is encoded with JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT
     * so a value coming from the database cannot close the <script> tag early.
     *
     * @return string
     */
    protected static function injectConfig($html)
    {
        $base = rtrim(str_replace('\\', '/', self::installBasePath()), '/');
        $current = rtrim(str_replace('\\', '/', self::requestPath()), '/');

        $relative = self::relativeChannelPath($base, $current);

        // catalogBase is the absolute web path the app is served from, NOT a
        // path relative to the install root. routerBasename is built from it,
        // and in production the store sits under the install folder
        // (/osc414), so a relative "/" would produce a blank page.
        $catalogBase = $base . $relative;

        if ($catalogBase === '') {
            $catalogBase = '/';
        }

        // installBase is the store root WITHOUT the channel segment, so it is
        // /osc414 both on the main store and on /furniture. React needs it for
        // cross-channel links: building those from catalogBase would give
        // /osc414/furniture/furniture when the banner links to the furniture
        // channel while already serving it.
        $config = [
            'platformId' => self::detectedPlatformId(),
            'platformName' => '',
            'catalogBase' => $catalogBase,
            'apiBase' => rtrim($catalogBase, '/') . '/api',
            'installBase' => $base === '' ? '/' : $base,
            'storeName' => '',
            // Catatan: token CSRF sengaja TIDAK disertakan di sini. Shell ini
            // echoing HTML sebelum $application->run(), sehingga token dari
            // getCsrfToken() tidak konsisten dengan cookie _csrf yang dibaca
            // Request pada POST berikutnya, dan setiap POST React ditolak
            // "The form is expired". Ambil token dari /api/cart/csrf, yang
            // berjalan di lifecycle Yii normal.
            'csrfToken' => '',
        ];

        $json = json_encode(
            $config,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        );

        $tag = '<script>window.__OSC_STOREFRONT__=' . $json . ';</script>';

        // Insert before </head>, otherwise before <body>, otherwise prepend.
        if (stripos($html, '</head>') !== false) {
            return preg_replace('/<\/head>/i', $tag . '</head>', $html, 1);
        }

        if (stripos($html, '<body') !== false) {
            return preg_replace('/<body([^>]*)>/i', '<body$1>' . $tag, $html, 1);
        }

        return $tag . $html;
    }

    /**
     * Channel segment below the install base, with a leading slash.
     *
     * Returns '' for the main store, '/furniture' for the furniture channel.
     * Case is preserved because the result is used to build URLs, while the
     * comparison against the base is case-insensitive to match
     * normalizePath().
     *
     * Leading segments that name a React route are dropped. /osc414/product-
     * detail is the main store plus the detail route, so the app base is
     * /osc414 - not /osc414/product-detail. Without this the shell would tell
     * React that it is mounted one level too deep and every absolute URL it
     * builds would gain a stray segment.
     *
     * For a channel URL the same rule applies one level deeper:
     * /osc414/furniture/catalog/all-products is the furniture channel plus a
     * router path, so the app base is /osc414/furniture.
     *
     * @return string
     */
    protected static function relativeChannelPath($base, $current)
    {
        if ($current === '') {
            return '';
        }

        if ($base === '') {
            $segments = explode('/', trim($current, '/'));
        } elseif (strcasecmp($current, $base) === 0) {
            return '';
        } elseif (stripos($current, $base . '/') === 0) {
            $segments = explode('/', trim(substr($current, strlen($base) + 1), '/'));
        } else {
            return '';
        }

        while ($segments !== [] && in_array(strtolower($segments[0]), self::$reactPaths, true)) {
            array_shift($segments);
        }

        // Sisakan hanya segmen kanal. /osc414/furniture/catalog/all-products
        // dimount di /osc414/furniture; "catalog/all-products" adalah path
        // router, bukan bagian dari base. Tanpa pemotongan ini React mengira
        // ia dimount satu level terlalu dalam dan setiap URL absolut yang
        // dibuatnya mendapat segmen liar.
        if ($segments !== [] && in_array(strtolower($segments[0]), self::$channelPaths, true)) {
            $segments = [$segments[0]];
        }

        return $segments === [] ? '' : '/' . implode('/', $segments);
    }

    /**
     * Platform of the current request, without touching the database.
     *
     * Returns 0 when the platform bootstrap has not run yet. storefrontConfig
     * in React treats 0 as "unknown" and falls back, and the dashboard API
     * corrects it once the app is running.
     *
     * @return int
     */
    protected static function detectedPlatformId()
    {
        foreach (['OSC_DETECTED_PLATFORM_ID', 'PLATFORM_ID'] as $constant) {
            if (defined($constant) && (int)constant($constant) > 0) {
                return (int)constant($constant);
            }
        }

        return 0;
    }

    /**
     * Path of the current request, query string excluded.
     */
    protected static function requestPath()
    {
        return (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    }

    /**
     * URL path of the install root, derived from where this file sits on
     * disk relative to DOCUMENT_ROOT.
     *
     * lib/frontend/web/react/ReactShell.php -> up four levels is the install
     * root. Comparing it with DOCUMENT_ROOT gives the subfolder the store is
     * mounted on, for example "/osc414" in
     * C:\xampp\htdocs\osc414 served from C:\xampp\htdocs.
     */
    protected static function installBasePath()
    {
        $installRoot = rtrim(str_replace('\\', '/', dirname(__DIR__, 4)), '/');
        $documentRoot = rtrim(str_replace('\\', '/', (string)($_SERVER['DOCUMENT_ROOT'] ?? '')), '/');

        if ($documentRoot === '' || $documentRoot === $installRoot) {
            return '/';
        }

        if (stripos($installRoot . '/', $documentRoot . '/') !== 0) {
            // Store lives outside DOCUMENT_ROOT, which is not a layout this
            // heuristic can reason about. Fall back to the site root.
            return '/';
        }

        $base = substr($installRoot, strlen($documentRoot));

        return $base === '' ? '/' : $base;
    }

    /**
     * Collapses the differences that must not affect the comparison: a
     * missing leading slash, a missing trailing slash, and letter case.
     */
    protected static function normalizePath($path)
    {
        $path = '/' . ltrim((string)$path, '/');

        if (substr($path, -1) !== '/') {
            $path .= '/';
        }

        return strtolower($path);
    }
}