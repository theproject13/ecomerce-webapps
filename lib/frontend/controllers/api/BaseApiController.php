<?php

namespace frontend\controllers\api;

use frontend\controllers\Sceleton;
use Yii;
use yii\web\Response;

class BaseApiController extends Sceleton
{
    public function beforeAction($action)
    {
        $result = parent::beforeAction($action);
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->headers->add('Content-Type', 'application/json; charset=UTF-8');
        return $result;
    }
}
