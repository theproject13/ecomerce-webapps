<?php

use common\classes\Migration;

/**
 * Mapping toko seller ke supplier core dan pengajuan produk seller.
 */
class m261101_130000_seller_stores_products extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('seller_stores', true) === null) {
            $this->createTable('seller_stores', [
                'stores_id' => $this->primaryKey(),
                'applications_id' => $this->integer(11)->notNull()->defaultValue(0),
                'customers_id' => $this->integer(11)->notNull()->defaultValue(0),
                'suppliers_id' => $this->integer(11)->notNull()->defaultValue(0),
                'store_name' => $this->string(128)->notNull()->defaultValue(''),
                'status' => $this->tinyInteger(1)->notNull()->defaultValue(1),
                'date_added' => $this->dateTime()->notNull()->defaultValue('0000-00-00 00:00:00'),
                'last_modified' => $this->dateTime()->notNull()->defaultValue('0000-00-00 00:00:00'),
            ]);

            try {
                $this->createIndex('idx_seller_stores_customers_id', 'seller_stores', ['customers_id']);
                $this->createIndex('idx_seller_stores_applications_id', 'seller_stores', ['applications_id'], true);
                $this->createIndex('idx_seller_stores_suppliers_id', 'seller_stores', ['suppliers_id']);
            } catch (\Exception $ex) {
            }
        }

        if ($this->db->getTableSchema('seller_products', true) === null) {
            $this->createTable('seller_products', [
                'seller_products_id' => $this->primaryKey(),
                'stores_id' => $this->integer(11)->notNull()->defaultValue(0),
                'products_id' => $this->integer(11)->notNull()->defaultValue(0),
                'status' => $this->tinyInteger(1)->notNull()->defaultValue(0),
                'reject_reason' => $this->text(),
                'date_added' => $this->dateTime()->notNull()->defaultValue('0000-00-00 00:00:00'),
                'last_modified' => $this->dateTime()->notNull()->defaultValue('0000-00-00 00:00:00'),
            ]);

            try {
                $this->createIndex('idx_seller_products_stores_id', 'seller_products', ['stores_id']);
                $this->createIndex('idx_seller_products_products_id', 'seller_products', ['products_id'], true);
                $this->createIndex('idx_seller_products_status', 'seller_products', ['status']);
            } catch (\Exception $ex) {
            }
        }
    }

    public function safeDown()
    {
        if ($this->db->getTableSchema('seller_products', true) !== null) {
            $this->dropTable('seller_products');
        }

        if ($this->db->getTableSchema('seller_stores', true) !== null) {
            $this->dropTable('seller_stores');
        }
    }
}
