<?php

namespace common\modules\orderPayment;

use common\classes\modules\ModulePayment;
use common\classes\modules\ModuleStatus;
use common\classes\modules\ModuleSortOrder;

class qris extends ModulePayment
{
    public $code;
    public $title;
    public $description;
    public $enabled;
    public $sort_order = 0;

    protected $defaultTranslationArray = [
        'MODULE_PAYMENT_QRIS_TEXT_TITLE' => 'QRIS',
        'MODULE_PAYMENT_QRIS_TEXT_DESCRIPTION' => 'Offline QRIS instructions saved in admin configuration. No QRIS gateway is called.',
    ];

    private function cfg($key, $default = '')
    {
        return defined($key) ? constant($key) : $default;
    }

    private function safe($value)
    {
        return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
    }

    public function __construct()
    {
        parent::__construct();

        $this->code = 'qris';
        $this->title = MODULE_PAYMENT_QRIS_TEXT_TITLE;
        $this->description = MODULE_PAYMENT_QRIS_TEXT_DESCRIPTION;

        if (!defined('MODULE_PAYMENT_QRIS_STATUS')) {
            $this->enabled = false;
            return false;
        }

        $this->sort_order = (int)$this->cfg('MODULE_PAYMENT_QRIS_SORT_ORDER', 0);
        $this->enabled = $this->cfg('MODULE_PAYMENT_QRIS_STATUS', 'False') === 'True';
        $this->online = false;

        $orderStatus = (int)$this->cfg('MODULE_PAYMENT_QRIS_ORDER_STATUS_ID', 0);
        if ($orderStatus > 0) {
            $this->order_status = $orderStatus;
        }

        $this->update_status();
    }

    function update_status()
    {
        if ($this->enabled && (int)$this->cfg('MODULE_PAYMENT_QRIS_ZONE', 0) > 0) {
            $this->enabled = $this->checkStatusByZone(
                (int)$this->cfg('MODULE_PAYMENT_QRIS_ZONE', 0),
                'billing'
            );
        }
    }

    function selection()
    {
        return [
            'id' => $this->code,
            'module' => $this->title,
            'title' => $this->title,
        ];
    }

    function confirmation()
    {
        $merchant = $this->cfg('MODULE_PAYMENT_QRIS_MERCHANT_NAME', '');
        $qrisId = $this->cfg('MODULE_PAYMENT_QRIS_MERCHANT_ID', '');
        $payload = $this->cfg('MODULE_PAYMENT_QRIS_STATIC_PAYLOAD', '');
        $instructions = $this->cfg('MODULE_PAYMENT_QRIS_INSTRUCTIONS', '');

        $fields = [
            ['title' => 'Merchant', 'field' => $this->safe($merchant !== '' ? $merchant : '-')],
            ['title' => 'QRIS ID', 'field' => $this->safe($qrisId !== '' ? $qrisId : '-')],
        ];

        if ($payload !== '') {
            $fields[] = ['title' => 'Static QRIS Payload', 'field' => '<code>' . $this->safe($payload) . '</code>'];
        }

        return [
            'title' => $this->title,
            'fields' => $fields,
            'description' => nl2br($this->safe($instructions)),
        ];
    }

    public function configure_keys()
    {
        return [
            'MODULE_PAYMENT_QRIS_STATUS' => [
                'title' => 'Enable QRIS Dummy',
                'value' => 'True',
                'description' => 'Show QRIS instructions at checkout. No payment gateway is called.',
                'sort_order' => '1',
                'set_function' => 'tep_cfg_select_option(array(\'True\', \'False\'), ',
            ],
            'MODULE_PAYMENT_QRIS_MODE' => [
                'title' => 'QRIS Mode',
                'value' => 'Dummy',
                'description' => 'Only Dummy is active. This module stores data only and does not confirm payment.',
                'sort_order' => '2',
                'set_function' => 'tep_cfg_select_option(array(\'Dummy\'), ',
            ],
            'MODULE_PAYMENT_QRIS_MERCHANT_NAME' => [
                'title' => 'QRIS Merchant Name',
                'value' => 'Dummy Merchant',
                'description' => 'Merchant name shown to the customer at confirmation.',
                'sort_order' => '3',
            ],
            'MODULE_PAYMENT_QRIS_MERCHANT_ID' => [
                'title' => 'QRIS Merchant ID',
                'value' => 'DUMMY-QRIS-001',
                'description' => 'Dummy merchant or QRIS ID. Replace only when approved for real use.',
                'sort_order' => '4',
            ],
            'MODULE_PAYMENT_QRIS_STATIC_PAYLOAD' => [
                'title' => 'Static QRIS Payload',
                'value' => '',
                'description' => 'Optional static QR string. Leave empty in dummy mode.',
                'sort_order' => '5',
            ],
            'MODULE_PAYMENT_QRIS_INSTRUCTIONS' => [
                'title' => 'QRIS Instructions',
                'value' => 'Simulasi: QRIS tidak diverifikasi otomatis. Order tetap menunggu konfirmasi admin.',
                'description' => 'Instructions shown to the customer after choosing QRIS.',
                'sort_order' => '6',
            ],
            'MODULE_PAYMENT_QRIS_ORDER_STATUS_ID' => [
                'title' => 'QRIS Order Status',
                'value' => '100007',
                'description' => 'Order status after a dummy QRIS order is placed.',
                'sort_order' => '7',
                'set_function' => 'tep_cfg_pull_down_order_statuses(',
                'use_function' => '\\common\\helpers\\Order::get_order_status_name',
            ],
            'MODULE_PAYMENT_QRIS_ZONE' => [
                'title' => 'QRIS Zone',
                'value' => '0',
                'description' => 'Restrict this payment method to a geo zone.',
                'sort_order' => '8',
                'use_function' => '\\common\\helpers\\Zones::get_zone_class_title',
                'set_function' => 'tep_cfg_pull_down_zone_classes(',
            ],
            'MODULE_PAYMENT_QRIS_SORT_ORDER' => [
                'title' => 'QRIS Sort Order',
                'value' => '71',
                'description' => 'Sort order of display.',
                'sort_order' => '9',
            ],
        ];
    }

    public function describe_status_key()
    {
        return new ModuleStatus('MODULE_PAYMENT_QRIS_STATUS', 'True', 'False');
    }

    public function describe_sort_key()
    {
        return new ModuleSortOrder('MODULE_PAYMENT_QRIS_SORT_ORDER');
    }
}
