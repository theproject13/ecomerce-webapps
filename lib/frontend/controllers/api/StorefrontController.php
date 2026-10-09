<?php

namespace frontend\controllers\api;

use common\classes\Images;
use common\classes\platform;
use common\helpers\Currencies;
use common\helpers\Product as ProductHelper;
use common\models\Categories;
use common\models\CategoriesDescription;
use common\models\Featured;
use common\models\Platforms;
use common\models\PlatformsProducts;
use common\models\Products;
use common\models\ProductsDescription;
use Yii;
use yii\web\Response;

class StorefrontController extends BaseApiController
{
    /**
     * Platform yang sedang dilayani.
     *
     * Semua scoping di controller ini memakai currentId(), bukan defaultId().
     * defaultId() selalu mengembalikan platform dengan is_default=1, yaitu 1,
     * sehingga request ke /furniture akan dijawab dengan produk dan nama toko
     * utama. currentId() membaca platform dari request yang sedang berjalan,
     * yang sudah dideteksi includes/configure.php (PLATFORM_ID).
     *
     * @return int
     */
    private function platformId()
    {
        return (int)platform::currentId();
    }

    public function actionDashboard()
    {
        $featured = $this->featuredItems($this->intParam('featured_limit', 8, 1, 24));
        $channels = $this->channelItems();

        return [
            'items' => [
                'channels' => $channels,
                'featured' => $featured['items'],
            ],
            'meta' => [
                'platform_id' => $this->platformId(),
                'store_name' => $this->storeName(),
                'currency' => Currencies::systemCurrencyCode(),
                'channel_count' => count($channels),
                'featured_count' => $featured['total_count'],
            ],
            'error' => null,
        ];
    }

    /**
     * Status login untuk header React.
     *
     * Endpoint ini hanya membaca session PHP yang sudah ada, tidak mengubah
     * apa pun, jadi aman dipanggil tanpa CSRF token. Yang dikembalikan hanya
     * nama tampilan: email dan nomor telepon sengaja tidak dibocorkan ke
     * frontend publik.
     */
    public function actionSession()
    {
        $isGuest = Yii::$app->user->isGuest;
        $identity = $isGuest ? null : Yii::$app->user->identity;

        $firstName = $identity !== null && isset($identity->customers_firstname)
            ? trim((string)$identity->customers_firstname)
            : '';
        $lastName = $identity !== null && isset($identity->customers_lastname)
            ? trim((string)$identity->customers_lastname)
            : '';

        $displayName = trim($firstName . ' ' . $lastName);
        $initial = $firstName === '' ? '' : mb_strtoupper(mb_substr($firstName, 0, 1));

        return [
            'items' => [
                'logged_in' => !$isGuest,
                'display_name' => $displayName,
                'initial' => $initial,
            ],
            'meta' => [
                'platform_id' => $this->platformId(),
            ],
            'error' => null,
        ];
    }

    private function storeName()
    {
        $platform = Platforms::find()
            ->select(['platform_name'])
            ->where(['platform_id' => $this->platformId()])
            ->scalar();

        return $platform !== null && $platform !== false ? (string)$platform : '';
    }

    public function actionChannels()
    {
        return [
            'items' => $this->channelItems(),
            'meta' => ['platform_id' => $this->platformId()],
            'error' => null,
        ];
    }

    public function actionFeatured()
    {
        $result = $this->featuredItems($this->intParam('limit', 8, 1, 48));

        return [
            'items' => $result['items'],
            'meta' => [
                'total_count' => $result['total_count'],
                'limit' => $result['limit'],
                'currency' => Currencies::systemCurrencyCode(),
            ],
            'error' => null,
        ];
    }

    /**
     * Daftar produk kanal untuk halaman katalog, read-only.
     *
     * Inilah yang membedakan katalog dari homepage: homepage hanya menampilkan
     * produk featured, sedangkan katalog menampilkan seluruh keanggotaan kanal
     * dari platforms_products. Tanpa endpoint ini, /furniture/catalog akan
     * selalu menampilkan enam produk featured yang sama dengan homepage.
     *
     * platform_id TIDAK pernah diterima dari klien. Scoping diambil dari
     * platform::currentId() supaya satu endpoint aman dipakai dari toko utama
     * maupun kanal; kalau platform_id dikirim dari browser, shopper bisa
     * meminta produk kanal lain hanya dengan mengubah query string.
     *
     * Query hanya mengembalikan daftar products_id. Harga, stok, nama, dan
     * gambar diambil lewat container resmi per produk supaya hasilnya sama
     * dengan halaman detail (lihat actionProducts() di ProductController),
     * bukan kolom mentah products.
     *
     * Bentuk response mengikuti actionFeatured(): {items, meta, error}.
     */
    public function actionProducts()
    {
        $page = $this->intParam('page', 1, 1, 500);
        $perPage = $this->intParam('per_page', 12, 4, 24);
        $scope = $this->scopeParam();
        $keyword = $this->keywordParam();
        $categoryId = (int)Yii::$app->request->get('category_id', 0);

        if ($categoryId < 0) {
            $categoryId = 0;
        }

        $platformId = $this->platformId();
        $languagesId = (int)Yii::$app->settings->get('languages_id');

        // Dua join wajib, dengan alasan yang sama seperti featuredItems():
        //
        //  1. platforms_products   - keanggotaan kanal. Tanpa ini semua produk
        //     toko utama bocor ke katalog kanal.
        //  2. products_description - nama dan ringkasan milik platform ini.
        //
        //products_status=1 supaya produk nonaktif tidak bisa dibuka lewat
        // katalog walaupun masih punya deskripsi di platform ini.
        $query = Products::find()
            ->alias('product')
            ->innerJoin(
                ['platform_product' => PlatformsProducts::tableName()],
                'platform_product.products_id = product.products_id'
                . ' AND platform_product.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->innerJoin(
                ['description' => ProductsDescription::tableName()],
                'description.products_id = product.products_id'
                . ' AND description.language_id = :languages_id'
                . ' AND description.platform_id = :platform_id',
                [':languages_id' => $languagesId, ':platform_id' => $platformId]
            )
            ->where(['product.products_status' => 1]);

        if ($scope === 'featured') {
            // Subquery, bukan join langsung ke tabel featured: FeaturedQuery
            // ::active() tetap dipakai sesuai docs/README.md, dan satu produk
            // tidak bisa menggandakan baris hasil.
            $query->andWhere([
                'product.products_id' => Featured::find()->active()->select('products_id'),
            ]);
        }

        if ($categoryId > 0) {
            $query->innerJoin(
                ['product_category' => $this->productsToCategoriesTable()],
                'product_category.products_id = product.products_id'
                . ' AND product_category.categories_id = :category_id',
                [':category_id' => $categoryId]
            );
        }

        if ($keyword !== '') {
            // Beding LIKE di-bind sebagai parameter PDO. Nilai dari klien
            // tidak pernah disambung ke SQL.
            $query->andWhere([
                'or',
                ['like', 'description.products_name', $keyword],
                ['like', 'product.products_model', $keyword],
            ]);
        }

        // DISTINCT dipakai karena join kategori bisa menggandakan baris bila
        // satu produk punya lebih dari satu relasi ke kategori yang sama.
        $totalCount = (int)$query->count('DISTINCT product.products_id');

        [$sort, $orderBy] = $this->sortParam();

        $ids = $query
            ->select('product.products_id')
            ->orderBy($orderBy)
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->column();

        return [
            'items' => $this->productCards($ids),
            'meta' => [
                'platform_id' => $platformId,
                'platform_name' => $this->storeName(),
                'currency' => Currencies::systemCurrencyCode(),
                'total_count' => $totalCount,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => (int)max(1, (int)ceil($totalCount / $perPage)),
                'sort' => $sort,
                'scope' => $scope,
                'keywords' => $keyword,
                'category_id' => $categoryId > 0 ? $categoryId : null,
            ],
            'error' => null,
        ];
    }

    /**
     * Kategori yang punya produk di kanal ini, read-only.
     *
     * Endpoint bawaan /api/catalog/categories sengaja tidak diubah: bentuk
     * responsnya dipakai konsumen lama dan tidak menyertakan nama kategori.
     * Dropdown filter di katalog React membutuhkan nama dan jumlah produk per
     * kanal, jadi keduanya dihitung di sini.
     *
     * categories_description tidak punya kolom platform_id, jadi nama kategori
     * memang global. Yang di-scope per kanal hanya produknya.
     */
    public function actionCategories()
    {
        $platformId = $this->platformId();
        $languagesId = (int)Yii::$app->settings->get('languages_id');

        $rows = Categories::find()
            ->alias('category')
            ->innerJoin(
                ['description' => CategoriesDescription::tableName()],
                'description.categories_id = category.categories_id'
                . ' AND description.language_id = :languages_id',
                [':languages_id' => $languagesId]
            )
            ->innerJoin(
                ['product_category' => $this->productsToCategoriesTable()],
                'product_category.categories_id = category.categories_id'
            )
            ->innerJoin(
                ['platform_product' => PlatformsProducts::tableName()],
                'platform_product.products_id = product_category.products_id'
                . ' AND platform_product.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->innerJoin(
                ['product' => Products::tableName()],
                'product.products_id = product_category.products_id AND product.products_status = 1'
            )
            ->select([
                'category_id' => 'category.categories_id',
                'parent_id' => 'category.parent_id',
                'name' => 'description.categories_name',
                'sort_order' => 'category.sort_order',
                'product_count' => 'COUNT(DISTINCT product.products_id)',
            ])
            ->where(['category.categories_status' => 1])
            ->groupBy([
                'category.categories_id',
                'category.parent_id',
                'description.categories_name',
                'category.sort_order',
            ])
            ->orderBy(['category.sort_order' => SORT_ASC, 'category.categories_id' => SORT_ASC])
            ->asArray()
            ->all();

        $items = [];
        foreach ($rows as $row) {
            $categoryId = (int)$row['category_id'];

            $items[] = [
                'category_id' => $categoryId,
                'parent_id' => (int)$row['parent_id'],
                'name' => (string)$row['name'],
                'product_count' => (int)$row['product_count'],
                'url' => $this->categoryUrl($categoryId),
            ];
        }

        return [
            'items' => $items,
            'meta' => [
                'platform_id' => $platformId,
                'currency' => Currencies::systemCurrencyCode(),
                'total_count' => count($items),
            ],
            'error' => null,
        ];
    }

    /**
     * URL kategori kanonis, sama dengan yang dipakai ProductController.
     *
     * createAbsoluteUrl(), bukan createUrl(): storefront mengirim URL absolut
     * supaya frontend tidak menambahkan prefix base lagi. Kategori SEO ini
     * sengaja tetap dilayani tema PHP, halaman React memakai filter
     * category_id, bukan URL kategori.
     */
    private function categoryUrl($categoryId)
    {
        if (!function_exists('tep_href_link')) {
            return null;
        }

        $url = Yii::$app->urlManager->createAbsoluteUrl([
            'catalog',
            'cPath' => (int)$categoryId,
        ]);

        return $url === '' ? null : (string)$url;
    }

    /**
     * Membangun kartu produk untuk hasil katalog.
     *
     * Produk yang gagal dimuat (mis. berubah status antara query dan
     * pemrosesan) dilewati diam-diam supaya meta.total_count tetap boleh lebih
     * besar dari jumlah item pada halaman terakhir.
     */
    private function productCards($productsIds)
    {
        $items = [];

        foreach ((array)$productsIds as $productsId) {
            $card = $this->productCard((int)$productsId);
            if ($card !== null) {
                $items[] = $card;
            }
        }

        return $items;
    }

    /**
     * Satu kartu produk, dengan field yang sama seperti actionFeatured() supaya
     * komponen React bisa memakai satu tipe Product untuk homepage dan katalog.
     *
     * Sumber data bukan kolom products mentah:
     *  - nama/ringkasan: ProductsContainer, yang memakai relasi
     *    listingDescription (platform::currentId() diutamakan).
     *  - harga: Product::getPiceDetails(), helper yang sama dengan detail.
     *  - stok: Product::get_products_stock(), bukan products_quantity.
     *  - gambar: products_images lewat Images::getImageList(). Kolom lama
     *    products.products_image kosong di instalasi ini, jadi membacanya
     *    selalu menghasilkan placeholder.
     */
    private function productCard($productsId)
    {
        if ($productsId <= 0) {
            return null;
        }

        $products = Yii::$container->get('products');
        $product = $products->loadProducts(['products_id' => $productsId])->getProduct($productsId);

        if ($product === false || !isset($product['products_id'])) {
            return null;
        }

        if ((int)$product['products_status'] !== 1) {
            return null;
        }

        $price = $this->cardPrice($product);
        $quantity = (int)ProductHelper::get_products_stock($productsId);

        return [
            'products_id' => $productsId,
            'name' => (string)($product['products_name'] ?? ''),
            'summary' => (string)($product['products_description_short'] ?? ''),
            'model' => (string)($product['products_model'] ?? ''),
            'price' => $price['price'],
            'list_price' => $price['list_price'],
            'quantity' => $quantity,
            'in_stock' => $quantity > 0,
            'image' => $this->cardImage($productsId),
            'url' => $this->productUrl($productsId),
        ];
    }

    /**
     * Harga final dan harga coret untuk satu produk featured.
     *
     * featuredItems() awalnya membaca kolom products_price langsung dari query,
     * padahal kolom itu tersimpan dalam mata uang dasar (GBP). Supaya homepage
     * konsisten dengan katalog dan detail, produk dimuat lewat container lalu
     * dihitung dengan cardPrice() yang sama, sehingga sesi IDR ikut terpakai.
     */
    private function featuredPrice($productsId)
    {
        $products = Yii::$container->get('products');
        $product = $products->loadProducts(['products_id' => (int)$productsId])->getProduct((int)$productsId);

        if ($product === false || !isset($product['products_id'])) {
            return ['price' => 0.0, 'list_price' => null];
        }

        return $this->cardPrice($product);
    }

    /**
     * Harga final dan harga coret untuk kartu katalog.
     *
     * Logikanya sama dengan ProductController::priceInfo(): jsonPrice adalah
     * harga yang harus dibayar, dan harga coret hanya ada kalau produk sedang
     * punya harga khusus.
     */
    private function cardPrice($product)
    {
        $details = ProductHelper::getPiceDetails(
            $product,
            1,
            (int)Yii::$app->storage->get('customer_groups_id')
        );

        $hasSpecial = !empty($details['special_value']);
        $listPrice = null;

        if ($hasSpecial) {
            $currencies = Yii::$container->get('currencies');
            $listPrice = round((float)$currencies->display_price_clear(
                $product['products_price'],
                $product['tax_rate'],
                1
            ), 2);
        }

        return [
            'price' => isset($details['jsonPrice']) ? round((float)$details['jsonPrice'], 2) : 0.0,
            'list_price' => $listPrice,
        ];
    }

    /**
     * Gambar utama dari products_images.
     *
     * Bentuk url dipakai apa adanya, sama seperti ProductGallery di halaman
     * detail, supaya frontend cukup meneruskan ke <img src>.
     */
    private function cardImage($productsId)
    {
        $list = Images::getImageList($productsId, -1, false, true);

        if (!is_array($list)) {
            return null;
        }

        foreach ($list as $entry) {
            if (!isset($entry['image']) || !is_array($entry['image'])) {
                continue;
            }

            $main = $entry['image']['Large']['url'] ?? ($entry['image']['Medium']['url'] ?? null);

            if (!empty($main)) {
                return (string)$main;
            }
        }

        return null;
    }

    /**
     * Hanya dua scope yang boleh: semua produk kanal, atau produk featured.
     *
     * Nilai lain jatuh ke 'all' supaya parameter rusak tidak membuat katalog
     * kosong tanpa penjelasan.
     */
    private function scopeParam()
    {
        $scope = strtolower(trim((string)Yii::$app->request->get('scope', 'all')));

        return $scope === 'featured' ? 'featured' : 'all';
    }

    /**
     * Urutan hasil. Allowlist, bukan string yang diteruskan ke ORDER BY.
     *
     * Perhatikan: pengurutan harga memakai kolom products_price, sedangkan nilai
     * yang ditampilkan memakai harga hasil domain. Untuk produk yang sedang
     * diskon, posisinya bisa tidak persis sama dengan urutan harga yang
     * terlihat, karena tidak ada kolom harga final yang bisa diurutkan.
     */
    private function sortParam()
    {
        $sort = strtolower(trim((string)Yii::$app->request->get('sort', 'newest')));

        $allowed = [
            'newest' => ['product.products_date_added' => SORT_DESC, 'product.products_id' => SORT_ASC],
            'oldest' => ['product.products_date_added' => SORT_ASC, 'product.products_id' => SORT_ASC],
            'name_asc' => ['description.products_name' => SORT_ASC, 'product.products_id' => SORT_ASC],
            'name_desc' => ['description.products_name' => SORT_DESC, 'product.products_id' => SORT_ASC],
            'price_asc' => ['product.products_price' => SORT_ASC, 'product.products_id' => SORT_ASC],
            'price_desc' => ['product.products_price' => SORT_DESC, 'product.products_id' => SORT_ASC],
        ];

        if (isset($allowed[$sort])) {
            return [$sort, $allowed[$sort]];
        }

        return ['newest', $allowed['newest']];
    }

    /**
     * Kata kunci pencarian.
     *
     * Nama parameter mengikuti tema PHP (`keywords`), dan `q` diterima sebagai
     * alias supaya form di React tidak perlu tahu nama lama. Tag HTML dibuang
     * supaya tidak ada markup yang tersimpan di session atau log.
     */
    private function keywordParam()
    {
        $keyword = Yii::$app->request->get('keywords', Yii::$app->request->get('q', ''));

        if (is_array($keyword)) {
            return '';
        }

        $keyword = trim(strip_tags((string)$keyword));

        if ($keyword === '') {
            return '';
        }

        return mb_substr($keyword, 0, 100);
    }

    /**
     * products_to_categories tidak punya ActiveRecord di model ini, jadi nama
     * tabelnya diambil dari konstanta global yang sama dipakai tema PHP.
     */
    private function productsToCategoriesTable()
    {
        return defined('TABLE_PRODUCTS_TO_CATEGORIES') ? TABLE_PRODUCTS_TO_CATEGORIES : 'products_to_categories';
    }

    private function channelItems()
    {
        // Kanal yang ditampilkan adalah semua platform selain yang sedang
        // dilayani. Platform yang sedang dilayani tidak boleh masuk daftar itu,
        // kalau tidak switcher akan menautkan kanal ke dirinya sendiri.
        //
        // Karena itu filternya '<>', bukan "platform_id > 1". Platform 1 adalah
        // toko utama: ketika request datang dari /furniture, toko utama justru
        // harus muncul sebagai kanal lain yang bisa dipilih.
        $currentId = $this->platformId();

        $platforms = Platforms::find()
            ->select([
                'platform_id',
                'platform_name',
                'platform_url',
                'logo',
                'sort_order',
            ])
            ->where(['status' => 1])
            ->andWhere(['<>', 'platform_id', $currentId])
            ->andWhere(['not', ['platform_url' => '']])
            ->andWhere(['not', ['platform_url' => null]])
            ->orderBy(['sort_order' => SORT_ASC, 'platform_id' => SORT_ASC])
            ->asArray()
            ->all();

        $items = [];
        foreach ($platforms as $row) {
            $items[] = [
                'platform_id' => (int)$row['platform_id'],
                'name' => (string)$row['platform_name'],
                'url' => $this->platformUrl($row['platform_url']),
                'logo' => $this->imageUrl($row['logo']),
            ];
        }

        return $items;
    }

    private function platformUrl($platformUrl)
    {
        $platformUrl = trim((string)$platformUrl);
        if ($platformUrl === '') {
            return null;
        }

        $scheme = Yii::$app->request->getIsSecureConnection() ? 'https' : 'http';
        if (preg_match('#^https?://#i', $platformUrl)) {
            return rtrim($platformUrl, '/') . '/';
        }

        return $scheme . '://' . trim($platformUrl, '/') . '/';
    }

    private function featuredItems($limit)
    {
        $languagesId = (int)Yii::$app->settings->get('languages_id');
        $platformId = $this->platformId();

        // Featured harus dua kali di-scope ke platform:
        //
        //  1. products_description.platform_id - nama dan ringkasan adalah data
        //     per platform. Tanpa ini, kanal menampilkan deskripsi yang ditulis
        //     untuk toko utama.
        //  2. platforms_products - keanggotaan kanal. Featured hanya berisi id
        //     produk, jadi tanpa join ini semua produk featured toko utama akan
        //     bocor ke setiap kanal meskipun deskripsi platform 7 tidak ada.
        //
        // (1) saja tidak cukup dan (2) saja tidak cukup: produk bisa punya
        // deskripsi platform 7 tanpa pernah di-attach ke platform 7.
        $query = Featured::find()
            ->active()
            ->alias('featured')
            ->innerJoin(['product' => Products::tableName()], 'product.products_id = featured.products_id')
            ->innerJoin(
                ['platform_product' => PlatformsProducts::tableName()],
                'platform_product.products_id = featured.products_id'
                . ' AND platform_product.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->innerJoin(
                ['description' => ProductsDescription::tableName()],
                'description.products_id = featured.products_id'
                . ' AND description.language_id = :languages_id'
                . ' AND description.platform_id = :platform_id',
                [':languages_id' => $languagesId, ':platform_id' => $platformId]
            )
            ->select([
                'products_id' => 'product.products_id',
                'name' => 'description.products_name',
                'summary' => 'description.products_description_short',
                'model' => 'product.products_model',
                'price' => 'product.products_price',
                'quantity' => 'product.products_quantity',
                'image' => 'product.products_image',
            ])
            ->where(['product.products_status' => 1])
            ->orderBy(['featured.sort_order' => SORT_ASC, 'featured.featured_date_added' => SORT_ASC])
            ->limit($limit);

        $totalCount = (int)Featured::find()
            ->active()
            ->innerJoin(
                ['platform_product' => PlatformsProducts::tableName()],
                'platform_product.products_id = ' . Featured::tableName() . '.products_id'
                . ' AND platform_product.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->count();

        $rows = $query->asArray()->all();

        $items = [];
        foreach ($rows as $row) {
            $productId = (int)$row['products_id'];
            $summary = trim((string)$row['summary']);
            if ($summary === '') {
                $summary = '';
            }

            // Harga featured diambil lewat jalur yang sama dengan kartu katalog
            // (lihat cardPrice()), bukan kolom products_price mentah. Kolom itu
            // tersimpan dalam mata uang dasar (GBP), sehingga homepage sempat
            // menampilkan harga GBP walau sesi sudah IDR.
            $price = $this->featuredPrice($productId);

            $items[] = [
                'products_id' => $productId,
                'name' => (string)$row['name'],
                'summary' => $summary,
                'model' => (string)$row['model'],
                'price' => $price['price'],
                'list_price' => $price['list_price'],
                'quantity' => (int)$row['quantity'],
                'in_stock' => ((int)$row['quantity'] > 0),
                'image' => $this->imageUrl($row['image']),
                'url' => $this->productUrl($productId),
            ];
        }

        return [
            'items' => $items,
            'total_count' => $totalCount,
            'limit' => $limit,
        ];
    }

    private function imageUrl($image)
    {
        $image = trim((string)$image);
        if ($image === '' || $image === '0') {
            return null;
        }

        if (!is_file(DIR_FS_CATALOG . DIR_WS_IMAGES . $image)) {
            return null;
        }

        return DIR_WS_IMAGES . $image;
    }

    private function productUrl($productsId)
    {
        if (!function_exists('tep_href_link')) {
            return null;
        }

        return tep_href_link(
            FILENAME_PRODUCT_INFO,
            'products_id=' . (int)$productsId,
            'NONSSL'
        );
    }

    private function intParam($name, $default, $min, $max)
    {
        $value = (int)Yii::$app->request->get($name, $default);
        if ($value < $min || $value > $max) {
            return $default;
        }

        return $value;
    }
}