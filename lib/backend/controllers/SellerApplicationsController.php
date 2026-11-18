<?php

namespace backend\controllers;

use common\models\Products;
use common\models\ProductsDescription;
use common\models\SellerApplications;
use common\models\SellerProducts;
use common\models\SellerStores;
use common\services\SellerStoreService;
use Yii;

/**
 * Pengajuan toko dan moderasi produk seller dari storefront React.
 */
class SellerApplicationsController extends Sceleton
{
    public $acl = ['BOX_HEADING_CATALOG', 'BOX_CATALOG_SELLER_APPLICATIONS'];

    public function actionIndex()
    {
        $this->selectedMenu = ['catalog', 'seller-applications'];

        $title = defined('BOX_CATALOG_SELLER_APPLICATIONS')
            ? BOX_CATALOG_SELLER_APPLICATIONS
            : 'Seller Applications';

        $this->navigation[] = [
            'link' => Yii::$app->urlManager->createUrl('seller-applications/index'),
            'title' => $title,
        ];

        $this->view->headingTitle = $title;

        $applications = SellerApplications::find()
            ->orderBy(['status' => SORT_ASC, 'date_added' => SORT_DESC, 'applications_id' => SORT_DESC])
            ->asArray()
            ->all();

        $stores = SellerStores::find()
            ->select(['store_name', 'applications_id'])
            ->indexBy('applications_id')
            ->asArray()
            ->all();

        return $this->render('index', [
            'applications' => $applications,
            'statusLabels' => SellerApplications::statusLabels(),
            'stores' => $stores,
            'pendingProducts' => SellerProducts::find()
                ->where(['status' => SellerProducts::STATUS_PENDING])
                ->count(),
        ]);
    }

    public function actionSetStatus()
    {
        if (!Yii::$app->request->isPost) {
            return $this->redirect(['seller-applications/index']);
        }

        $applicationsId = (int)Yii::$app->request->post('applications_id', 0);
        $status = (int)Yii::$app->request->post('status', SellerApplications::STATUS_PENDING);

        if ($applicationsId > 0 && array_key_exists($status, SellerApplications::statusLabels())) {
            $model = SellerApplications::findOne($applicationsId);
            if ($model !== null) {
                $transaction = Yii::$app->db->beginTransaction();
                try {
                    $model->status = $status;
                    $model->save(false);

                    if ($status === SellerApplications::STATUS_APPROVED) {
                        SellerStoreService::provision($model);
                    }

                    $transaction->commit();
                } catch (\Throwable $ex) {
                    $transaction->rollBack();
                    Yii::warning($ex->getMessage(), 'seller-application-approve');
                    Yii::$app->session->setFlash('error', 'Toko gagal diproses: ' . $ex->getMessage());
                }
            }
        }

        return $this->redirect(['seller-applications/index']);
    }

    public function actionProducts()
    {
        $this->selectedMenu = ['catalog', 'seller-applications'];

        $title = 'Produk Seller';

        $this->navigation[] = [
            'link' => Yii::$app->urlManager->createUrl('seller-applications/index'),
            'title' => defined('BOX_CATALOG_SELLER_APPLICATIONS')
                ? BOX_CATALOG_SELLER_APPLICATIONS
                : 'Seller Applications',
        ];
        $this->navigation[] = [
            'link' => Yii::$app->urlManager->createUrl('seller-applications/products'),
            'title' => $title,
        ];

        $this->view->headingTitle = $title;

        $products = SellerProducts::find()
            ->alias('sp')
            ->innerJoin(['store' => SellerStores::tableName()], 'store.stores_id = sp.stores_id')
            ->innerJoin(['product' => Products::tableName()], 'product.products_id = sp.products_id')
            ->leftJoin(
                ['description' => ProductsDescription::tableName()],
                'description.products_id = sp.products_id AND description.language_id = 1'
            )
            ->select([
                'sp.seller_products_id',
                'sp.products_id',
                'sp.status',
                'sp.reject_reason',
                'sp.date_added',
                'store.store_name',
                'store.suppliers_id',
                'product.products_price',
                'product.products_quantity',
                'product.products_status',
                'product.products_image',
                'description.products_name',
            ])
            ->groupBy(['sp.seller_products_id'])
            ->orderBy(['sp.status' => SORT_ASC, 'sp.date_added' => SORT_DESC])
            ->asArray()
            ->all();

        $currencies = Yii::$container->get('currencies');
        foreach ($products as $key => $row) {
            $products[$key]['price_display'] = 'Rp ' . number_format(
                (float)$currencies->format_clear((float)$row['products_price'], true, 'IDR'),
                0,
                ',',
                '.'
            );
        }

        return $this->render('products', [
            'products' => $products,
            'statusLabels' => SellerProducts::statusLabels(),
        ]);
    }

    public function actionSetProductStatus()
    {
        if (!Yii::$app->request->isPost) {
            return $this->redirect(['seller-applications/products']);
        }

        $sellerProductsId = (int)Yii::$app->request->post('seller_products_id', 0);
        $status = (int)Yii::$app->request->post('status', SellerProducts::STATUS_PENDING);
        $reason = trim((string)Yii::$app->request->post('reject_reason', ''));

        $model = SellerProducts::findOne($sellerProductsId);
        if ($model !== null && array_key_exists($status, SellerProducts::statusLabels())) {
            $transaction = Yii::$app->db->beginTransaction();
            try {
                $product = Products::findOne($model->products_id);
                if ($product !== null) {
                    $product->products_status = $status === SellerProducts::STATUS_APPROVED ? 1 : 0;
                    $product->save(false);
                }

                $model->status = $status;
                $model->reject_reason = $status === SellerProducts::STATUS_REJECTED ? $reason : '';
                $model->save(false);

                $transaction->commit();
            } catch (\Throwable $ex) {
                $transaction->rollBack();
                Yii::warning($ex->getMessage(), 'seller-product-moderate');
            }
        }

        return $this->redirect(['seller-applications/products']);
    }

}
