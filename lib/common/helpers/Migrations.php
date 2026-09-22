<?php

namespace common\helpers;

class Migrations
{

    public static function getNewMigrations()
    {
        $oldApp = \Yii::$app;
        $app = new \yii\console\Application([
            'id' => 'Command runner',
            'basePath' => '@site_root',
            'components' => [
                'db' => $oldApp->db,
                'cache' => [
                    'class' => 'yii\caching\FileCache',
                    'cachePath' => '@frontend/runtime/cache'
                ],
            ],
        ]);

        $migrationController = new \yii\console\controllers\MigrateController('migrate', $app);
        $r = new ReflectionMethod($migrationController, 'getNewMigrations');
        $r->setAccessible(true);
        $migrations = $r->invoke(new foo());
        $app->end();
        \Yii::$app = $oldApp;
        return $migrations;
    }

}