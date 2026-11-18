<?php

namespace frontend\controllers\api;

use common\classes\platform;
use common\helpers\Categories as CategoriesHelper;
use common\models\Categories;
use common\models\CategoriesDescription;
use Yii;
use yii\web\NotFoundHttpException;

/**
 * Halaman landing kategori untuk storefront React.
 *
 * Rute: GET /api/category/detail?id=<categories_id>
 *
 * Kenapa controller sendiri:
 *
 *  - /api/storefront/categories hanya mengembalikan kategori yang PUNYA produk
 *    (innerJoin products_to_categories) dan tidak menyertakan deskripsi/gambar.
 *  - /api/home/categories khusus grid homepage (show_on_home) dan tidak membawa
 *    deskripsi, gambar, maupun breadcrumb.
 *
 * Kategori kanonis osCommerce (/ecomerce-webapps/<slug>) dilayani tema PHP. Halaman
 * React ini memakai id lewat query string (mirip product-detail?id=) supaya nama
 * path tetap bisa dicocokkan sebagai daftar nama di ReactShell.
 *
 * Daftar produk TIDAK diambil di sini; halaman memakai endpoint katalog yang
 * sudah ada (/api/storefront/products?category_id=) agar paginasi, sort, dan
 * scoping platform konsisten dengan halaman katalog lain.
 */
class CategoryController extends BaseApiController
{
    /**
     * @param int|string $id categories_id
     */
    public function actionDetail($id)
    {
        $categoryId = (int)$id;
        if ($categoryId <= 0) {
            throw new NotFoundHttpException('Kategori tidak ditemukan.');
        }

        $platformId = (int)platform::currentId();
        $languagesId = (int)Yii::$app->settings->get('languages_id');

        $category = $this->categoryRow($categoryId, $languagesId, $platformId);
        if ($category === null) {
            throw new NotFoundHttpException('Kategori tidak ditemukan.');
        }

        return [
            'items' => [
                'category_id' => $categoryId,
                'parent_id' => (int)$category['parent_id'],
                'name' => (string)$category['name'],
                'description' => (string)$category['description'],
                'image' => $this->categoryImage($category['image']),
                'children' => $this->children($categoryId, $languagesId, $platformId),
                'breadcrumb' => $this->breadcrumb($categoryId, $languagesId),
            ],
            'meta' => [
                'platform_id' => $platformId,
                'language_id' => $languagesId,
                'currency' => \common\helpers\Currencies::systemCurrencyCode(),
            ],
            'error' => null,
        ];
    }

    /**
     * Baris kategori untuk bahasa dan platform aktif.
     *
     * Kategori global (categories_description tidak punya platform_id), tetapi
     * tetap di-scope platform lewat platforms_categories supaya kategori kanal
     * lain tidak bocor. Kategori tanpa deskripsi di bahasa aktif tidak
     * ditemukan, sama seperti perilaku endpoint lain.
     *
     * @return array|null
     */
    private function categoryRow($categoryId, $languagesId, $platformId)
    {
        $row = Categories::find()
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
                'description' => 'description.categories_description',
                'image' => 'category.categories_image',
            ])
            ->where([
                'category.categories_id' => $categoryId,
                'category.categories_status' => 1,
            ])
            ->asArray()
            ->one();

        return $row === false ? null : $row;
    }

    /**
     * Anak langsung kategori ini, platform-scoped, tanpa syarat punya produk.
     * Gunanya untuk tile sub-kategori di halaman landing.
     */
    private function children($parentId, $languagesId, $platformId)
    {
        $rows = Categories::find()
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
                'name' => 'description.categories_name',
                'image' => 'category.categories_image',
            ])
            ->where([
                'category.parent_id' => $parentId,
                'category.categories_status' => 1,
            ])
            ->orderBy(['category.sort_order' => SORT_ASC, 'category.categories_id' => SORT_ASC])
            ->asArray()
            ->all();

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'category_id' => (int)$row['category_id'],
                'name' => (string)$row['name'],
                'image' => $this->categoryImage($row['image']),
            ];
        }

        return $items;
    }

    /**
     * Jalur induk -> kategori ini, untuk breadcrumb halaman.
     */
    private function breadcrumb($categoryId, $languagesId)
    {
        $trail = [];

        $ancestors = [];
        CategoriesHelper::get_parent_categories($ancestors, $categoryId);
        $ancestors = array_reverse((array)$ancestors);

        foreach ($ancestors as $ancestorId) {
            $ancestorId = (int)$ancestorId;
            $name = CategoriesHelper::get_categories_name($ancestorId, $languagesId);

            $trail[] = [
                'category_id' => $ancestorId,
                'name' => (string)$name,
            ];
        }

        $name = CategoriesHelper::get_categories_name($categoryId, $languagesId);
        $trail[] = [
            'category_id' => $categoryId,
            'name' => (string)$name,
        ];

        return $trail;
    }

    /**
     * URL gambar kategori, null bila berkas tidak ada.
     *
     * categories_image disimpan relatif terhadap images/ (DIR_WS_IMAGES),
     * sama seperti data lama, jadi frontend cukup meneruskannya ke <img src>.
     */
    private function categoryImage($image)
    {
        $image = trim((string)$image);
        if ($image === '' || $image === '0') {
            return null;
        }

        if (!defined('DIR_FS_CATALOG') || !defined('DIR_WS_IMAGES')) {
            return null;
        }

        if (!is_file(DIR_FS_CATALOG . DIR_WS_IMAGES . $image)) {
            return null;
        }

        return DIR_WS_IMAGES . $image;
    }
}
