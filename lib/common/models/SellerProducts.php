<?php

namespace common\models;

use yii\db\ActiveRecord;

class SellerProducts extends ActiveRecord
{
    const STATUS_PENDING = 0;
    const STATUS_APPROVED = 1;
    const STATUS_REJECTED = 2;

    public static function tableName()
    {
        return 'seller_products';
    }

    public function rules()
    {
        return [
            [['stores_id', 'products_id', 'status'], 'integer'],
            [['reject_reason'], 'string'],
            [['status'], 'default', 'value' => self::STATUS_PENDING],
            [['reject_reason'], 'default', 'value' => ''],
        ];
    }

    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            $now = date('Y-m-d H:i:s');
            if ($insert) {
                $this->date_added = $now;
            }
            $this->last_modified = $now;

            return true;
        }

        return false;
    }

    public static function statusLabels()
    {
        return [
            self::STATUS_PENDING => 'Menunggu',
            self::STATUS_APPROVED => 'Disetujui',
            self::STATUS_REJECTED => 'Ditolak',
        ];
    }

    public function getStatusLabel()
    {
        $labels = self::statusLabels();

        return $labels[(int)$this->status] ?? '-';
    }

    public function getProduct()
    {
        return $this->hasOne(Products::className(), ['products_id' => 'products_id']);
    }

    public function getStore()
    {
        return $this->hasOne(SellerStores::className(), ['stores_id' => 'stores_id']);
    }
}
