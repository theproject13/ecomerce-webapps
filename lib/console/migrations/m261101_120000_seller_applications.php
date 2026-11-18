<?php

use common\classes\Migration;

/**
 * Class m261101_120000_seller_applications
 *
 * Menyimpan pengajuan toko dari storefront React (halaman
 * /seller-center/daftar-toko) agar bisa ditinjau di backend.
 */
class m261101_120000_seller_applications extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp()
    {
        $this->addTranslation('admin/main', [
            'BOX_CATALOG_SELLER_APPLICATIONS' => [
                'en' => 'Seller Applications',
                'id' => 'Pengajuan Toko',
            ],
        ]);

        if ($this->db->getTableSchema('seller_applications', true) === null) {
            $this->createTable('seller_applications', [
                'applications_id' => $this->primaryKey(),
                'customers_id' => $this->integer(11)->notNull()->defaultValue(0),
                'store_name' => $this->string(128)->notNull()->defaultValue(''),
                'category' => $this->string(128)->notNull()->defaultValue(''),
                'description' => $this->text(),
                'contact_name' => $this->string(128)->notNull()->defaultValue(''),
                'contact_phone' => $this->string(64)->notNull()->defaultValue(''),
                'contact_email' => $this->string(128)->notNull()->defaultValue(''),
                'street_address' => $this->string(255)->notNull()->defaultValue(''),
                'city' => $this->string(128)->notNull()->defaultValue(''),
                'postcode' => $this->string(32)->notNull()->defaultValue(''),
                'status' => $this->tinyInteger(1)->notNull()->defaultValue(0),
                'date_added' => $this->dateTime()->notNull()->defaultValue('0000-00-00 00:00:00'),
            ]);

            try {
                $this->createIndex('idx_seller_applications_customers_id', 'seller_applications', ['customers_id']);
                $this->createIndex('idx_seller_applications_status', 'seller_applications', ['status']);
            } catch (\Exception $ex) {
            }
        }

        $this->appendAcl(['BOX_HEADING_CATALOG', 'BOX_CATALOG_SELLER_APPLICATIONS']);

        $this->addAdminMenuAfter([
            'path' => 'seller-applications',
            'title' => 'BOX_CATALOG_SELLER_APPLICATIONS',
        ], 'BOX_CATALOG_SUPPIERS');
    }

    /**
     * @inheritdoc
     */
    public function safeDown()
    {
        $this->removeAdminMenu('BOX_CATALOG_SELLER_APPLICATIONS');
        $this->removeAcl(['BOX_HEADING_CATALOG', 'BOX_CATALOG_SELLER_APPLICATIONS']);

        if ($this->db->getTableSchema('seller_applications', true) !== null) {
            $this->dropTable('seller_applications');
        }
    }
}
