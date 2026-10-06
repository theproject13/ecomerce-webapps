<?php
/**
 * This file is part of osCommerce ecommerce platform.
 * osCommerce the ecommerce
 * 
 * @link https://www.oscommerce.com
 * @copyright Copyright (c) 2000-2022 osCommerce LTD
 * 
 * Released under the GNU General Public License
 * For the full copyright and license information, please view the LICENSE.TXT file that was distributed with this source code.
 */

defined('YII_DEBUG') or define('YII_DEBUG', false);
defined('YII_ENV') or define('YII_ENV', 'prod');

defined('PHP8WARN_OFF') or define('PHP8WARN_OFF', true);

require(__DIR__ . '/../../vendor/autoload.php');
require(__DIR__ . '/../../vendor/yiisoft/yii2/Yii.php');
require(__DIR__ . '/../../common/config/bootstrap.php');
require(__DIR__ . '/../config/bootstrap.php');

$config = yii\helpers\ArrayHelper::merge(
    require(__DIR__ . '/../../common/config/main.php'),
    require(__DIR__ . '/../../common/config/main-local.php'),
    require(__DIR__ . '/../config/main.php'),
    require(__DIR__ . '/../config/main-local.php')
);

$application = new yii\web\Application($config);

// Homepage storefront dan path yang terdaftar di ReactShell::$reactPaths
// dilayani oleh shell React, tapi hanya untuk platform utama dan hanya pada
// request GET. Semua route lain (/catalog, /shopping-cart, /account, ...)
// tetap dirender router PHP di bawah.
require_once(__DIR__ . '/react/ReactShell.php');
if (ReactShell::isReactRequest() && ReactShell::send()) {
    exit;
}

$application->run();
