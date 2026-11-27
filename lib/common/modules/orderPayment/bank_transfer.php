<?php

namespace common\modules\orderPayment;

use common\classes\modules\ModulePayment;
use common\classes\modules\ModuleStatus;
use common\classes\modules\ModuleSortOrder;

class bank_transfer extends ModulePayment
{
    public $code;
    public $title;
    public $description;
    public $enabled;
    public $sort_order = 0;

    protected $defaultTranslationArray = [
        'MODULE_PAYMENT_BANK_TRANSFER_TEXT_TITLE' => 'Bank Transfer',
        'MODULE_PAYMENT_BANK_TRANSFER_TEXT_DESCRIPTION' => 'Offline bank transfer instructions saved in admin configuration. No payment gateway is called.',
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

        $this->code = 'bank_transfer';
        $this->title = MODULE_PAYMENT_BANK_TRANSFER_TEXT_TITLE;
        $this->description = MODULE_PAYMENT_BANK_TRANSFER_TEXT_DESCRIPTION;

        if (!defined('MODULE_PAYMENT_BANK_TRANSFER_STATUS')) {
            $this->enabled = false;
            return false;
        }

        $this->sort_order = (int)$this->cfg('MODULE_PAYMENT_BANK_TRANSFER_SORT_ORDER', 0);
        $this->enabled = $this->cfg('MODULE_PAYMENT_BANK_TRANSFER_STATUS', 'False') === 'True';
        $this->online = false;

        $orderStatus = (int)$this->cfg('MODULE_PAYMENT_BANK_TRANSFER_ORDER_STATUS_ID', 0);
        if ($orderStatus > 0) {
            $this->order_status = $orderStatus;
        }

        $this->update_status();
    }

    function update_status()
    {
        if ($this->enabled && (int)$this->cfg('MODULE_PAYMENT_BANK_TRANSFER_ZONE', 0) > 0) {
            $this->enabled = $this->checkStatusByZone(
                (int)$this->cfg('MODULE_PAYMENT_BANK_TRANSFER_ZONE', 0),
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
        $bank = $this->cfg('MODULE_PAYMENT_BANK_TRANSFER_BANK_NAME', '');
        $holder = $this->cfg('MODULE_PAYMENT_BANK_TRANSFER_ACCOUNT_HOLDER', '');
        $number = $this->cfg('MODULE_PAYMENT_BANK_TRANSFER_ACCOUNT_NUMBER', '');
        $instructions = $this->cfg('MODULE_PAYMENT_BANK_TRANSFER_INSTRUCTIONS', '');

        $fields = [
            ['title' => 'Bank', 'field' => $this->safe($bank !== '' ? $bank : '-')],
            ['title' => 'Account Holder', 'field' => $this->safe($holder !== '' ? $holder : '-')],
            ['title' => 'Account Number', 'field' => $this->safe($number !== '' ? $number : '-')],
        ];

        return [
            'title' => $this->title,
            'fields' => $fields,
            'description' => nl2br($this->safe($instructions)),
        ];
    }

    public function configure_keys()
    {
        return [
            'MODULE_PAYMENT_BANK_TRANSFER_STATUS' => [
                'title' => 'Enable Bank Transfer Dummy',
                'value' => 'True',
                'description' => 'Show bank transfer instructions at checkout. No payment gateway is called.',
                'sort_order' => '1',
                'set_function' => 'tep_cfg_select_option(array(\'True\', \'False\'), ',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_MODE' => [
                'title' => 'Bank Transfer Mode',
                'value' => 'Dummy',
                'description' => 'Only Dummy is active. This module stores data only and does not confirm payment.',
                'sort_order' => '2',
                'set_function' => 'tep_cfg_select_option(array(\'Dummy\'), ',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_BANK_NAME' => [
                'title' => 'Bank Name',
                'value' => 'Dummy Bank',
                'description' => 'Bank name shown to the customer at confirmation.',
                'sort_order' => '3',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_ACCOUNT_HOLDER' => [
                'title' => 'Account Holder',
                'value' => 'Dummy Merchant',
                'description' => 'Account holder name shown to the customer.',
                'sort_order' => '4',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_ACCOUNT_NUMBER' => [
                'title' => 'Account Number',
                'value' => '0000000000',
                'description' => 'Dummy account number. Replace only when approved for real use.',
                'sort_order' => '5',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_INSTRUCTIONS' => [
                'title' => 'Transfer Instructions',
                'value' => 'Simulasi: transfer tidak diverifikasi otomatis. Order tetap menunggu konfirmasi admin.',
                'description' => 'Instructions shown to the customer after choosing bank transfer.',
                'sort_order' => '6',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_ORDER_STATUS_ID' => [
                'title' => 'Bank Transfer Order Status',
                'value' => '100007',
                'description' => 'Order status after a dummy bank transfer order is placed.',
                'sort_order' => '7',
                'set_function' => 'tep_cfg_pull_down_order_statuses(',
                'use_function' => '\\common\\helpers\\Order::get_order_status_name',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_ZONE' => [
                'title' => 'Bank Transfer Zone',
                'value' => '0',
                'description' => 'Restrict this payment method to a geo zone.',
                'sort_order' => '8',
                'use_function' => '\\common\\helpers\\Zones::get_zone_class_title',
                'set_function' => 'tep_cfg_pull_down_zone_classes(',
            ],
            'MODULE_PAYMENT_BANK_TRANSFER_SORT_ORDER' => [
                'title' => 'Bank Transfer Sort Order',
                'value' => '70',
                'description' => 'Sort order of display.',
                'sort_order' => '9',
            ],
        ];
    }

    public function describe_status_key()
    {
        return new ModuleStatus('MODULE_PAYMENT_BANK_TRANSFER_STATUS', 'True', 'False');
    }

    public function describe_sort_key()
    {
        return new ModuleSortOrder('MODULE_PAYMENT_BANK_TRANSFER_SORT_ORDER');
    }
}
