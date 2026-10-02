<?php
/**
 * Local configuration for the backend (admin).
 *
 * The web paths below are derived from the filesystem location of this file and
 * the current request, so the same repository can be dropped into a different
 * folder name, served on a different port, or reached over the LAN without any
 * manual edit. Only the database credentials have to match on every device.
 */

// Scheme + host of the current request (works for localhost, 127.0.0.1 and LAN IPs).
$__osc_is_ssl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && strtolower($_SERVER['HTTPS']) !== 'off')
  || (isset($_SERVER['SERVER_PORT']) && (string)$_SERVER['SERVER_PORT'] === '443');
$__osc_scheme = $__osc_is_ssl ? 'https' : 'http';
$__osc_host   = isset($_SERVER['HTTP_HOST']) && $_SERVER['HTTP_HOST'] !== '' ? $_SERVER['HTTP_HOST'] : 'localhost';

// Absolute filesystem path of the store root, derived from this file's location:
// <root>/admin/includes/local/configure.php  ->  <root>
$__osc_fs_root = str_replace('\\', '/', dirname(dirname(dirname(__FILE__))));
$__osc_doc_root = str_replace('\\', '/', isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '');
$__osc_doc_root = rtrim($__osc_doc_root, '/');

// Web path of the store root: '/' when the store sits in the web root,
// '/osc414/' or '/ecommerce-webapps-main/' when it sits in a subfolder.
$__osc_base_path = '/';
if ($__osc_doc_root !== '' && strpos($__osc_fs_root . '/', $__osc_doc_root . '/') === 0) {
    $__osc_base_path = '/' . trim(substr($__osc_fs_root, strlen($__osc_doc_root)), '/') . '/';
}

define('HTTP_SERVER', $__osc_scheme . '://' . $__osc_host);
define('HTTPS_SERVER', $__osc_is_ssl ? 'https://' . $__osc_host : 'http://' . $__osc_host);
define('HTTP_CATALOG_SERVER', $__osc_scheme . '://' . $__osc_host);
define('HTTPS_CATALOG_SERVER', $__osc_is_ssl ? 'https://' . $__osc_host : 'http://' . $__osc_host);
define('ENABLE_SSL', $__osc_is_ssl);
define('ENABLE_SSL_CATALOG', $__osc_is_ssl);

define('DIR_FS_DOCUMENT_ROOT', $__osc_doc_root === '' ? $_SERVER['DOCUMENT_ROOT'] : $__osc_doc_root);
define('DIR_WS_ADMIN', $__osc_base_path . 'admin/');
define('DIR_FS_ADMIN', rtrim(DIR_FS_DOCUMENT_ROOT, '/\\') . DIR_WS_ADMIN);
define('DIR_WS_CATALOG', $__osc_base_path);
define('DIR_FS_CATALOG', rtrim(DIR_FS_DOCUMENT_ROOT, '/\\') . DIR_WS_CATALOG);
define('DIR_WS_IMAGES', 'images/');
define('DIR_WS_ICONS', DIR_WS_IMAGES . 'icons/');
define('DIR_WS_CATALOG_IMAGES', DIR_WS_CATALOG . 'images/');
define('DIR_WS_INCLUDES', 'includes/');
define('DIR_WS_BOXES', DIR_WS_INCLUDES . 'boxes/');
define('DIR_WS_FUNCTIONS', DIR_WS_INCLUDES . 'functions/');
define('DIR_WS_CLASSES', DIR_WS_INCLUDES . 'classes/');
define('DIR_WS_MODULES', DIR_WS_INCLUDES . 'modules/');
define('DIR_WS_LANGUAGES', DIR_WS_INCLUDES . 'languages/');
define('DIR_WS_CATALOG_LANGUAGES', DIR_WS_CATALOG . 'includes/languages/');
define('DIR_FS_CATALOG_LANGUAGES', DIR_FS_CATALOG . 'includes/languages/');
define('DIR_FS_CATALOG_IMAGES', DIR_FS_CATALOG . 'images/');
define('DIR_FS_CATALOG_MODULES', DIR_FS_CATALOG . 'includes/modules/');
define('DIR_FS_BACKUP', DIR_FS_ADMIN . 'backups/');
define('DIR_FS_CATALOG_XML', DIR_FS_CATALOG . 'xml/');
define('DIR_FS_DOWNLOAD', DIR_FS_CATALOG . 'download/');
define('DIR_WS_DOWNLOAD', DIR_WS_CATALOG . 'download/');
define('DIR_FS_CATALOG_FONTS', DIR_FS_ADMIN . 'includes/fonts/');
define('DIR_WS_TEMPLATES', DIR_WS_CATALOG . 'templates/');
define('DIR_FS_TEMPLATES', DIR_FS_CATALOG . 'templates/');

define('DB_SERVER', 'localhost');
define('DB_SERVER_USERNAME', 'root');
define('DB_SERVER_PASSWORD', '');
define('DB_DATABASE', 'osc414');
define('USE_PCONNECT', 'false');
define('STORE_SESSIONS', 'mysql');

define('INSTALLED_MICROTIME', '1789811750.7558');