<?php

namespace frontend\controllers\api;

use common\models\Categories;
use common\models\CategoriesDescription;
use Yii;
use yii\db\Expression;

/**
 * API top-up untuk widget "Top Up & Tagihan" di homepage React.
 *
 * Rute: GET /api/topup/csrf, POST /api/topup/submit.
 *
 * Sama seperti CartController: CSRF tetap aktif (diwarisi dari Sceleton, tidak
 * pernah dimatikan). Token diambil lewat actionCsrf() yang berjalan di
 * lifecycle Yii normal, bukan dari ReactShell, supaya token dan cookie _csrf
 * berasal dari request yang sama.
 *
 * Data disimpan ke tabel topup_orders (lihat docs/README.md sec. 3). Transaksi
 * sengaja tidak masuk ke tabel orders: top-up bukan pengiriman barang, dan
 * aturan proyek melarang menambah kolom pada skema order yang ada.
 */
class TopupController extends BaseApiController
{
    /** Panjang maksimum nama layanan, sama dengan kolom topup_orders.service. */
    const MAX_SERVICE_LENGTH = 64;

    /** Panjang maksimum nomor telepon, sama dengan kolom phone_number. */
    const MAX_PHONE_LENGTH = 32;

    /** Nominal terbesar yang diterima (rupiah), penjaga salah input. */
    const MAX_AMOUNT = 10000000;

    /** Nominal terkecil yang masuk akal. */
    const MIN_AMOUNT = 1;

    /** Slug kategori induk layanan top-up, dibuat oleh seed kategori. */
    const TOPUP_ROOT_SLUG = 'top-up-tagihan';

    /**
     * GET /api/topup/csrf
     *
     * Membawa token CSRF untuk POST dari React. Dipanggil saat tombol "Beli"
     * ditekan, bukan saat render, supaya pengunjung yang tidak memakai widget
     * tidak membayar request tambahan.
     */
    public function actionCsrf()
    {
        return [
            'ok' => true,
            'csrfToken' => (string)Yii::$app->request->getCsrfToken(),
        ];
    }

    /**
     * POST /api/topup/submit
     *
     * Body (form-urlencoded): service, phone_number, amount, _csrf.
     *
     * Validasi ditegakkan di server; nilai dari klien tidak dipercaya.
     */
    public function actionSubmit()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.');
        }

        $service = trim(strip_tags((string)Yii::$app->request->post('service', '')));
        $phone = $this->normalizePhone((string)Yii::$app->request->post('phone_number', ''));
        $amount = $this->normalizeAmount(Yii::$app->request->post('amount', ''));

        if ($service === '' || mb_strlen($service) > self::MAX_SERVICE_LENGTH) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Layanan tidak valid.');
        }

        if ($phone === '' || strlen($phone) > self::MAX_PHONE_LENGTH || !$this->validPhone($phone)) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Nomor tidak valid. Masukkan 8-15 digit.');
        }

        if ($amount < self::MIN_AMOUNT || $amount > self::MAX_AMOUNT) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Nominal tidak valid.');
        }

        $customersId = Yii::$app->user->isGuest ? 0 : (int)Yii::$app->user->getId();
        $categoryId = $this->resolveServiceCategoryId($service);

        $now = new Expression('NOW()');

        Yii::$app->db->createCommand()->insert('{{%topup_orders}}', [
            'customers_id' => $customersId,
            'service' => $service,
            'category_id' => $categoryId,
            'phone_number' => $phone,
            'amount' => number_format($amount, 2, '.', ''),
            'status' => 0,
            'date_added' => $now,
        ])->execute();

        $orderId = (int)Yii::$app->db->getLastInsertID();

        return [
            'ok' => true,
            'items' => [
                'topup_orders_id' => $orderId,
                'service' => $service,
                'phone_number' => $phone,
                'amount' => $amount,
                'status' => 0,
            ],
            'error' => null,
        ];
    }

    /**
     * Nomor telepon dinormalisasi: spasi, tanda hubung, dan tanda kurung
     * dibuang; satu tanda + di depan diizinkan.
     */
    private function normalizePhone($raw)
    {
        $raw = trim((string)$raw);
        $plus = str_starts_with($raw, '+');
        $digits = preg_replace('/\D+/', '', $raw);

        if ($digits === null || $digits === '') {
            return '';
        }

        return ($plus ? '+' : '') . $digits;
    }

    /** Panjang digit (tanpa +) harus 8 sampai 15, mengikuti standar E.164. */
    private function validPhone($phone)
    {
        $digits = ltrim($phone, '+');

        return $digits !== '' && strlen($digits) >= 8 && strlen($digits) <= 15;
    }

    /**
     * Nominal dari input teks: hanya digit yang dipakai.
     *
     * Nominal top-up dalam rupiah selalu bilangan bulat, dan pengunjung boleh
     * menulis pemisah ribuan gaya Indonesia ("10.000") atau umum ("10,000").
     * Karena itu titik/koma dibuang, bukan diperlakukan sebagai desimal.
     * Mengembalikan 0 kalau tidak ada digit.
     */
    private function normalizeAmount($raw)
    {
        if (is_array($raw)) {
            return 0.0;
        }

        $value = preg_replace('/\D+/', '', (string)$raw);

        return ($value === null || $value === '') ? 0.0 : (float)$value;
    }

    /**
     * Menautkan layanan ke kategori anak "Top Up & Tagihan" kalau ada, supaya
     * admin bisa melihat transaksi per layanan lewat Catalog. Kalau tidak
     * ketemu, 0 (tidak mengganggu penyimpanan).
     */
    private function resolveServiceCategoryId($service)
    {
        $languagesId = (int)Yii::$app->settings->get('languages_id');

        $rootId = Categories::find()
            ->where(['categories_seo_page_name' => self::TOPUP_ROOT_SLUG])
            ->select('categories_id')
            ->scalar();

        if (!$rootId) {
            return 0;
        }

        $categoryId = Categories::find()
            ->alias('category')
            ->innerJoin(
                ['description' => CategoriesDescription::tableName()],
                'description.categories_id = category.categories_id'
                . ' AND description.language_id = :languages_id',
                [':languages_id' => $languagesId]
            )
            ->where([
                'category.parent_id' => (int)$rootId,
                'description.categories_name' => $service,
            ])
            ->select('category.categories_id')
            ->scalar();

        return $categoryId ? (int)$categoryId : 0;
    }

    /** Bentuk jawaban gagal dengan kontrak yang sama seperti sukses. */
    private function error($message)
    {
        return [
            'ok' => false,
            'items' => null,
            'error' => $message,
        ];
    }
}
