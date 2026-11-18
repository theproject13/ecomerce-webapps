<?php

namespace frontend\controllers\api;

use common\api\Classes\Product as ApiProduct;
use common\classes\Images;
use common\classes\platform;
use common\models\Categories;
use common\models\CategoriesDescription;
use common\models\PlatformsCategories;
use common\models\Products;
use common\models\ProductsDescription;
use common\models\SellerApplications;
use common\models\SellerProducts;
use common\models\SellerStores;
use common\models\SuppliersProducts;
use common\services\SellerStoreService;
use Yii;
use yii\web\UploadedFile;

/**
 * API pengajuan toko untuk halaman /seller-center/daftar-toko.
 *
 * Endpoint:
 *   GET  /api/seller/csrf  -> token CSRF sesi berjalan
 *   POST /api/seller/apply -> simpan pengajuan toko milik customer yang login
 *
 * Validasi dan kepemilikan data tetap di PHP. customers_id dan contact_email
 * diambil dari session, bukan dari input klien, supaya pengajuan tidak bisa
 * dipalsukan menjadi milik akun lain.
 */
class SellerController extends BaseApiController
{
    /**
     * GET /api/seller/csrf
     */
    public function actionCsrf()
    {
        return [
            'ok' => true,
            'csrfToken' => (string)Yii::$app->request->getCsrfToken(),
        ];
    }

    /**
     * POST /api/seller/apply
     *
     * Body form-urlencoded:
     *   store_name, category, custom_category, description, contact_name,
     *   contact_phone, street_address, city, postcode
     */
    public function actionApply()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.');
        }

        if (Yii::$app->user->isGuest) {
            Yii::$app->response->setStatusCode(401);

            return $this->error('Silakan masuk dulu untuk mengajukan toko.');
        }

        $post = Yii::$app->request->post();

        $storeName = $this->text($post, 'store_name');
        $category = $this->text($post, 'category');
        $customCategory = $this->text($post, 'custom_category');
        $description = $this->text($post, 'description');
        $contactName = $this->text($post, 'contact_name');
        $contactPhone = $this->text($post, 'contact_phone');
        $streetAddress = $this->text($post, 'street_address');
        $city = $this->text($post, 'city');
        $postcode = $this->text($post, 'postcode');

        if ($category === 'Lainnya') {
            $category = $customCategory;
        }

        $fieldErrors = [];

        if (mb_strlen($storeName) < 3) {
            $fieldErrors['store_name'] = 'Nama toko minimal 3 karakter.';
        } elseif (mb_strlen($storeName) > 128) {
            $fieldErrors['store_name'] = 'Nama toko maksimal 128 karakter.';
        }

        if ($category === '') {
            $fieldErrors['category'] = 'Pilih kategori toko.';
        } elseif (mb_strlen($category) > 128) {
            $fieldErrors['category'] = 'Kategori maksimal 128 karakter.';
        }

        if (mb_strlen($description) > 2000) {
            $fieldErrors['description'] = 'Deskripsi maksimal 2000 karakter.';
        }

        if (mb_strlen($contactName) < 2) {
            $fieldErrors['contact_name'] = 'Nama penanggung jawab minimal 2 karakter.';
        }

        if (mb_strlen($contactPhone) < 8) {
            $fieldErrors['contact_phone'] = 'Nomor telepon minimal 8 digit.';
        } elseif (mb_strlen($contactPhone) > 64) {
            $fieldErrors['contact_phone'] = 'Nomor telepon terlalu panjang.';
        }

        if (mb_strlen($streetAddress) < 5) {
            $fieldErrors['street_address'] = 'Alamat toko minimal 5 karakter.';
        }

        if (mb_strlen($city) < 2) {
            $fieldErrors['city'] = 'Isi kota asal pengiriman.';
        }

        if (mb_strlen($postcode) > 32) {
            $fieldErrors['postcode'] = 'Kode pos terlalu panjang.';
        }

        if ($fieldErrors !== []) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Periksa kembali data toko kamu.', $fieldErrors);
        }

        $customersId = (int)Yii::$app->user->getId();

        $pending = SellerApplications::find()
            ->where([
                'customers_id' => $customersId,
                'store_name' => $storeName,
                'status' => SellerApplications::STATUS_PENDING,
            ])
            ->exists();

        if ($pending) {
            Yii::$app->response->setStatusCode(409);

            return $this->error('Pengajuan dengan nama toko ini sedang ditinjau.');
        }

        $identity = Yii::$app->user->identity;

        $model = new SellerApplications();
        $model->customers_id = $customersId;
        $model->store_name = $storeName;
        $model->category = $category;
        $model->description = $description;
        $model->contact_name = $contactName;
        $model->contact_phone = $contactPhone;
        $model->contact_email = isset($identity->customers_email_address)
            ? (string)$identity->customers_email_address
            : '';
        $model->street_address = $streetAddress;
        $model->city = $city;
        $model->postcode = $postcode;
        $model->status = SellerApplications::STATUS_PENDING;
        $model->date_added = date('Y-m-d H:i:s');

        if (!$model->save()) {
            Yii::$app->response->setStatusCode(422);
            $errors = [];
            foreach ($model->getFirstErrors() as $attribute => $message) {
                $errors[$attribute] = $message;
            }

            return $this->error('Pengajuan toko gagal disimpan.', $errors);
        }

        return [
            'ok' => true,
            'items' => [
                'applications_id' => (int)$model->applications_id,
                'status' => (int)$model->status,
            ],
            'error' => null,
        ];
    }

    /**
     * GET /api/seller/store
     */
    public function actionStore()
    {
        if (Yii::$app->user->isGuest) {
            Yii::$app->response->setStatusCode(401);

            return $this->error('Silakan masuk dulu.');
        }

        $customerId = (int)Yii::$app->user->getId();
        $application = SellerApplications::find()
            ->where(['customers_id' => $customerId])
            ->orderBy(['applications_id' => SORT_DESC])
            ->one();

        if ($application !== null) {
            SellerStoreService::provisionIfApproved($application);
        }

        $store = SellerStores::find()
            ->where(['customers_id' => $customerId, 'status' => 1])
            ->one();

        $applicationData = null;
        if ($application !== null) {
            $applicationData = [
                'applications_id' => (int)$application->applications_id,
                'store_name' => (string)$application->store_name,
                'status' => (int)$application->status,
                'status_label' => $application->getStatusLabel(),
            ];
        }

        return [
            'ok' => true,
            'items' => [
                'store' => $store === null ? null : [
                    'stores_id' => (int)$store->stores_id,
                    'store_name' => (string)$store->store_name,
                    'suppliers_id' => (int)$store->suppliers_id,
                ],
                'application' => $applicationData,
            ],
            'error' => null,
        ];
    }

    /**
     * GET /api/seller/categories
     */
    public function actionCategories()
    {
        if (Yii::$app->user->isGuest) {
            Yii::$app->response->setStatusCode(401);

            return $this->error('Silakan masuk dulu.');
        }

        $languageId = (int)Yii::$app->settings->get('languages_id');
        $platformId = (int)platform::currentId();

        $rows = Categories::find()
            ->alias('category')
            ->innerJoin(
                ['description' => CategoriesDescription::tableName()],
                'description.categories_id = category.categories_id AND description.language_id = :language_id',
                [':language_id' => $languageId]
            )
            ->innerJoin(
                ['platform_category' => PlatformsCategories::tableName()],
                'platform_category.categories_id = category.categories_id AND platform_category.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->select([
                'category_id' => 'category.categories_id',
                'parent_id' => 'category.parent_id',
                'name' => 'description.categories_name',
            ])
            ->where(['category.categories_status' => 1])
            ->orderBy(['category.sort_order' => SORT_ASC, 'category.categories_id' => SORT_ASC])
            ->asArray()
            ->all();

        $children = [];
        foreach ($rows as $row) {
            $children[(int)$row['parent_id']][] = $row;
        }

        $items = [];
        $walk = function ($parentId, $depth) use (&$walk, &$items, $children) {
            foreach ($children[$parentId] ?? [] as $row) {
                $items[] = [
                    'category_id' => (int)$row['category_id'],
                    'parent_id' => (int)$row['parent_id'],
                    'name' => (string)$row['name'],
                    'depth' => (int)$depth,
                ];
                $walk((int)$row['category_id'], $depth + 1);
            }
        };
        $walk(0, 0);

        return [
            'ok' => true,
            'items' => $items,
            'error' => null,
        ];
    }

    /**
     * GET /api/seller/products
     */
    public function actionProducts()
    {
        if (Yii::$app->user->isGuest) {
            Yii::$app->response->setStatusCode(401);

            return $this->error('Silakan masuk dulu.');
        }

        $store = $this->currentStore();
        if ($store === null) {
            Yii::$app->response->setStatusCode(403);

            return $this->error('Toko belum aktif.');
        }

        $languageId = (int)Yii::$app->settings->get('languages_id');
        $rows = SellerProducts::find()
            ->alias('seller_product')
            ->innerJoin(['product' => Products::tableName()], 'product.products_id = seller_product.products_id')
            ->leftJoin(
                ['description' => ProductsDescription::tableName()],
                'description.products_id = seller_product.products_id'
                . ' AND description.language_id = :language_id',
                [':language_id' => $languageId]
            )
            ->select([
                'seller_products_id' => 'seller_product.seller_products_id',
                'products_id' => 'seller_product.products_id',
                'status' => 'seller_product.status',
                'reject_reason' => 'seller_product.reject_reason',
                'date_added' => 'seller_product.date_added',
                'products_name' => 'description.products_name',
                'products_price' => 'product.products_price',
                'products_quantity' => 'product.products_quantity',
            ])
            ->where(['seller_product.stores_id' => $store->stores_id])
            ->groupBy(['seller_product.seller_products_id'])
            ->orderBy(['seller_product.date_added' => SORT_DESC])
            ->asArray()
            ->all();

        $currencies = Yii::$container->get('currencies');
        foreach ($rows as $key => $row) {
            $rows[$key]['price_idr'] = round(
                (float)$currencies->format_clear((float)$row['products_price'], true, 'IDR'),
                2
            );
            $rows[$key]['image_url'] = $this->productImage((int)$row['products_id']);
            $rows[$key]['status_label'] = SellerProducts::statusLabels()[(int)$row['status']] ?? '-';
        }

        return [
            'ok' => true,
            'items' => $rows,
            'error' => null,
        ];
    }

    /**
     * POST /api/seller/create-product (multipart)
     */
    public function actionCreateProduct()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->setStatusCode(405);

            return $this->error('Metode harus POST.');
        }

        if (Yii::$app->user->isGuest) {
            Yii::$app->response->setStatusCode(401);

            return $this->error('Silakan masuk dulu.');
        }

        $store = $this->currentStore();
        if ($store === null) {
            Yii::$app->response->setStatusCode(403);

            return $this->error('Toko belum aktif.');
        }

        $post = Yii::$app->request->post();
        $name = $this->text($post, 'product_name');
        $description = $this->text($post, 'description');
        $categoryId = (int)($post['category_id'] ?? 0);
        $priceRaw = $this->text($post, 'price');
        $quantity = (int)($post['quantity'] ?? 0);

        $fieldErrors = [];

        if (mb_strlen($name) < 3) {
            $fieldErrors['product_name'] = 'Nama produk minimal 3 karakter.';
        } elseif (mb_strlen($name) > 255) {
            $fieldErrors['product_name'] = 'Nama produk maksimal 255 karakter.';
        }

        if ($description === '') {
            $fieldErrors['description'] = 'Deskripsi produk wajib diisi.';
        } elseif (mb_strlen($description) > 5000) {
            $fieldErrors['description'] = 'Deskripsi maksimal 5000 karakter.';
        }

        if ($priceRaw === '' || !is_numeric($priceRaw) || (float)$priceRaw <= 0) {
            $fieldErrors['price'] = 'Harga harus berupa angka lebih dari 0.';
        }

        if ($quantity < 0) {
            $fieldErrors['quantity'] = 'Stok tidak boleh negatif.';
        }

        $languageId = (int)Yii::$app->settings->get('languages_id');
        if ($languageId <= 0) {
            $languageId = 1;
        }
        $GLOBALS['languages_id'] = $languageId;
        $platformId = (int)platform::currentId();

        $categoryExists = $categoryId > 0 && Categories::find()
            ->alias('category')
            ->innerJoin(
                ['platform_category' => PlatformsCategories::tableName()],
                'platform_category.categories_id = category.categories_id'
                . ' AND platform_category.platform_id = :platform_id',
                [':platform_id' => $platformId]
            )
            ->where(['category.categories_id' => $categoryId, 'category.categories_status' => 1])
            ->exists();

        if (!$categoryExists) {
            $fieldErrors['category_id'] = 'Pilih kategori produk yang tersedia.';
        }

        $files = UploadedFile::getInstancesByName('images');
        if (count($files) < 1) {
            $fieldErrors['images'] = 'Unggah minimal 1 foto produk.';
        } elseif (count($files) > 5) {
            $fieldErrors['images'] = 'Maksimal 5 foto per produk.';
        }

        $allowedTypes = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF, IMAGETYPE_WEBP];
        foreach ($files as $file) {
            if ($file->error !== UPLOAD_ERR_OK) {
                $fieldErrors['images'] = 'Salah satu foto gagal diunggah.';
                break;
            }
            if ($file->size > 5 * 1024 * 1024) {
                $fieldErrors['images'] = 'Ukuran tiap foto maksimal 5 MB.';
                break;
            }
            $info = @getimagesize($file->tempName);
            if ($info === false || !in_array($info[2], $allowedTypes, true)) {
                $fieldErrors['images'] = 'Format foto harus JPG, PNG, GIF, atau WEBP.';
                break;
            }
        }

        if ($fieldErrors !== []) {
            Yii::$app->response->setStatusCode(422);

            return $this->error('Periksa kembali data produk.', $fieldErrors);
        }

        $currencies = Yii::$container->get('currencies');
        $rate = (float)$currencies->get_value('IDR');
        if ($rate <= 0) {
            $rate = 1;
        }
        $basePrice = round((float)$priceRaw / $rate, 6);

        $images = [];
        foreach ($files as $file) {
            $images[] = [
                'file_name' => basename((string)$file->name),
                'file_url' => $file->tempName,
            ];
        }

        $apiProduct = new ApiProduct();
        $apiProduct->productRecord = [
            'products_quantity' => $quantity,
            'products_model' => '',
            'products_image' => '',
            'products_price' => $basePrice,
            'products_date_added' => date('Y-m-d H:i:s'),
            'products_last_modified' => date('Y-m-d H:i:s'),
            'products_weight' => 0,
            'products_status' => 0,
            'products_tax_class_id' => 0,
            'manufacturers_id' => 0,
            'products_ordered' => 0,
        ];
        $apiProduct->descriptionRecordArray = [[
            'language_id' => $languageId,
            'platform_id' => $platformId,
            'department_id' => 0,
            'products_name' => $name,
            'products_description' => $description,
            'products_description_short' => mb_substr(strip_tags($description), 0, 255),
            'products_head_title_tag' => mb_substr($name, 0, 80),
            'products_head_desc_tag' => mb_substr(strip_tags($description), 0, 255),
            'products_head_keywords_tag' => mb_substr($name, 0, 255),
            'products_seo_page_name' => \common\helpers\Seo::makeSlug($name) ?: ('produk-' . time()),
            'products_self_service' => '',
            'products_h1_tag' => '',
            'products_h2_tag' => '',
            'products_h3_tag' => '',
            'products_image_alt_tag_mask' => '',
            'products_image_title_tag_mask' => '',
        ]];
        $apiProduct->productsToCategoriesRecordArray = [
            ['categories_id' => $categoryId],
        ];
        $apiProduct->platformsProductsRecordArray = [
            ['platform_id' => $platformId],
        ];
        $apiProduct->newProductsImagesArray = $images;

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $productId = (int)$apiProduct->create();
            if ($productId <= 0) {
                $transaction->rollBack();
                Yii::$app->response->setStatusCode(422);

                return $this->error(
                    'Produk gagal disimpan.',
                    [],
                    ['products' => $apiProduct->messageGet()]
                );
            }

            $supplierProduct = new SuppliersProducts();
            $supplierProduct->loadDefaultValues();
            $supplierProduct->products_id = $productId;
            $supplierProduct->uprid = (string)$productId;
            $supplierProduct->suppliers_id = (int)$store->suppliers_id;
            $supplierProduct->suppliers_model = '';
            $supplierProduct->suppliers_price = $basePrice;
            $supplierProduct->suppliers_quantity = $quantity;
            $supplierProduct->suppliers_product_name = $name;
            $supplierProduct->is_default = 1;
            $supplierProduct->status = 1;
            $supplierProduct->source = 'seller';
            if (!$supplierProduct->save(false)) {
                throw new \RuntimeException('Data supplier produk gagal disimpan.');
            }

            $moderation = new SellerProducts();
            $moderation->stores_id = (int)$store->stores_id;
            $moderation->products_id = $productId;
            $moderation->status = SellerProducts::STATUS_PENDING;
            if (!$moderation->save(false)) {
                throw new \RuntimeException('Data moderasi produk gagal disimpan.');
            }

            $transaction->commit();
        } catch (\Throwable $ex) {
            if ($transaction->getIsActive()) {
                $transaction->rollBack();
            }
            Yii::$app->response->setStatusCode(422);
            Yii::warning($ex->getMessage(), 'seller-product-create');

            return $this->error('Produk gagal disimpan. Silakan coba lagi.');
        }

        return [
            'ok' => true,
            'items' => [
                'products_id' => $productId,
                'status' => SellerProducts::STATUS_PENDING,
            ],
            'error' => null,
        ];
    }

    private function currentStore()
    {
        if (Yii::$app->user->isGuest) {
            return null;
        }

        return SellerStores::find()
            ->where([
                'customers_id' => (int)Yii::$app->user->getId(),
                'status' => 1,
            ])
            ->one();
    }

    private function productImage($productsId)
    {
        if ($productsId <= 0) {
            return null;
        }

        $list = Images::getImageList($productsId, -1, false, true);
        if (!is_array($list)) {
            return null;
        }

        foreach ($list as $entry) {
            if (isset($entry['image']['Large']['url']) && $entry['image']['Large']['url'] !== '') {
                return (string)$entry['image']['Large']['url'];
            }
            if (isset($entry['image']['Medium']['url']) && $entry['image']['Medium']['url'] !== '') {
                return (string)$entry['image']['Medium']['url'];
            }
        }

        return null;
    }

    private function text(array $post, $key)
    {
        return trim((string)($post[$key] ?? ''));
    }

    private function error($message, array $fieldErrors = [], array $details = [])
    {
        return [
            'ok' => false,
            'items' => [],
            'error' => $message,
            'field_errors' => $fieldErrors,
            'details' => $details,
        ];
    }
}
