<?php

namespace common\services;

use common\models\SellerApplications;
use common\models\SellerStores;
use common\models\Suppliers;
use Yii;

class SellerStoreService
{
    public static function provision(SellerApplications $application)
    {
        $store = SellerStores::find()
            ->where(['applications_id' => $application->applications_id])
            ->one();

        if ($store !== null) {
            return $store;
        }

        $store = SellerStores::find()
            ->where(['customers_id' => $application->customers_id])
            ->one();

        if ($store !== null) {
            return $store;
        }

        $supplier = new Suppliers();
        $supplier->loadDefaultValues();
        $supplier->suppliers_name = mb_substr($application->store_name, 0, 96);
        $supplier->company = mb_substr($application->store_name, 0, 128);
        $supplier->contact_name = $application->contact_name;
        $supplier->contact_phone = $application->contact_phone;
        $supplier->street_address = $application->street_address;
        $supplier->city = $application->city;
        $supplier->postcode = $application->postcode;
        $supplier->country = 'ID';
        $supplier->condition = '';
        $supplier->condition_description = (string)$application->description;
        $supplier->status = 1;
        $supplier->is_default = 0;

        if (!$supplier->save(false)) {
            throw new \RuntimeException('Supplier toko gagal dibuat.');
        }

        $store = new SellerStores();
        $store->applications_id = (int)$application->applications_id;
        $store->customers_id = (int)$application->customers_id;
        $store->suppliers_id = (int)$supplier->suppliers_id;
        $store->store_name = mb_substr($application->store_name, 0, 128);
        $store->status = 1;

        if (!$store->save(false)) {
            throw new \RuntimeException('Mapping toko seller gagal dibuat.');
        }

        return $store;
    }

    public static function provisionIfApproved(SellerApplications $application)
    {
        if ((int)$application->status !== SellerApplications::STATUS_APPROVED) {
            return null;
        }

        try {
            return self::provision($application);
        } catch (\Throwable $ex) {
            Yii::warning($ex->getMessage(), 'seller-store-provision');
            return null;
        }
    }
}
