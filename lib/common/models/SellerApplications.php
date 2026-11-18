<?php

namespace common\models;

use yii\db\ActiveRecord;

/**
 * Pengajuan toko dari storefront React.
 *
 * Satu baris mewakili satu pengajuan. Status 0 = menunggu, 1 = disetujui,
 * 2 = ditolak. Tabel dibuat oleh migration m261101_120000_seller_applications.
 */
class SellerApplications extends ActiveRecord
{
    const STATUS_PENDING = 0;
    const STATUS_APPROVED = 1;
    const STATUS_REJECTED = 2;

    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'seller_applications';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['store_name', 'contact_name', 'contact_phone', 'street_address', 'city'], 'required'],
            [['store_name', 'category', 'contact_name', 'contact_phone', 'contact_email', 'street_address', 'city', 'postcode'], 'string', 'max' => 255],
            [['description'], 'string'],
            [['customers_id', 'status'], 'integer'],
            [['customers_id', 'status'], 'default', 'value' => 0],
            [['category', 'contact_email', 'postcode'], 'default', 'value' => ''],
            [['description'], 'default', 'value' => ''],
        ];
    }

    /**
     * @inheritdoc
     */
    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            if ($insert && empty($this->date_added)) {
                $this->date_added = date('Y-m-d H:i:s');
            }
            return true;
        }

        return false;
    }

    /**
     * Label status untuk tampilan backend.
     */
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
}
