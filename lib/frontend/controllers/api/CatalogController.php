<?php

namespace frontend\controllers\api;

use Yii;
use yii\web\Response;
use common\models\Products;
use common\models\Categories;
use common\models\ProductsDescription;
use common\models\CategoriesDescription;

class CatalogController extends BaseApiController
{
    public function actionProducts()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $limit = (int)Yii::$app->request->get('per_page', 12);
        if ($limit < 1 || $limit > 50) {
            $limit = 12;
        }
        $page = (int)Yii::$app->request->get('page', 1);
        if ($page < 1) {
            $page = 1;
        }

        $query = Products::find()
            ->select([
                'products.products_id',
                'products.products_model',
                'products.products_price',
                'products.products_status',
                'products.products_quantity',
                'products.products_date_added',
                'products.products_last_modified',
            ])
            ->where(['products_status' => 1]);

        $totalCount = $query->count();

        $products = $query
            ->orderBy(['products_date_added' => SORT_DESC])
            ->offset(($page - 1) * $limit)
            ->limit($limit)
            ->asArray()
            ->all();

        return [
            'items' => $products,
            'total_count' => (int)$totalCount,
            'page' => $page,
            'per_page' => $limit,
        ];
    }

    public function actionCategories()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $categories = Categories::find()
            ->select([
                'categories.categories_id',
                'categories.parent_id',
                'categories.categories_status',
                'categories.date_added',
                'categories.last_modified',
            ])
            ->where(['categories_status' => 1])
            ->orderBy(['sort_order' => SORT_ASC, 'categories_id' => SORT_ASC])
            ->asArray()
            ->all();

        return [
            'items' => $categories,
        ];
    }
}
