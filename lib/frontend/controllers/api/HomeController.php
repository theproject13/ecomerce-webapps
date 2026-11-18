<?php

namespace frontend\controllers\api;

use common\classes\platform;
use common\models\Categories;
use common\models\CategoriesDescription;
use Yii;

/**
 * Kategori homepage untuk storefront React.
 *
 * Kenapa controller sendiri, bukan memakai endpoint yang sudah ada:
 *
 *  - /api/catalog/categories (CatalogController) sengaja tidak diubah. Bentuk
 *    responsnya dipakai konsumen lama dan hanya berisi id/status/tanggal, tanpa
 *    nama, tanpa scoping platform, dan memasukkan kategori kosong.
 *  - actionCategories() di StorefrontController sudah menyertakan nama dan
 *    scoping platform, tetapi hanya mengembalikan kategori yang PUNYA produk
 *    (innerJoin products_to_categories). Kategori "Kategori Populer" yang belum
 *    diisi produk tidak akan muncul di sana.
 *
 * Endpoint ini memakai flag "Show on home" (categories.show_on_home) sebagai
 * kontrolnya, jadi admin mengatur tampil/tidaknya lewat Catalog admin yang ada,
 * tanpa perubahan kode.
 *
 * Rute: GET /api/home/categories
 */
class HomeController extends BaseApiController
{
    private function platformId()
    {
        return (int)platform::currentId();
    }

    /**
     * Kategori untuk grid "Kategori Populer" + daftar layanan.
     *
     * Bentuk:
     *   items: [
     *     { category_id, parent_id, name, children: [ {category_id, parent_id, name} ] }
     *   ]
     *
     * Yang dikembalikan hanyalah kategori top-level (parent_id = 0) dengan
     * show_on_home = 1, beserta anak langsungnya. Anak ikut walaupun
     * show_on_home-nya 0 supaya pemilik hanya perlu menyalakan flag pada
     * kategori induk; daftar layanan (mis. Pulsa, Paket Data) tidak perlu
     * dicentang satu per satu.
     */
    public function actionCategories()
    {
        $platformId = $this->platformId();
        $languagesId = (int)Yii::$app->settings->get('languages_id');

        $topLevel = $this->categoryRows($platformId, $languagesId, 0, true);

        $items = [];
        $topIds = [];

        foreach ($topLevel as $row) {
            $categoryId = (int)$row['category_id'];
            $topIds[] = $categoryId;

            $items[$categoryId] = [
                'category_id' => $categoryId,
                'parent_id' => (int)$row['parent_id'],
                'name' => (string)$row['name'],
                'children' => [],
            ];
        }

        // Anak langsung dari semua top-level, satu query. Kalau tidak ada
        // top-level, lewati query kedua.
        if ($topIds !== []) {
            $children = $this->categoryRows($platformId, $languagesId, $topIds, false);

            foreach ($children as $row) {
                $parentId = (int)$row['parent_id'];
                if (!isset($items[$parentId])) {
                    continue;
                }

                $items[$parentId]['children'][] = [
                    'category_id' => (int)$row['category_id'],
                    'parent_id' => $parentId,
                    'name' => (string)$row['name'],
                ];
            }
        }

        return [
            'items' => array_values($items),
            'meta' => [
                'platform_id' => $platformId,
                'language_id' => $languagesId,
                'total_count' => count($items),
            ],
            'error' => null,
        ];
    }

    /**
     * Baris kategori (id, parent, nama) yang aktif dan milik platform ini.
     *
     * $parents boleh 0 (top-level) atau daftar id (anak dari induk tertentu).
     * $onlyHome menambahkan syarat show_on_home = 1.
     *
     * Nama diambil dari categories_description untuk bahasa aktif. Kategori
     * tanpa deskripsi di bahasa itu (mis. bahasa ketiga) tidak dikembalikan;
     * itulah trade-off innerJoin yang sama dipakai StorefrontController.
     */
    private function categoryRows($platformId, $languagesId, $parents, $onlyHome)
    {
        $query = Categories::find()
            ->alias('category')
            ->innerJoin(
                ['description' => CategoriesDescription::tableName()],
                'description.categories_id = category.categories_id'
                . ' AND description.language_id = :languages_id',
                [':languages_id' => $languagesId]
            )
            ->innerJoin(
                ['platform_category' => '{{%platforms_categories}}'],
                'platform_category.categories_id = category.categories_id'
                . ' AND platform_category.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->select([
                'category_id' => 'category.categories_id',
                'parent_id' => 'category.parent_id',
                'name' => 'description.categories_name',
                'sort_order' => 'category.sort_order',
            ])
            ->where(['category.categories_status' => 1]);

        if (is_array($parents)) {
            $query->andWhere(['category.parent_id' => $parents]);
        } else {
            $query->andWhere(['category.parent_id' => (int)$parents]);
        }

        if ($onlyHome) {
            $query->andWhere(['category.show_on_home' => 1]);
        }

        return $query
            ->orderBy(['category.sort_order' => SORT_ASC, 'category.categories_id' => SORT_ASC])
            ->asArray()
            ->all();
    }
}
