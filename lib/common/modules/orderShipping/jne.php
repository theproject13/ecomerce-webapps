<?php

namespace common\modules\orderShipping;

use common\classes\modules\ModuleShipping;
use common\classes\modules\ModuleStatus;
use common\classes\modules\ModuleSortOrder;

class jne extends ModuleShipping
{
    public $code;
    public $title;
    public $description;
    public $enabled;
    public $sort_order = 0;
    public $tax_class = 0;

    protected $defaultTranslationArray = [
        'MODULE_SHIPPING_JNE_TEXT_TITLE' => 'JNE',
        'MODULE_SHIPPING_JNE_TEXT_DESCRIPTION' => 'JNE shipping using rates saved in admin configuration.',
        'MODULE_SHIPPING_JNE_TEXT_WAY' => '',
    ];

    private function cfg($key, $default = '')
    {
        return defined($key) ? constant($key) : $default;
    }

    public function __construct()
    {
        parent::__construct();

        $this->code = 'jne';
        $this->title = MODULE_SHIPPING_JNE_TEXT_TITLE;
        $this->description = MODULE_SHIPPING_JNE_TEXT_DESCRIPTION;

        if (!defined('MODULE_SHIPPING_JNE_STATUS')) {
            $this->enabled = false;
            return false;
        }

        $this->sort_order = (int)$this->cfg('MODULE_SHIPPING_JNE_SORT_ORDER', 0);
        $this->tax_class = (int)$this->cfg('MODULE_SHIPPING_JNE_TAX_CLASS', 0);
        $this->enabled = $this->cfg('MODULE_SHIPPING_JNE_STATUS', 'False') === 'True';

        if ($this->enabled) {
            $zone = (int)$this->cfg('MODULE_SHIPPING_JNE_ZONE', 0);
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
            'MODULE_SHIPPING_JNE_SERVICES',
            'REG|REGULAR|0.90|0.10;YES|YES|1.20|0.15'
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
        $handling = (float)$this->cfg('MODULE_SHIPPING_JNE_HANDLING', 0);

        foreach ($this->services() as $service) {
            if ($method !== '' && $method !== $service['id'] && $method !== $this->code . '_' . $service['id']) {
                continue;
            }
            $cost = $service['base'] + ($service['per_kg'] * ceil($weight)) + $handling;
            $way = trim((string)MODULE_SHIPPING_JNE_TEXT_WAY);
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
            'MODULE_SHIPPING_JNE_STATUS' => [
                'title' => 'Enable JNE Dummy Shipping',
                'value' => 'True',
                'description' => 'Show JNE as a local dummy shipping option. No request is sent to JNE.',
                'sort_order' => '1',
                'set_function' => 'tep_cfg_select_option(array(\'True\', \'False\'), ',
            ],
            'MODULE_SHIPPING_JNE_MODE' => [
                'title' => 'JNE Mode',
                'value' => 'Dummy',
                'description' => 'Only Dummy is active. API fields below are stored for later integration.',
                'sort_order' => '2',
                'set_function' => 'tep_cfg_select_option(array(\'Dummy\'), ',
            ],
            'MODULE_SHIPPING_JNE_API_URL' => [
                'title' => 'JNE API URL',
                'value' => 'http://apiv2.jne.co.id:10102/tracing/api/pricedev',
                'description' => 'Reserved for future API integration; not called in dummy mode.',
                'sort_order' => '3',
            ],
            'MODULE_SHIPPING_JNE_USERNAME' => [
                'title' => 'JNE Username',
                'value' => '',
                'description' => 'Reserved configuration field. Leave empty for dummy mode.',
                'sort_order' => '4',
            ],
            'MODULE_SHIPPING_JNE_API_KEY' => [
                'title' => 'JNE API Key',
                'value' => '',
                'description' => 'Reserved configuration field. Do not enter live credentials yet.',
                'sort_order' => '5',
            ],
            'MODULE_SHIPPING_JNE_ORIGIN_CODE' => [
                'title' => 'JNE Origin Code',
                'value' => 'CGK10000',
                'description' => 'Reserved origin city code for future API pricing.',
                'sort_order' => '6',
            ],
            'MODULE_SHIPPING_JNE_SERVICES' => [
                'title' => 'JNE Dummy Services',
                'value' => 'REG|REGULAR|0.90|0.10;YES|YES|1.20|0.15',
                'description' => 'Format: CODE|Label|Base Cost|Cost Per Kg; separate services with semicolon.',
                'sort_order' => '7',
            ],
            'MODULE_SHIPPING_JNE_HANDLING' => [
                'title' => 'JNE Handling Fee',
                'value' => '0',
                'description' => 'Handling fee added to every dummy service quote.',
                'sort_order' => '8',
            ],
            'MODULE_SHIPPING_JNE_TAX_CLASS' => [
                'title' => 'JNE Tax Class',
                'value' => '0',
                'description' => 'Tax class applied to the shipping fee.',
                'sort_order' => '9',
                'use_function' => '\\common\\helpers\\Tax::get_tax_class_title',
                'set_function' => 'tep_cfg_pull_down_tax_classes(',
            ],
            'MODULE_SHIPPING_JNE_ZONE' => [
                'title' => 'JNE Shipping Zone',
                'value' => '0',
                'description' => 'Restrict this shipping method to a geo zone.',
                'sort_order' => '10',
                'use_function' => '\\common\\helpers\\Zones::get_zone_class_title',
                'set_function' => 'tep_cfg_pull_down_zone_classes(',
            ],
            'MODULE_SHIPPING_JNE_SORT_ORDER' => [
                'title' => 'JNE Sort Order',
                'value' => '30',
                'description' => 'Sort order of display.',
                'sort_order' => '11',
            ],
        ];
    }

    public function describe_status_key()
    {
        return new ModuleStatus('MODULE_SHIPPING_JNE_STATUS', 'True', 'False');
    }

    public function describe_sort_key()
    {
        return new ModuleSortOrder('MODULE_SHIPPING_JNE_SORT_ORDER');
    }
}
