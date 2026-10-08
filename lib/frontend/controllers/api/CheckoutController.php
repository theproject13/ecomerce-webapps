<?php

namespace frontend\controllers\api;

use app\components\CartFactory;
use common\classes\platform;
use common\helpers\Address;
use common\helpers\Currencies;
use common\services\OrderManager;
use Yii;

/**
 * API checkout untuk storefront React.
 *
 * Rutenya /api/checkout/summary (GET), /api/checkout/select (POST), dan
 * /api/checkout/place (POST). Controller ini tidak menyimpan apa pun sendiri;
 * ia menggerakkan OrderManager yang sama dengan CheckoutController tema, jadi
 * harga, ongkir, pajak, dan aturan checkout tetap punya satu sumber kebenaran.
 *
 * Cakupan sengaja dibatasi:
 * - Hanya pelanggan yang login dan memilih alamat dari address book. Membuat
 *   alamat baru masih lewat halaman akun PHP.
 * - Penempatan pesanan hanya untuk modul pembayaran offline (isOnline() ===
 *   false, mis. cod/offline). Modul online diarahkan kembali ke checkout PHP,
 *   karena gateway butuh redirect/redirect-balik ke dirinya sendiri.
 *
 * Yang tetap milik PHP: session, cartID, perhitungan total, validasi stok, dan
 * penyimpanan order (save_order/save_details/save_products).
 */
class CheckoutController extends BaseApiController
{
    /** GET /api/checkout/summary */
    public function actionSummary()
    {
        $blocked = $this->blocked();
        if ($blocked !== null) {
            return $blocked;
        }

        $cart = $this->cart();
        if ($cart->count_contents() < 1) {
            return $this->payload([
                'error' => 'Keranjang kosong, tidak ada yang bisa di-checkout.',
            ]);
        }

        $manager = $this->manager();

        return $this->payload([
            'state' => $this->state($manager),
        ]);
    }

    /** POST /api/checkout/select */
    public function actionSelect()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->payload(['error' => 'Metode harus POST.']);
        }

        $blocked = $this->blocked();
        if ($blocked !== null) {
            return $blocked;
        }

        $cart = $this->cart();
        if ($cart->count_contents() < 1) {
            return $this->payload([
                'error' => 'Keranjang kosong, tidak ada yang bisa di-checkout.',
            ]);
        }

        $manager = $this->manager();
        $this->applySelections($manager, Yii::$app->request->post());

        return $this->payload([
            'state' => $this->state($manager),
        ]);
    }

    /**
     * POST /api/checkout/place
     *
     * Menyalin urutan penyimpanan order di CheckoutController::actionProcess
     * (748-907): setSelectedPaymentModule -> createOrderInstance ->
     * checkoutOrderWithAddresses -> totalCollectPosts -> totalProcess ->
     * before_process -> save_order/save_details/save_products -> clearAfterProcess.
     *
     * Modul online ditolak di sini dan diarahkan ke checkout PHP.
     */
    public function actionPlace()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->payload(['error' => 'Metode harus POST.']);
        }

        $blocked = $this->blocked();
        if ($blocked !== null) {
            return $blocked;
        }

        $cart = $this->cart();
        if ($cart->count_contents() < 1) {
            Yii::$app->response->setStatusCode(422);

            return $this->payload(['error' => 'Keranjang kosong.']);
        }

        $manager = $this->manager();
        $this->applySelections($manager, Yii::$app->request->post());

        $payment = (string)$manager->getPayment();
        if ($payment === '') {
            Yii::$app->response->setStatusCode(422);

            return $this->payload(['error' => 'Pilih metode pembayaran dulu.']);
        }

        if ($manager->isShippingNeeded() && !$manager->getSelectedShipping()) {
            Yii::$app->response->setStatusCode(422);

            return $this->payload(['error' => 'Pilih metode pengiriman dulu.']);
        }

        $paymentModules = $manager->setSelectedPaymentModule($payment);
        $module = $paymentModules->get($payment);
        if (!is_object($module)) {
            Yii::$app->response->setStatusCode(422);

            return $this->payload(['error' => 'Metode pembayaran tidak tersedia.']);
        }

        if ($module->isOnline()) {
            Yii::$app->response->setStatusCode(409);

            return $this->payload([
                'error' => 'Pembayaran online belum didukung di checkout React.',
                'redirect' => [
                    'php_checkout' => rtrim((string)Yii::$app->urlManager->createUrl(['checkout/index']), '/'),
                ],
            ]);
        }

        try {
            $result = $this->saveOrder($manager, $paymentModules);
        } catch (\Throwable $e) {
            Yii::error('Checkout place failed: ' . $e->getMessage());
            Yii::$app->response->setStatusCode(500);

            return $this->payload([
                'error' => 'Pesanan gagal dibuat. Silakan coba lagi.',
            ]);
        }

        return $this->payload([
            'order_id' => $result['order_id'],
            'redirect' => [
                'success' => rtrim((string)Yii::$app->urlManager->createUrl([
                    'checkout/success',
                    'order_id' => $result['order_id'],
                ]), '/'),
            ],
        ]);
    }

    /**
     * Inti penempatan pesanan (offline). Dibuat terpisah agar mudah diuji dan
     * supaya urutannya terlihat sama dengan actionProcess.
     *
     * @return array{order_id:int}
     */
    private function saveOrder(OrderManager $manager, $paymentModules)
    {
        global $cart;

        $manager->getShippingCollection($manager->getShipping());

        $order = $manager->createOrderInstance('\common\classes\Order');
        $manager->checkoutOrderWithAddresses();

        $manager->set('cartID', $cart->cartID);

        if ($manager->isShippingNeeded() && !$manager->checkShippingIsValid()) {
            throw new \RuntimeException('Metode pengiriman tidak valid untuk alamat ini.');
        }

        $manager->totalCollectPosts();
        $manager->totalProcess();
        $manager->totalPreConfirmationCheck();
        $manager->paymentPreConfirmationCheck();

        $paymentModules->before_process();
        $order->update_piad_information();

        $order->save_order();
        $order->save_details();
        $order->save_products();

        $cart->order_id = $order->order_id;

        $paymentModules->after_process();

        $manager->clearAfterProcess();

        return ['order_id' => (int)$order->order_id];
    }

    /**
     * Menerapkan pilihan alamat/ongkir/bayar yang dikirim React. Nilai yang
     * tidak valid diabaikan; state akhir tetap dihitung ulang server.
     */
    private function applySelections(OrderManager $manager, array $post)
    {
        $shippingChanged = false;

        if (array_key_exists('sendto', $post) && (int)$post['sendto'] > 0) {
            $manager->changeCustomerAddressSelection('shipping', (int)$post['sendto']);
            $manager->resetDeliveryAddress();
            $manager->remove('shipping');
            $shippingChanged = true;
        }

        if (array_key_exists('billto', $post) && (int)$post['billto'] > 0) {
            $manager->changeCustomerAddressSelection('billing', (int)$post['billto']);
            $manager->resetBillingAddress();
        }

        if (!empty($post['shipping'])) {
            $manager->setSelectedShipping((string)$post['shipping']);
        } elseif ($shippingChanged) {
            $manager->remove('shipping');
        }

        if (!empty($post['payment'])) {
            $manager->setSelectedPayment((string)$post['payment']);
        }

        $manager->getShippingQuotesByChoice(true);
    }

    /**
     * State checkout lengkap: alamat, ongkir, pembayaran, dan total.
     */
    private function state(OrderManager $manager)
    {
        $estimate = $manager->prepareEstimateData();

        $addresses = [];
        foreach (($estimate['addresses'] ?? []) as $address) {
            $formatId = $address['country']['address_format_id'] ?? null;
            $addresses[] = [
                'address_book_id' => (int)($address['address_book_id'] ?? 0),
                // microData=false: React merender label sebagai teks, jadi
                // markup <span itemprop> tidak diinginkan di sini.
                'label' => (string)Address::address_format($formatId, $address, 0, ' ', ' ', false),
            ];
        }

        $quotes = [];
        $shippingSelected = $manager->getSelectedShipping();
        foreach ((array)$manager->getShippingQuotesByChoice() as $quote) {
            if (!empty($quote['error'])) {
                continue;
            }

            $methods = [];
            foreach (($quote['methods'] ?? []) as $method) {
                $code = (string)($method['code'] ?? '');
                if ($code === '') {
                    $code = (string)($quote['module'] ?? '') . '_' . (string)($method['id'] ?? '');
                }

                $methods[] = [
                    'code' => $code,
                    'title' => (string)($method['title'] ?? ''),
                    'cost_f' => (string)($method['cost_f'] ?? ''),
                    'no_cost' => (bool)($method['no_cost'] ?? false),
                    'selected' => $code === $shippingSelected,
                ];
            }

            $quotes[] = [
                'module' => (string)($quote['module'] ?? ''),
                'title' => (string)($quote['module'] ?? ''),
                'methods' => $methods,
            ];
        }

        $paymentMethods = [];
        foreach ((array)$manager->getPaymentSelection() as $selection) {
            $code = (string)($selection['id'] ?? '');
            if ($code === '') {
                continue;
            }

            $collection = $manager->getPaymentCollection();
            $module = $collection->get($code);
            if (!is_object($module) && !empty($selection['module'])) {
                $module = $collection->get((string)$selection['module']);
            }
            $online = is_object($module) && $module->isOnline();

            $paymentMethods[] = [
                'code' => $code,
                'title' => (string)($selection['title'] ?? $code),
                'online' => (bool)$online,
                'checked' => (bool)($selection['checked'] ?? false),
            ];
        }

        $totals = [];
        foreach ($manager->getTotalOutput(true, 'TEXT_CHECKOUT') as $row) {
            $totals[] = [
                'code' => (string)($row['code'] ?? ''),
                'title' => (string)($row['title'] ?? ''),
                'text' => (string)($row['text'] ?? ''),
            ];
        }

        return [
            'is_logged_customer' => (bool)($estimate['is_logged_customer'] ?? false),
            'addresses' => $addresses,
            'sendto' => (int)($estimate['addresses_selected_value'] ?? 0),
            'billto' => (int)$manager->getBillto(),
            'shipping' => [
                'required' => (bool)$manager->isShippingNeeded(),
                'quotes' => $quotes,
                'selected' => $shippingSelected ?: null,
            ],
            'payment' => [
                'methods' => $paymentMethods,
                'selected' => $manager->getPayment() ?: null,
            ],
            'totals' => $totals,
            'currency' => (string)Currencies::systemCurrencyCode(),
        ];
    }

    /**
     * Blokir checkout pada pelanggan yang tidak memenuhi aturan toko. Untuk
     * sementara checkout React mewajibkan login (alamat dari address book).
     */
    private function blocked()
    {
        if (Yii::$app->user->isGuest) {
            Yii::$app->response->setStatusCode(401);

            return $this->payload([
                'error' => 'Silakan masuk dulu untuk checkout.',
                'redirect' => [
                    'login' => rtrim((string)Yii::$app->urlManager->createUrl(['account/login']), '/'),
                    'cart' => rtrim((string)Yii::$app->urlManager->createUrl(['shopping-cart']), '/'),
                ],
            ]);
        }

        return null;
    }

    /**
     * OrderManager untuk checkout, dikonfigurasi seperti CheckoutController.
     */
    private function manager()
    {
        global $cart;

        $manager = new OrderManager(Yii::$app->get('storage'));
        $manager->setModulesVisibility(['shop_order']);

        $cart = $this->cart();
        $manager->loadCart($cart);

        if (!Yii::$app->user->isGuest && !$manager->isCustomerAssigned()) {
            $manager->assignCustomer(Yii::$app->user->getId());
        }

        $manager->createOrderInstance('\common\classes\Order');

        return $manager;
    }

    /**
     * Kerangka jawaban checkout: ok, state, redirect, meta.
     */
    private function payload(array $data)
    {
        return [
            'ok' => !isset($data['error']),
            'state' => $data['state'] ?? null,
            'order_id' => $data['order_id'] ?? null,
            'redirect' => array_merge([
                'cart' => rtrim((string)Yii::$app->urlManager->createUrl(['shopping-cart']), '/'),
                'php_checkout' => rtrim((string)Yii::$app->urlManager->createUrl(['checkout/index']), '/'),
                'login' => rtrim((string)Yii::$app->urlManager->createUrl(['account/login']), '/'),
            ], $data['redirect'] ?? []),
            'meta' => [
                'platform_id' => (int)platform::currentId(),
                'currency' => (string)Currencies::systemCurrencyCode(),
            ],
            'error' => $data['error'] ?? null,
        ];
    }

    private function cart()
    {
        CartFactory::initCart();

        return $GLOBALS['cart'];
    }
}