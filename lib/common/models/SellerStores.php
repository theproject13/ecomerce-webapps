<?php

namespace common\models;

use yii\db\ActiveRecord;

class SellerStores extends ActiveRecord
{
    public static function tableName()
    {
        return 'seller_stores';
    }

    public function rules()
    {
        return [
            [['applications_id', 'customers_id', 'suppliers_id', 'status'], 'integer'],
            [['store_name'], 'string', 'max' => 128],
            [['store_name'], 'default', 'value' => ''],
            [['status'], 'default', 'value' => 1],
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

    public function getSupplier()
    {
        return $this->hasOne(Suppliers::className(), ['suppliers_id' => 'suppliers_id']);
    }

    public function getProducts()
    {
        return $this->hasMany(SellerProducts::className(), ['stores_id' => 'stores_id']);
    }
}
