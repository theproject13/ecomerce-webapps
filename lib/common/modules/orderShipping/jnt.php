<?php

namespace common\modules\orderShipping;

use common\classes\modules\ModuleShipping;
use common\classes\modules\ModuleStatus;
use common\classes\modules\ModuleSortOrder;

class jnt extends ModuleShipping
{
    public $code;
    public $title;
    public $description;
    public $enabled;
    public $sort_order = 0;
    public $tax_class = 0;

    protected $defaultTranslationArray = [
        'MODULE_SHIPPING_JNT_TEXT_TITLE' => 'J&T',
        'MODULE_SHIPPING_JNT_TEXT_DESCRIPTION' => 'J&T shipping using rates saved in admin configuration.',
        'MODULE_SHIPPING_JNT_TEXT_WAY' => '',
    ];

    private function cfg($key, $default = '')
    {
        return defined($key) ? constant($key) : $default;
    }

    public function __construct()
    {
        parent::__construct();

        $this->code = 'jnt';
        $this->title = MODULE_SHIPPING_JNT_TEXT_TITLE;
        $this->description = MODULE_SHIPPING_JNT_TEXT_DESCRIPTION;

        if (!defined('MODULE_SHIPPING_JNT_STATUS')) {
            $this->enabled = false;
            return false;
        }

        $this->sort_order = (int)$this->cfg('MODULE_SHIPPING_JNT_SORT_ORDER', 0);
        $this->tax_class = (int)$this->cfg('MODULE_SHIPPING_JNT_TAX_CLASS', 0);
        $this->enabled = $this->cfg('MODULE_SHIPPING_JNT_STATUS', 'False') === 'True';

        if ($this->enabled) {
            $zone = (int)$this->cfg('MODULE_SHIPPING_JNT_ZONE', 0);
            if ($zone > 0) {
                $this->enabled = \common\helpers\Zones::isGeoZone(
                    $zone,
                    $this->delivery['country']['id'] ?? null,
                    $this->delivery['zone_id'] ?? null
                );
            }
        }
    }

    private function services()
    {
        $raw = $this->cfg(
            'MODULE_SHIPPING_JNT_SERVICES',
            'EZ|EZ|1.00|0.10;SUPER|SUPER|1.40|0.15'
        );
        $result = [];

        foreach (explode(';', $raw) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $part = array_map('trim', explode('|', $line));
            if (count($part) < 3) {
                continue;
            }
            $id = preg_replace('/[^A-Za-z0-9_-]/', '', strtoupper($part[0]));
            if ($id === '') {
                continue;
            }
            $result[$id] = [
                'id' => $id,
                'title' => $part[1] !== '' ? $part[1] : $part[0],
                'base' => (float)$part[2],
                'per_kg' => isset($part[3]) ? (float)$part[3] : 0,
            ];
        }

        return $result;
    }

    public function possibleMethods()
    {
        $methods = [];
        foreach ($this->services() as $id => $service) {
            $methods[$id] = $service['title'];
        }
        return $methods;
    }

    function quote($method = '')
    {
        $methods = [];
        $weight = max(0, (float)$this->shipping_weight);
        $handling = (float)$this->cfg('MODULE_SHIPPING_JNT_HANDLING', 0);

        foreach ($this->services() as $service) {
            if ($method !== '' && $method !== $service['id'] && $method !== $this->code . '_' . $service['id']) {
                continue;
            }
            $cost = $service['base'] + ($service['per_kg'] * ceil($weight)) + $handling;
            $way = trim((string)MODULE_SHIPPING_JNT_TEXT_WAY);
            $methods[] = [
                'id' => $service['id'],
                'title' => $way === '' ? $service['title'] : $service['title'] . ' (' . $way . ')',
                'cost' => round($cost, 2),
            ];
        }

        $quotes = [
            'id' => $this->code,
            'module' => $this->title,
            'methods' => $methods,
        ];

        if ($this->tax_class > 0) {
            $quotes['tax'] = \common\helpers\Tax::get_tax_rate(
                $this->tax_class,
                $this->delivery['country']['id'] ?? null,
                $this->delivery['zone_id'] ?? null
            );
        }

        return $quotes;
    }

    public function configure_keys()
    {
        return [
            'MODULE_SHIPPING_JNT_STATUS' => [
                'title' => 'Enable J&T Dummy Shipping',
                'value' => 'True',
                'description' => 'Show J&T as a local dummy shipping option. No request is sent to J&T.',
                'sort_order' => '1',
                'set_function' => 'tep_cfg_select_option(array(\'True\', \'False\'), ',
            ],
            'MODULE_SHIPPING_JNT_MODE' => [
                'title' => 'J&T Mode',
                'value' => 'Dummy',
                'description' => 'Only Dummy is active. API fields below are stored for later integration.',
                'sort_order' => '2',
                'set_function' => 'tep_cfg_select_option(array(\'Dummy\'), ',
            ],
            'MODULE_SHIPPING_JNT_API_URL' => [
                'title' => 'J&T API URL',
                'value' => 'https://developer.jet.co.id/documentation',
                'description' => 'Reserved for future API integration; not called in dummy mode.',
                'sort_order' => '3',
            ],
            'MODULE_SHIPPING_JNT_CUS_NAME' => [
                'title' => 'J&T Customer Name',
                'value' => '',
                'description' => 'Reserved configuration field. Leave empty for dummy mode.',
                'sort_order' => '4',
            ],
            'MODULE_SHIPPING_JNT_API_KEY' => [
                'title' => 'J&T API Key',
                'value' => '',
                'description' => 'Reserved configuration field. Do not enter live credentials yet.',
                'sort_order' => '5',
            ],
            'MODULE_SHIPPING_JNT_KEY' => [
                'title' => 'J&T Key',
                'value' => '',
                'description' => 'Reserved configuration field for the second API key.',
                'sort_order' => '6',
            ],
            'MODULE_SHIPPING_JNT_ORIGIN_CODE' => [
                'title' => 'J&T Origin Code',
                'value' => 'CGK',
                'description' => 'Reserved origin area code for future API pricing.',
                'sort_order' => '7',
            ],
            'MODULE_SHIPPING_JNT_SERVICES' => [
                'title' => 'J&T Dummy Services',
                'value' => 'EZ|EZ|1.00|0.10;SUPER|SUPER|1.40|0.15',
                'description' => 'Format: CODE|Label|Base Cost|Cost Per Kg; separate services with semicolon.',
                'sort_order' => '8',
            ],
            'MODULE_SHIPPING_JNT_HANDLING' => [
                'title' => 'J&T Handling Fee',
                'value' => '0',
                'description' => 'Handling fee added to every dummy service quote.',
                'sort_order' => '9',
            ],
            'MODULE_SHIPPING_JNT_TAX_CLASS' => [
                'title' => 'J&T Tax Class',
                'value' => '0',
                'description' => 'Tax class applied to the shipping fee.',
                'sort_order' => '10',
                'use_function' => '\\common\\helpers\\Tax::get_tax_class_title',
                'set_function' => 'tep_cfg_pull_down_tax_classes(',
            ],
            'MODULE_SHIPPING_JNT_ZONE' => [
                'title' => 'J&T Shipping Zone',
                'value' => '0',
                'description' => 'Restrict this shipping method to a geo zone.',
                'sort_order' => '11',
                'use_function' => '\\common\\helpers\\Zones::get_zone_class_title',
                'set_function' => 'tep_cfg_pull_down_zone_classes(',
            ],
            'MODULE_SHIPPING_JNT_SORT_ORDER' => [
                'title' => 'J&T Sort Order',
                'value' => '31',
                'description' => 'Sort order of display.',
                'sort_order' => '12',
            ],
        ];
    }

    public function describe_status_key()
    {
        return new ModuleStatus('MODULE_SHIPPING_JNT_STATUS', 'True', 'False');
    }

    public function describe_sort_key()
    {
        return new ModuleSortOrder('MODULE_SHIPPING_JNT_SORT_ORDER');
    }
}
