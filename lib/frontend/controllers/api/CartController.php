<?php

namespace frontend\controllers\api;

use app\components\CartFactory;
use common\helpers\Attributes;
use common\helpers\Product as ProductHelper;
use common\helpers\Inventory;
use common\helpers\Currencies;
use common\classes\StockIndication;
use common\classes\Images;
use common\classes\platform;
use Yii;

/**
 * API keranjang untuk storefront React.
 *
 * Rutenya /api/cart/index, /api/cart/csrf, /api/cart/add, /api/cart/update,
 * dan /api/cart/remove. Bukan /api/storefront/cart/add: rule urlManager di
 * lib/frontend/config/main.php hanya punya dua segmen
 * ('api/<controller>/<action>'), jadi URL tiga segmen tidak akan sampai ke
 * action mana pun. Karena itu cart memakai controller sendiri.
 *
 * Yang tetap milik PHP: session, harga, pajak, cek stok, dan isi keranjang.
 * Endpoint ini tidak menyimpan apa pun, ia memanggil objek shopping_cart yang
 * sama dengan yang dipakai tema PHP. Yang pindah ke React hanya tampilannya.
 */
class CartController extends BaseApiController
{
    /** Batas qty per permintaan, supaya satu POST tidak memesan 9999 item. */
    const MAX_QTY = 99;

    /** Nama ukuran gambar dari Images::getImageList(), sama seperti ProductController. */
    const IMAGE_MAIN = 'Large';
    const IMAGE_THUMB = 'Small';

    /**
     * GET /api/cart/index
     *
     * Isi keranjang untuk halaman React: satu baris per item beserta harga
     * yang sudah dihitung server. Harga tidak dihitung ulang di browser;
     * subtotal pun diambil dari total keranjang, bukan dijumlahkan di frontend.
     */
    public function actionIndex()
    {
        return $this->payload();
    }

    /**
     * GET /api/cart/csrf
     *
     * Membawa token CSRF untuk POST dari React.
     *
     * Tokennya harus datang dari lifecycle Yii yang normal, bukan dari
     * ReactShell. Shell echoing HTML sebelum $application->run(), sehingga
     * getCsrfToken() di sana menghasilkan token yang tidak cocok dengan cookie
     * _csrf yang dibaca Request pada POST berikutnya, dan Yii menolak dengan
     * "The form is expired". Controller ini berjalan seperti halaman PHP biasa.
     *
     * Dipanggil saat pengguna menekan tombol, bukan saat render, supaya tidak
     * menambah request untuk pengunjung yang tidak membeli apa pun.
     */
    public function actionCsrf()
    {
        return [
            'ok' => true,
            'csrfToken' => (string)Yii::$app->request->getCsrfToken(),
        ];
    }

    /**
     * POST /api/cart/add
     *
     * Body: products_id (wajib), qty (opsional, default 1), id[] (atribut).
     *
     * Jalur ini sengaja tidak lewat query `action=add_product` milik
     * CartFactory. Parameter `action` dibaca dari $_GET, lalu
     * CartFactory::work() memanggil tep_redirect(), yang keluar dari PHP tanpa
     * return value. Endpoint JSON butuh jawaban, jadi add_cart() dipanggil
     * langsung.
     */
    public function actionAdd()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.');
        }

        $productsId = (int)Yii::$app->request->post('products_id', 0);

        if ($productsId <= 0 || !ProductHelper::check_product($productsId)) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Produk tidak tersedia.');
        }

        $qty = $this->requestedQty(1);
        $attributes = $this->requestedAttributes();

        // Produk beratribut tidak boleh masuk keranjang tanpa pilihan.
        if (Attributes::has_product_attributes($productsId)) {
            $filled = 0;
            foreach ($attributes as $value) {
                if ($value !== '' && $value !== null) {
                    $filled++;
                }
            }

            if ($filled === 0) {
                Yii::$app->response->setStatusCode(422);

                return $this->error('Pilih dulu pilihan produk sebelum ditambahkan.');
            }
        }

        // notify=false supaya pesan overweight tidak dirender sebagai halaman
        // penuh. CartFactory tetap menumpuk pesan ke message stack; React yang
        // menampilkannya sebagai umpan balik di halaman produk.
        $this->cart()->add_cart($productsId, $qty, $attributes, false);

        $payload = $this->payload();
        $payload['ok'] = true;
        $payload['added'] = ['products_id' => $productsId, 'qty' => $qty];

        return $payload;
    }

    /**
     * POST /api/cart/update
     *
     * Body: uprid (kunci baris di keranjang), qty baru.
     *
     * uprid, bukan products_id, karena satu produk bisa muncul lebih dari
     * sekali kalau atribut atau hacker bedakan barisnya. update_quantity()
     * juga hanya aman untuk uprid yang benar-benar ada di keranjang.
     */
    public function actionUpdate()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.');
        }

        $cart = $this->cart();
        $uprid = (string)Yii::$app->request->post('uprid', '');

        if ($uprid === '' || !$cart->in_cart($uprid)) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Baris keranjang tidak ditemukan.');
        }

        $qty = $this->requestedQty(1);
        $productsId = Inventory::normalize_id($uprid);

        // Cek stok dengan urutan yang sama seperti CartFactory, supaya qty yang
        // diketik React tidak bisa melewati batas stok yang sama.
        if (defined('STOCK_CHECK') && STOCK_CHECK === 'true') {
            $stockInfo = StockIndication::product_info([
                'products_id' => $productsId,
                'cart_qty' => $qty,
                'products_quantity' => ProductHelper::get_products_stock($uprid),
            ]);

            if (
                !$stockInfo['allow_out_of_stock_add_to_cart']
                && $stockInfo['max_qty'] > 0
                && $qty > $stockInfo['max_qty']
            ) {
                $qty = (int)$stockInfo['max_qty'];
            }
        }

        $cart->update_quantity($uprid, $qty);

        $payload = $this->payload();
        $payload['ok'] = true;
        $payload['updated'] = ['uprid' => $uprid, 'qty' => $qty];

        return $payload;
    }

    /**
     * POST /api/cart/remove
     *
     * Body: uprid. Sama seperti update, kuncinya uprid supaya baris dengan
     * atribut tertentu tidak ikut terhapus.
     */
    public function actionRemove()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.');
        }

        $cart = $this->cart();
        $uprid = (string)Yii::$app->request->post('uprid', '');

        if ($uprid === '' || !$cart->in_cart($uprid)) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Baris keranjang tidak ditemukan.');
        }

        $cart->remove($uprid);

        $payload = $this->payload();
        $payload['ok'] = true;
        $payload['removed'] = ['uprid' => $uprid];

        return $payload;
    }

    /**
     * Bentuk jawaban, sama untuk aksi sukses dan gagal.
     *
     * redirect.cart dan redirect.checkout dipakai frontend untuk tombol
     * "Tambah ke keranjang" dan "Beli Sekarang". URL-nya dibangun di sini
     * supaya prefix kanal ikut, karena platform 7 punya shopping-cart sendiri.
     */
    private function payload()
    {
        $cart = $this->cart();

        $items = [];
        $count = 0;

        foreach ($cart->get_products() as $line) {
            $qty = (int)ProductHelper::getVirtualItemQuantity($line['id'], $line['quantity']);
            $count += $qty;
            $productsId = (int)$line['stock_products_id'];

            $items[] = [
                'uprid' => (string)$line['id'],
                'products_id' => $productsId,
                'name' => (string)($line['name'] ?? ''),
                'image' => $this->thumb($productsId),
                'qty' => $qty,
                'price' => round((float)($line['price'] ?? 0), 2),
                'final_price' => round((float)($line['final_price'] ?? $line['price'] ?? 0), 2),
            ];
        }

        $reported = (int)$cart->count_contents();

        return [
            'ok' => false,
            'items' => $items,
            'meta' => [
                'platform_id' => (int)platform::currentId(),
                'currency' => (string)Currencies::systemCurrencyCode(),
                'count' => $count > 0 ? $count : $reported,
                'is_empty' => count($items) === 0,
            ],
            'redirect' => [
                'cart' => rtrim((string)Yii::$app->urlManager->createUrl(['shopping-cart']), '/'),
                'checkout' => rtrim((string)Yii::$app->urlManager->createUrl(['checkout']), '/'),
            ],
            'error' => null,
        ];
    }

    /**
     * Thumbnail produk untuk baris keranjang.
     *
     * Kolom products_image kosong di instalasi ini, jadi gambar diambil dari
     * products_images lewat Images::getImageList() dengan aturan yang sama
     * seperti ProductController::gallery(). Kalau produk tidak punya gambar,
     * React yang menggambar placeholder, jadi di sini cukup string kosong.
     */
    private function thumb($productsId)
    {
        $list = Images::getImageList($productsId, -1, false, true);

        if (!is_array($list)) {
            return '';
        }

        foreach ($list as $entry) {
            if (!isset($entry['image']) || !is_array($entry['image'])) {
                continue;
            }

            return (string)($entry['image'][self::IMAGE_THUMB]['url'] ?? $entry['image'][self::IMAGE_MAIN]['url'] ?? '');
        }

        return '';
    }

    /** Bentuk jawaban gagal dengan bentuk yang sama seperti sukses. */
    private function error($message)
    {
        $payload = $this->payload();
        $payload['error'] = $message;

        return $payload;
    }

    /**
     * Qty dari request, dijepit ke 1..MAX_QTY.
     *
     * Batas atas ditegakkan di server supaya angka yang dikirim React tidak
     * dipercaya apa adanya.
     */
    private function requestedQty($default)
    {
        $qty = (int)Yii::$app->request->post('qty', $default);

        if ($qty < 1) {
            $qty = 1;
        }
        if ($qty > self::MAX_QTY) {
            $qty = self::MAX_QTY;
        }

        return $qty;
    }

    /** Pilihan atribut dari request, selalu dalam bentuk array. */
    private function requestedAttributes()
    {
        $attributes = Yii::$app->request->post('id', []);

        return is_array($attributes) ? $attributes : [];
    }

    /**
     * Objek keranjang dari session.
     *
     * CartFactory::work() sudah menjalankan initCart() untuk setiap controller
     * yang extends Sceleton, termasuk API ini. Pemanggilan ulang di sini
     * hanya penjaga supaya action tidak bergantung pada urutan itu.
     */
    private function cart()
    {
        CartFactory::initCart();

        return $GLOBALS['cart'];
    }
}
