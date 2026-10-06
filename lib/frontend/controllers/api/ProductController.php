<?php

namespace frontend\controllers\api;

use common\classes\Images;
use common\classes\StockIndication;
use common\helpers\Categories;
use common\helpers\Product as ProductHelper;
use common\helpers\Properties as PropertiesHelper;
use Yii;
use yii\web\NotFoundHttpException;

/**
 * Endpoint detail produk, read-only.
 *
 * Bentuk response mengikuti api/StorefrontController.php: {items, meta, error}.
 * Tidak ada operasi tulis di kelas ini, jadi tidak ada CSRF yang perlu
 * divalidasi dan tidak ada state yang berubah.
 *
 * Semua harga, stok, dan status kelayakan diambil dari lapisan domain yang
 * sama dengan tema PHP (ProductsContainer + Product::getPiceDetails), bukan
 * dari kolom mentah `products`. Alasannya `products_price` disimpan dalam
 * mata uang dasar dan baru dikonversi ke mata uang tampilan ketika
 * Product::get_products_price() berjalan. Membaca kolom itu langsung
 * menghasilkan angka yang salah.factor.
 *
 * Cakupan sengaja hanya yang datanya benar-benar ada. Lihat catatan di
 * docs/README.md: reviews, products_attributes, products_xsell, dan wishlist
 * kosong di database, jadi tidak dikembalikan di sini.
 */
class ProductController extends BaseApiController
{
    /**
     * Tipe gambar untuk galeri. Both names harus exist di tabel image_types.
     */
    const IMAGE_MAIN = 'Large';
    const IMAGE_THUMB = 'Small';

    /**
     * @param int|string $id products_id
     * @return array
     * @throws NotFoundHttpException
     */
    public function actionDetail($id)
    {
        $productsId = (int)$id;
        if ($productsId <= 0) {
            throw new NotFoundHttpException('Produk tidak ditemukan.');
        }

        $product = $this->loadProduct($productsId);
        if ($product === null) {
            throw new NotFoundHttpException('Produk tidak ditemukan.');
        }

        $stock = $this->stockInfo($productsId);
        $price = $this->priceInfo($product);

        return [
            'items' => [
                'products_id' => $productsId,
                'name' => (string)($product['products_name'] ?? ''),
                'model' => (string)($product['products_model'] ?? ''),
                'summary' => (string)($product['products_description_short'] ?? ''),
                'description' => (string)($product['products_description'] ?? ''),
                'url' => $this->productUrl($productsId),
                'price' => $price,
                'stock' => $stock,
                'images' => $this->gallery($productsId),
                'specifications' => $this->specifications($productsId),
                'category' => $this->category($productsId),
                'breadcrumb' => $this->breadcrumb($productsId),
                'identifiers' => $this->identifiers($product),
                'manufacturer' => $this->manufacturer($product),
            ],
            'meta' => [
                // currentId(), bukan defaultId(): nilai ini harus menyatakan
                // kanal mana yang melayani request. defaultId() selalu 1, jadi
                // /furniture/product-detail akan melaporkan platform 1
                // walaupun produknya diambil dari container platform 7.
                'platform_id' => (int)\common\classes\platform::currentId(),
                'currency' => \common\helpers\Currencies::systemCurrencyCode(),
            ],
            'error' => null,
        ];
    }

    /**
     * Muat produk lewat container resmi supaya harga sudah dalam mata uang
     * tampilan dan deskripsi sudah mengikuti bahasa/platform aktif.
     *
     * @return \common\components\ProductItem|false
     */
    protected function loadProduct($productsId)
    {
        $products = Yii::$container->get('products');
        $product = $products->loadProducts(['products_id' => $productsId])->getProduct($productsId);

        if ($product === false || !isset($product['products_id'])) {
            return null;
        }

        // Produk nonaktif harus dianggap sama seperti tidak ada, bukan
        // seperti produk yang sedang offline.
        if ((int)$product['products_status'] !== 1) {
            return null;
        }

        return $product;
    }

    /**
     * Harga dari Product::getPiceDetails(), helper yang sama dipakai
     * frontend/design/boxes/product/Price.php.
     *
     * Yang dikirim hanya angka, bukan string hasil display_price(). Nilai
     * string itu sudah berupa HTML microdata schema.org
     * (<span itemprop="price" ...>), yang tidak ada gunanya di React dan
     * berisiko masuk ke DOM sebagai markup mentah. Formatting dan
     * pemisahan desimal diserahkan ke klien lewat formatCurrency(),
     * supaya konsisten dengan kartu produk di homepage.
     *
     * Perhatikan semantics dari core: kalau produk punya `special_price`,
     * maka `jsonPrice` adalah harga DISKON yang harus dibayar, dan harga
     * coret adalah `products_price`. `special_value` karena itu bukan harga
     * coret, melainkan harga diskon yang nilainya sudah sama dengan
     * `value`, jadi tidak dikirim.
     *
     * `value` sudah memperhitungkan pajak sesuai DISPLAY_PRICE_WITH_TAX dan
     * sudah berada di mata uang tampilan hasil core.
     */
    protected function priceInfo($product)
    {
        $details = ProductHelper::getPiceDetails(
            $product,
            1,
            (int)\Yii::$app->storage->get('customer_groups_id')
        );

        $hasSpecial = !empty($details['special_value']);

        // Harga coret hanya ada kalau sedang ada diskon. Dihitung dengan
        // Currencies::display_price_clear(), sama persis seperti yang
        // dilakukan core untuk jsonPrice.
        $oldValue = 0.0;
        if ($hasSpecial) {
            $currencies = \Yii::$container->get('currencies');
            $oldValue = round((float)$currencies->display_price_clear(
                $product['products_price'],
                $product['tax_rate'],
                1
            ), 2);
        }

        return [
            'value' => isset($details['jsonPrice']) ? round((float)$details['jsonPrice'], 2) : 0.0,
            'old_value' => $oldValue,
            'has_special' => $hasSpecial,
            'currency' => \common\helpers\Currencies::systemCurrencyCode(),
        ];
    }

    /**
     * Stok dan kelayakan menambahkan produk ke keranjang.
     *
     * Stok diambil lewat Product::get_products_stock(), bukan kolom
     * products_quantity, karena kolom itu belum memperhitungkan gudang,
     * alokasi, dan aturan extension Inventory.
     */
    protected function stockInfo($productsId)
    {
        $quantity = (int)ProductHelper::get_products_stock($productsId);

        $info = [];
        if (class_exists('\common\classes\StockIndication')) {
            $result = StockIndication::product_info([
                'products_id' => $productsId,
                'products_quantity' => $quantity,
            ]);
            if (is_array($result)) {
                $info = $result;
            }
        }

        $flags = isset($info['flags']) && is_array($info['flags']) ? $info['flags'] : [];

        return [
            'quantity' => $quantity,
            'in_stock' => $quantity > 0,
            'stock_code' => isset($info['stock_code']) ? (string)$info['stock_code'] : null,
            'can_add_to_cart' => array_key_exists('can_add_to_cart', $flags)
                ? (bool)$flags['can_add_to_cart']
                : $quantity > 0,
        ];
    }

    /**
     * Galeri dari tabel products_images, bukan kolom products.products_image.
     *
     * Kolom lama itu kosong di instalasi ini; gambar asli disimpan di
     * products_images + products_images_description. Gambar dis-serving lewat
     * Images::getImageList() supaya nama file, watermark, dan konversi webp
     * ikut aturan yang sama dengan tema PHP. Hasilnya dilayani
     * frontend/controllers/ImageController.php::actionCached().
     */
    protected function gallery($productsId)
    {
        $list = Images::getImageList($productsId, -1, false, true);
        if (!is_array($list)) {
            return [];
        }

        $items = [];
        foreach ($list as $imageId => $entry) {
            if (!isset($entry['image']) || !is_array($entry['image'])) {
                continue;
            }

            $main = $entry['image'][self::IMAGE_MAIN]['url'] ?? ($entry['image']['Medium']['url'] ?? null);
            if (empty($main)) {
                continue;
            }

            $thumb = $entry['image'][self::IMAGE_THUMB]['url'] ?? $main;

            $items[] = [
                'id' => (int)$imageId,
                'url' => $main,
                'thumb' => $thumb,
                'alt' => (string)($entry['alt'] ?? ''),
                'is_default' => !empty($entry['default']),
            ];
        }

        return $items;
    }

    /**
     * Spesifikasi produk dari tabel properties_to_properties yang punya
     * display_product = 1.
     *
     * Logika ini disalin dari frontend/design/boxes/product/Properties.php
     * supaya daftar spesifikasi React sama dengan yang tampil di tema.
     */
    protected function specifications($productsId)
    {
        $propertiesArray = [];
        $valuesArray = [];
        $extraValues = [];

        $query = tep_db_query(
            "select p.properties_id, if(p2p.values_id > 0, p2p.values_id, p2p.values_flag) as values_id, extra_value"
            . ' from ' . TABLE_PROPERTIES_TO_PRODUCTS . ' p2p'
            . ', ' . TABLE_PROPERTIES . ' p'
            . ' where p2p.properties_id = p.properties_id'
            . " and p.display_product = '1'"
            . " and p2p.products_id = '" . (int)$productsId . "'"
        );

        while ($row = tep_db_fetch_array($query)) {
            $propertyId = (int)$row['properties_id'];
            if (!in_array($propertyId, $propertiesArray, true)) {
                $propertiesArray[] = $propertyId;
            }
            $valuesArray[$propertyId][] = $row['values_id'];
            $extraValues[$propertyId][] = $row['extra_value'];
        }

        if (count($propertiesArray) === 0) {
            return [];
        }

        $tree = PropertiesHelper::generate_properties_tree(0, $propertiesArray, $valuesArray, '', '', $extraValues);
        if (!is_array($tree)) {
            return [];
        }

        $items = [];
        foreach ($tree as $property) {
            if (empty($property['properties_name'])) {
                continue;
            }

            $values = [];
            foreach ((array)($property['values'] ?? []) as $value) {
                if ($value !== '' && $value !== null) {
                    $values[] = (string)$value;
                }
            }

            if (count($values) === 0) {
                continue;
            }

            $items[] = [
                'name' => (string)$property['properties_name'],
                'values' => $values,
            ];
        }

        return $items;
    }

    /**
     * Kategori utama produk untuk label dan link.
     */
    protected function category($productsId)
    {
        $category = ProductHelper::getCategories($productsId);
        if (!is_array($category) || empty($category['categories_id'])) {
            return null;
        }

        return [
            'category_id' => (int)$category['categories_id'],
            'name' => (string)($category['categories_name'] ?? ''),
            'url' => $this->categoryUrl($category['categories_id']),
        ];
    }

    /**
     * Jalur kategori lengkap, dari induk paling atas sampai kategori utama.
     *
     * Ancestor diambil dengan Categories::get_parent_categories(), lalu URL
     * disusun dengan pola cPath yang sama seperti Categories::get302redirect().
     */
    protected function breadcrumb($productsId)
    {
        $category = ProductHelper::getCategories($productsId);
        if (!is_array($category) || empty($category['categories_id'])) {
            return [];
        }

        $ancestors = [];
        Categories::get_parent_categories($ancestors, $category['categories_id']);
        $ancestors = array_reverse((array)$ancestors);

        $trail = [];
        $path = [];
        foreach ($ancestors as $ancestorId) {
            $ancestorId = (int)$ancestorId;
            $path[] = $ancestorId;
            $trail[] = [
                'category_id' => $ancestorId,
                'name' => (string)Categories::get_categories_name($ancestorId),
                'url' => $this->categoryUrl($path),
            ];
        }

        $path[] = (int)$category['categories_id'];
        $trail[] = [
            'category_id' => (int)$category['categories_id'],
            'name' => (string)($category['categories_name'] ?? ''),
            'url' => $this->categoryUrl($path),
        ];

        return $trail;
    }

/**
 * @param array|int $path daftar categories_id
 * @return string|null
 */
    protected function categoryUrl($path)
    {
        $ids = array_map('intval', (array)$path);
        if (count($ids) === 0) {
            return null;
        }

        // createAbsoluteUrl(), bukan createUrl(). API storefront mengirim URL
        // produk dalam bentuk absolut (lihat actionDashboard()), dan
        // catalogUrl() di frontend hanya meneruskan URL absolut tanpa
        // menambahkan prefix base lagi. Kalau di sini dipakai createUrl(),
        // hasilnya root-relative seperti /osc414/epson dan frontend akan
        // menyebutnya /osc414/osc414/epson.
        $url = \Yii::$app->urlManager->createAbsoluteUrl([
            'catalog',
            'cPath' => implode('_', $ids),
        ]);

        return $url === '' ? null : (string)$url;
    }

    /**
     * Kode barcode / pengenal produk. Hanya yang terisi yang dikirim.
     */
    protected function identifiers($product)
    {
        $keys = [
            'products_ean' => 'ean',
            'products_isbn' => 'isbn',
            'products_asin' => 'asin',
            'products_upc' => 'upc',
        ];

        $items = [];
        foreach ($keys as $column => $name) {
            $value = isset($product[$column]) ? trim((string)$product[$column]) : '';
            if ($value !== '' && $value !== '0') {
                $items[$name] = $value;
            }
        }

        return $items;
    }

    /**
     * @return array|null
     */
    protected function manufacturer($product)
    {
        $id = isset($product['manufacturers_id']) ? (int)$product['manufacturers_id'] : 0;
        if ($id <= 0) {
            return null;
        }

        $name = \common\models\Manufacturers::find()
            ->select(['manufacturers_name'])
            ->where(['manufacturers_id' => $id])
            ->scalar();

        if ($name === false || $name === null || (string)$name === '') {
            return null;
        }

        return [
            'manufacturers_id' => $id,
            'name' => (string)$name,
            'url' => \Yii::$app->urlManager->createAbsoluteUrl([
                'catalog',
                'manufacturers_id' => $id,
            ]),
        ];
    }

    /**
     * URL SEO produk, sama dengan yang dipakai tema.
     */
    protected function productUrl($productsId)
    {
        if (!function_exists('tep_href_link')) {
            return null;
        }

        $url = tep_href_link(FILENAME_PRODUCT_INFO, 'products_id=' . (int)$productsId, 'NONSSL');

        return $url === '' ? null : (string)$url;
    }
}