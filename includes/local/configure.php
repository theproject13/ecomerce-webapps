<?php
/**
 * Local store configuration.
 *
 * These credentials must match the database you created on THIS device.
 * The store URL itself is not stored here: it is auto-detected from the current
 * request (see includes/configure.php), so the same database dump can be reused
 * on a machine where the store lives in another folder, port or host.
 */

// Set to false (or delete this file) to send visitors through install/index.php
// again, e.g. when running the installer on a brand new device.
define('DB_SERVER', 'localhost');
define('DB_SERVER_USERNAME', 'root');
define('DB_SERVER_PASSWORD', '');
define('DB_DATABASE', 'osc414');
define('USE_PCONNECT', 'false');
define('STORE_SESSIONS', 'mysql');

define('INSTALLED_MICROTIME', '1789811750.7558');
define('TL_INSTALLED', true);
define('USE_DEFAULT_LANGUAGE_CURRENCY', 'true');