<?php

namespace frontend\controllers\api;

use app\components\CartFactory;
use common\classes\language;
use common\classes\platform;
use common\helpers\Currencies;
use common\helpers\Customer as CustomerHelper;
use common\helpers\Date;
use common\models\OrdersProducts;
use frontend\forms\registration\AuthContainer;
use frontend\forms\registration\CustomerRegistration;
use Yii;

/**
 * API akun untuk storefront React.
 *
 * Rutenya /api/account/session, /api/account/csrf, /api/account/login,
 * /api/account/register, /api/account/logout, /api/account/overview, dan
 * /api/account/orders. Sama seperti cart: controller ini tidak menyimpan
 * apa pun sendiri, ia memanggil AuthContainer/CustomerRegistration dan model
 * yang sama dengan tema PHP, jadi session login, validasi, dan CSRF tetap punya
 * satu sumber kebenaran.
 *
 * Yang tetap milik PHP: session, login, registrasi, CSRF, captcha, dan
 * kepemilikan pesanan (riwayat dihitung dari customers_id session, bukan dari
 * input klien). Yang pindah ke React hanya tampilannya.
 */
class AccountController extends BaseApiController
{
    /** Batas jumlah pesanan yang dikembalikan per permintaan. */
    const MAX_ORDERS = 50;

    /**
     * GET /api/account/csrf
     *
     * Token CSRF untuk form React, sama seperti /api/cart/csrf. Diambil saat
     * tombol ditekan (bukan saat render) karena ReactShell echoing HTML sebelum
     * $application->run(), sehingga token yang disuntikkan ke config tidak
     * konsisten dengan cookie _csrf yang dibaca Yii pada POST berikutnya.
     */
    public function actionCsrf()
    {
        return [
            'ok' => true,
            'csrfToken' => (string)Yii::$app->request->getCsrfToken(),
        ];
    }

    /**
     * GET /api/account/session
     *
     * Status login untuk halaman akun React. Hanya membaca session PHP yang
     * sudah ada, tidak mengubah apa pun, jadi aman tanpa token CSRF. Yang
     * dikembalikan hanya info tampilan dan id; email/telepon tidak dibocorkan
     * ke sini untuk tamu.
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

        return $this->sessionPayload([
            'logged_in' => !$isGuest,
            'customers_id' => $isGuest ? null : (int)Yii::$app->user->getId(),
            'display_name' => $displayName,
            'initial' => $initial,
        ]);
    }

    /**
     * POST /api/account/login
     *
     * Body (form-urlencoded, sama seperti form PHP):
     *   login[email_address], login[password], login[remember]=1
     *
     * Menggunakan scenario 'login' CustomerRegistration via AuthContainer,
     * persis alur account/login PHP. Captcha ikut aktif sesuai konfigurasi
     * toko (CAPTCHA_ON_CUSTOMER_LOGIN), dengan image dari /site/captcha.
     */
    public function actionLogin()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.', []);
        }

        if (!Yii::$app->user->isGuest) {
            return $this->success([]);
        }

        $this->loadTranslations(['js', 'checkout/login', 'account/login']);

        $auth = new AuthContainer();
        $auth->getForms('account/create');
        $ok = (bool)$auth->loadScenario(CustomerRegistration::SCENARIO_LOGIN);

        if (!$ok || $auth->hasErrors()) {
            return $this->error(
                $this->firstMessage($auth->getErrors(CustomerRegistration::SCENARIO_LOGIN)),
                $this->fieldMessages($auth->getErrors(CustomerRegistration::SCENARIO_LOGIN))
            );
        }

        return $this->success([]);
    }

    /**
     * POST /api/account/register
     *
     * Body (form-urlencoded):
     *   registration[email_address], registration[password],
     *   registration[confirmation], registration[firstname],
     *   registration[lastname], registration[gdrp]=1, registration[captcha]
     *
     * Field lain (telephone, landline, gender, dob, alamat) bersifat opsional
     * di instalasi ini: konfigurasi ACCOUNT_*-nya 'visible'/'disabled', jadi
     * tidak wajib di-requiredOnRegister. Registrasi sukses langsung login,
     * sama seperti tema PHP (lihat AccountController::actionCreate).
     */
    public function actionRegister()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.', []);
        }

        if (!Yii::$app->user->isGuest) {
            return $this->success([]);
        }

        $this->loadTranslations(['js', 'account/create', 'account/login']);

        $auth = new AuthContainer();
        $auth->getForms('account/create');
        $ok = (bool)$auth->loadScenario(CustomerRegistration::SCENARIO_REGISTER);

        if (!$ok || $auth->hasErrors()) {
            return $this->error(
                $this->firstMessage($auth->getErrors(CustomerRegistration::SCENARIO_REGISTER)),
                $this->fieldMessages($auth->getErrors(CustomerRegistration::SCENARIO_REGISTER))
            );
        }

        return $this->success([]);
    }

    /**
     * POST /api/account/logout
     *
     * Menyalin urutan AccountController::actionLogoff: clear settings session,
     * logoffCustomer(), lalu cart->reset(). Cart di-reset karena isi keranjang
     * milik pengunjung tidak boleh bocor ke pemilik akun berikutnya.
     */
    public function actionLogout()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.', []);
        }

        if (Yii::$app->user->isGuest) {
            return $this->error('Belum masuk ke akun.', []);
        }

        \Yii::$app->settings->clear();

        $identity = Yii::$app->user->getIdentity();
        if ($identity !== null) {
            $identity->logoffCustomer();
        }

        $cart = $this->cart();
        if ($cart !== null) {
            $cart->reset();
        }

        return $this->success([]);
    }

    /**
     * GET /api/account/overview
     *
     * Profil akun yang sedang login. Semua nilai dibaca dari session
     * (Identity), bukan dari input klien. Email/telepon hanya dikirim ke
     * pemilik akun, jadi pembaca tidak perlu khawatir soal privasi di sini.
     */
    public function actionOverview()
    {
        if (Yii::$app->user->isGuest) {
            return $this->loginRequired();
        }

        $identity = Yii::$app->user->identity;

        $firstName = isset($identity->customers_firstname) ? trim((string)$identity->customers_firstname) : '';
        $lastName = isset($identity->customers_lastname) ? trim((string)$identity->customers_lastname) : '';

        $items = [
            'logged_in' => true,
            'customers_id' => (int)Yii::$app->user->getId(),
            'firstname' => $firstName,
            'lastname' => $lastName,
            'display_name' => trim($firstName . ' ' . $lastName),
            'email' => isset($identity->customers_email_address) ? (string)$identity->customers_email_address : '',
            'telephone' => isset($identity->customers_telephone) ? (string)$identity->customers_telephone : '',
            'landline' => isset($identity->customers_landline) ? (string)$identity->customers_landline : '',
            'orders_count' => (int)CustomerHelper::count_customer_orders(),
        ];

        return $this->payload($items);
    }

    /**
     * GET /api/account/orders
     *
     * Riwayat pesanan hanya milik user yang sedang login. Query meniru
     * AccountController::actionHistory persis (orders JOIN orders_total JOIN
     * orders_status), jadi angka item dan label status tidak bisa beda antara
     * halaman PHP dan React.
     */
    public function actionOrders()
    {
        if (Yii::$app->user->isGuest) {
            return $this->loginRequired();
        }

        $customerId = (int)Yii::$app->user->getId();
        $languageId = $this->languageId();

        $sql = 'SELECT o.orders_id, o.date_purchased, o.delivery_name, o.billing_name,'
            . ' ot.text AS order_total, s.orders_status_name'
            . ' FROM ' . TABLE_ORDERS . ' o'
            . ' INNER JOIN ' . TABLE_ORDERS_TOTAL . ' ot'
            . '   ON o.orders_id = ot.orders_id AND ot.class = :total_class'
            . ' INNER JOIN ' . TABLE_ORDERS_STATUS . ' s'
            . '   ON o.orders_status = s.orders_status_id AND s.language_id = :language_id'
            . ' WHERE o.customers_id = :customers_id'
            . ' ORDER BY o.orders_id DESC'
            . ' LIMIT ' . self::MAX_ORDERS;

        $rows = Yii::$app->db->createCommand($sql, [
            ':total_class' => 'ot_total',
            ':language_id' => $languageId,
            ':customers_id' => $customerId,
        ])->queryAll();

        $items = [];
        foreach ($rows as $row) {
            $ordersId = (int)$row['orders_id'];
            $name = trim((string)($row['delivery_name'] ?? ''));
            $type = defined('TEXT_ORDER_SHIPPED_TO') ? TEXT_ORDER_SHIPPED_TO : 'Dikirim ke';
            if ($name === '') {
                $name = trim((string)($row['billing_name'] ?? ''));
                $type = defined('TEXT_ORDER_BILLED_TO') ? TEXT_ORDER_BILLED_TO : 'Ditagih ke';
            }

            $items[] = [
                'orders_id' => $ordersId,
                'date_purchased' => (string)$row['date_purchased'],
                'date_long' => Date::date_long((string)$row['date_purchased']),
                'total' => (string)($row['order_total'] ?? ''),
                'status' => (string)($row['orders_status_name'] ?? ''),
                'shipped_to' => $name,
                'type' => $type,
                'count' => (int)OrdersProducts::find()
                    ->select(['COUNT(*) AS count'])
                    ->where(['orders_id' => $ordersId])
                    ->scalar(),
                'url' => rtrim((string)Yii::$app->urlManager->createUrl(['account/history-info', 'order_id' => $ordersId]), '/'),
            ];
        }

        $payload = $this->payload($items);
        $payload['meta']['orders_count'] = (int)CustomerHelper::count_customer_orders();

        return $payload;
    }

    /**
     * Bentuk jawaban sukses login/register/logout.
     */
    private function success(array $extra)
    {
        $payload = $this->payload(array_merge([
            'logged_in' => !Yii::$app->user->isGuest,
        ], $extra));

        return $payload;
    }

    /**
     * Bentuk jawaban saat aksi akun gagal (validasi, bukan di-autentikasi).
     *
     * error adalah pesan tampilan, field_errors memetakan atribut model ke satu
     * pesan pertama supaya React bisa menandai input yang salah persis seperti
     * yang dikenali PHP.
     */
    private function error($message, array $fieldErrors)
    {
        $payload = $this->payload([]);
        $payload['ok'] = false;
        $payload['error'] = $message;
        $payload['field_errors'] = $fieldErrors;

        return $payload;
    }

    /**
     * Bentuk jawaban saat halaman butuh login (overview/orders).
     */
    private function loginRequired()
    {
        Yii::$app->response->setStatusCode(401);

        $payload = $this->payload([]);
        $payload['ok'] = false;
        $payload['error'] = 'Silakan masuk dulu untuk melihat halaman ini.';
        $payload['field_errors'] = [];
        $payload['redirect']['login'] = rtrim(
            (string)Yii::$app->urlManager->createUrl(['account/login']),
            '/'
        );

        return $payload;
    }

    /**
     * Kerangka jawaban akun: ok + items + redirect + meta.
     */
    private function payload(array $items)
    {
        return [
            'ok' => true,
            'items' => $items,
            'redirect' => [
                'account' => rtrim((string)Yii::$app->urlManager->createUrl(['account']), '/'),
                'home' => rtrim((string)Yii::$app->urlManager->createUrl(['/']), '/'),
            ],
            'meta' => [
                'platform_id' => (int)platform::currentId(),
                'currency' => (string)Currencies::systemCurrencyCode(),
            ],
            'error' => null,
        ];
    }

    /**
     * Kerangka jawaban session, khusus /api/account/session.
     */
    private function sessionPayload(array $items)
    {
        return [
            'items' => $items,
            'meta' => [
                'platform_id' => (int)platform::currentId(),
            ],
            'error' => null,
        ];
    }

    /**
     * Pesan pertama dari setiap atribut, untuk memetakan ke input React.
     */
    private function fieldMessages(array $errors)
    {
        $map = [];
        foreach ($errors as $attribute => $messages) {
            $flat = is_array($messages) ? $messages : [$messages];
            $map[(string)$attribute] = (string)reset($flat);
        }

        return $map;
    }

    /**
     * Pesan tampilan pertama dari semua error (prioritas email_address seperti
     * message stack tema, agar pesan login yang familiar muncul lebih dulu).
     */
    private function firstMessage(array $errors)
    {
        foreach (['email_address', 'captcha', 'password', 'confirmation', 'firstname', 'lastname'] as $attribute) {
            if (isset($errors[$attribute])) {
                $messages = is_array($errors[$attribute]) ? $errors[$attribute] : [$errors[$attribute]];
                return (string)reset($messages);
            }
        }

        if ($errors) {
            return $this->firstMessageInner($errors);
        }

        return 'Permintaan tidak bisa diproses.';
    }

    private function firstMessageInner(array $errors)
    {
        foreach ($errors as $messages) {
            $flat = is_array($messages) ? $messages : [$messages];
            if ($flat) {
                return (string)reset($flat);
            }
        }

        return 'Permintaan tidak bisa diproses.';
    }

    /**
     * Memuat definisi bahasa (TEXT_*) untuk entity yang dibutuhkan form.
     *
     * Controller tema memanggil Translation::init() pada action-nya; di konteks
     * API tidak ada yang memuatnya, sehingga konstanta seperti TEXT_LOGIN_ERROR
     * (entity checkout/login) belum terdefinisi dan memicu fatal error saat
     * login gagal. Language id diberikan eksplisit karena global $languages_id
     * belum tentu terisi di jalur /api.
     */
    private function loadTranslations(array $entities)
    {
        $languageId = $this->languageId();
        foreach ($entities as $entity) {
            \common\helpers\Translation::init($entity, $languageId);
        }
    }

    /**
     * Bahasa session aktif, dengan fallback yang sama seperti
     * CustomerRegistration::rules().
     */
    private function languageId()
    {
        try {
            return (int)Yii::$app->settings->get('languages_id');
        } catch (\Exception $e) {
            return (int)language::defaultId();
        }
    }

    /**
     * Objek keranjang dari session, null jika belum diinisialisasi.
     */
    private function cart()
    {
        CartFactory::initCart();

        return $GLOBALS['cart'] ?? null;
    }
}