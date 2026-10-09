<?php

namespace frontend\controllers\api;

use frontend\controllers\Sceleton;
use Yii;
use yii\web\Response;

class BaseApiController extends Sceleton
{
    public function beforeAction($action)
    {
        $result = parent::beforeAction($action);

        // Storefront React selalu tampil dalam Rupiah. Harga di database
        // tersimpan dalam mata uang dasar (GBP, kurs 1.0) dan kurs IDR ada di
        // tabel currencies (1 GBP = 21050 IDR). Dengan mengeset mata uang sesi
        // ke IDR, seluruh helper core (format()/display_price()) mengonversi
        // harga ke IDR secara otomatis, sehingga React tidak perlu tahu kurs.
        $currencyId = (int)\common\helpers\Currencies::getCurrencyId('IDR');
        if ($currencyId > 0) {
            Yii::$app->settings->set('currency_id', $currencyId);
            Yii::$app->settings->set('currency', 'IDR');
        }

        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->headers->add('Content-Type', 'application/json; charset=UTF-8');
        return $result;
    }

    /**
     * Konversi angka dari mata uang dasar (GBP) ke IDR memakai kurs tabel
     * currencies. Dipakai untuk nilai yang dikirim mentah oleh core, mis.
     * harga baris keranjang dari shopping_cart::get_products().
     */
    protected function toRupiah($amount)
    {
        $currencies = \Yii::$container->get('currencies');

        return round((float)$currencies->format_clear((float)$amount, true, 'IDR'), 2);
    }

    /**
     * Total order datang dari order-total PHP sebagai string ber-HTML
     * (mis. "<b>Rp...</b><input class=\"ot_total_clear\" .../>"). React hanya
     * butuh angkanya, jadi HTML dibuang. Teks asli core sudah diformat dalam
     * IDR (karena mata uang sesi = IDR), termasuk currency_value yang benar,
     * jadi tidak perlu konversi ulang di sini.
     */
    protected function totalText(array $row)
    {
        return trim(strip_tags((string)($row['text'] ?? '')));
    }
}
