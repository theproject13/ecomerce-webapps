-- Seed konfigurasi modul dummy JNE/J&T dan bank transfer/QRIS.
-- Data-only, idempotent, tanpa perubahan skema.
-- Dijalankan: mysql --defaults-file=C:\xampp\mysql\bin\my.ini -uroot osc414 < docs/sql/seed_dummy_modules.sql

SET @platforms = '0,1,7,8,9,10';

INSERT INTO platforms_configuration
  (platform_id, configuration_title, configuration_key, configuration_value,
   configuration_description, configuration_group_id, sort_order, date_added,
   use_function, set_function)
SELECT p.id, c.configuration_title, c.configuration_key, c.configuration_value,
       c.configuration_description, 'BOX_CONFIGURATION_MODULE', c.sort_order, NOW(),
       c.use_function, c.set_function
FROM (
  SELECT 0 AS id UNION ALL SELECT 1 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) p
CROSS JOIN (
  SELECT 'Enable JNE Dummy Shipping' AS configuration_title, 'MODULE_SHIPPING_JNE_STATUS' AS configuration_key, 'True' AS configuration_value, 'Show JNE as a local dummy shipping option. No request is sent to JNE.' AS configuration_description, 1 AS sort_order, NULL AS use_function, 'tep_cfg_select_option(array(\'True\', \'False\'), ' AS set_function
  UNION ALL SELECT 'JNE Mode', 'MODULE_SHIPPING_JNE_MODE', 'Dummy', 'Only Dummy is active. API fields below are stored for later integration.', 2, NULL, 'tep_cfg_select_option(array(\'Dummy\'), '
  UNION ALL SELECT 'JNE API URL', 'MODULE_SHIPPING_JNE_API_URL', 'http://apiv2.jne.co.id:10102/tracing/api/pricedev', 'Reserved for future API integration; not called in dummy mode.', 3, NULL, NULL
  UNION ALL SELECT 'JNE Username', 'MODULE_SHIPPING_JNE_USERNAME', '', 'Reserved configuration field. Leave empty for dummy mode.', 4, NULL, NULL
  UNION ALL SELECT 'JNE API Key', 'MODULE_SHIPPING_JNE_API_KEY', '', 'Reserved configuration field. Do not enter live credentials yet.', 5, NULL, NULL
  UNION ALL SELECT 'JNE Origin Code', 'MODULE_SHIPPING_JNE_ORIGIN_CODE', 'CGK10000', 'Reserved origin city code for future API pricing.', 6, NULL, NULL
  UNION ALL SELECT 'JNE Dummy Services', 'MODULE_SHIPPING_JNE_SERVICES', 'REG|REGULAR|0.90|0.10;YES|YES|1.20|0.15', 'Format: CODE|Label|Base Cost|Cost Per Kg; separate services with semicolon. Values use base currency.', 7, NULL, NULL
  UNION ALL SELECT 'JNE Handling Fee', 'MODULE_SHIPPING_JNE_HANDLING', '0', 'Handling fee added to every dummy service quote.', 8, NULL, NULL
  UNION ALL SELECT 'JNE Tax Class', 'MODULE_SHIPPING_JNE_TAX_CLASS', '0', 'Tax class applied to the shipping fee.', 9, '\\common\\helpers\\Tax::get_tax_class_title', 'tep_cfg_pull_down_tax_classes('
  UNION ALL SELECT 'JNE Shipping Zone', 'MODULE_SHIPPING_JNE_ZONE', '0', 'Restrict this shipping method to a geo zone.', 10, '\\common\\helpers\\Zones::get_zone_class_title', 'tep_cfg_pull_down_zone_classes('
  UNION ALL SELECT 'JNE Sort Order', 'MODULE_SHIPPING_JNE_SORT_ORDER', '30', 'Sort order of display.', 11, NULL, NULL

  UNION ALL SELECT 'Enable J&T Dummy Shipping', 'MODULE_SHIPPING_JNT_STATUS', 'True', 'Show J&T as a local dummy shipping option. No request is sent to J&T.', 1, NULL, 'tep_cfg_select_option(array(\'True\', \'False\'), '
  UNION ALL SELECT 'J&T Mode', 'MODULE_SHIPPING_JNT_MODE', 'Dummy', 'Only Dummy is active. API fields below are stored for later integration.', 2, NULL, 'tep_cfg_select_option(array(\'Dummy\'), '
  UNION ALL SELECT 'J&T API URL', 'MODULE_SHIPPING_JNT_API_URL', 'https://developer.jet.co.id/documentation', 'Reserved for future API integration; not called in dummy mode.', 3, NULL, NULL
  UNION ALL SELECT 'J&T Customer Name', 'MODULE_SHIPPING_JNT_CUS_NAME', '', 'Reserved configuration field. Leave empty for dummy mode.', 4, NULL, NULL
  UNION ALL SELECT 'J&T API Key', 'MODULE_SHIPPING_JNT_API_KEY', '', 'Reserved configuration field. Do not enter live credentials yet.', 5, NULL, NULL
  UNION ALL SELECT 'J&T Key', 'MODULE_SHIPPING_JNT_KEY', '', 'Reserved configuration field for the second API key.', 6, NULL, NULL
  UNION ALL SELECT 'J&T Origin Code', 'MODULE_SHIPPING_JNT_ORIGIN_CODE', 'CGK', 'Reserved origin area code for future API pricing.', 7, NULL, NULL
  UNION ALL SELECT 'J&T Dummy Services', 'MODULE_SHIPPING_JNT_SERVICES', 'EZ|EZ|1.00|0.10;SUPER|SUPER|1.40|0.15', 'Format: CODE|Label|Base Cost|Cost Per Kg; separate services with semicolon. Values use base currency.', 8, NULL, NULL
  UNION ALL SELECT 'J&T Handling Fee', 'MODULE_SHIPPING_JNT_HANDLING', '0', 'Handling fee added to every dummy service quote.', 9, NULL, NULL
  UNION ALL SELECT 'J&T Tax Class', 'MODULE_SHIPPING_JNT_TAX_CLASS', '0', 'Tax class applied to the shipping fee.', 10, '\\common\\helpers\\Tax::get_tax_class_title', 'tep_cfg_pull_down_tax_classes('
  UNION ALL SELECT 'J&T Shipping Zone', 'MODULE_SHIPPING_JNT_ZONE', '0', 'Restrict this shipping method to a geo zone.', 11, '\\common\\helpers\\Zones::get_zone_class_title', 'tep_cfg_pull_down_zone_classes('
  UNION ALL SELECT 'J&T Sort Order', 'MODULE_SHIPPING_JNT_SORT_ORDER', '31', 'Sort order of display.', 12, NULL, NULL

  UNION ALL SELECT 'Enable Bank Transfer Dummy', 'MODULE_PAYMENT_BANK_TRANSFER_STATUS', 'True', 'Show bank transfer instructions at checkout. No payment gateway is called.', 1, NULL, 'tep_cfg_select_option(array(\'True\', \'False\'), '
  UNION ALL SELECT 'Bank Transfer Mode', 'MODULE_PAYMENT_BANK_TRANSFER_MODE', 'Dummy', 'Only Dummy is active. This module stores data only and does not confirm payment.', 2, NULL, 'tep_cfg_select_option(array(\'Dummy\'), '
  UNION ALL SELECT 'Bank Name', 'MODULE_PAYMENT_BANK_TRANSFER_BANK_NAME', 'Dummy Bank', 'Bank name shown to the customer at confirmation.', 3, NULL, NULL
  UNION ALL SELECT 'Account Holder', 'MODULE_PAYMENT_BANK_TRANSFER_ACCOUNT_HOLDER', 'Dummy Merchant', 'Account holder name shown to the customer.', 4, NULL, NULL
  UNION ALL SELECT 'Account Number', 'MODULE_PAYMENT_BANK_TRANSFER_ACCOUNT_NUMBER', '0000000000', 'Dummy account number. Replace only when approved for real use.', 5, NULL, NULL
  UNION ALL SELECT 'Transfer Instructions', 'MODULE_PAYMENT_BANK_TRANSFER_INSTRUCTIONS', 'Simulasi: transfer tidak diverifikasi otomatis. Order tetap menunggu konfirmasi admin.', 'Instructions shown to the customer after choosing bank transfer.', 6, NULL, NULL
  UNION ALL SELECT 'Bank Transfer Order Status', 'MODULE_PAYMENT_BANK_TRANSFER_ORDER_STATUS_ID', '100007', 'Order status after a dummy bank transfer order is placed.', 7, '\\common\\helpers\\Order::get_order_status_name', 'tep_cfg_pull_down_order_statuses('
  UNION ALL SELECT 'Bank Transfer Zone', 'MODULE_PAYMENT_BANK_TRANSFER_ZONE', '0', 'Restrict this payment method to a geo zone.', 8, '\\common\\helpers\\Zones::get_zone_class_title', 'tep_cfg_pull_down_zone_classes('
  UNION ALL SELECT 'Bank Transfer Sort Order', 'MODULE_PAYMENT_BANK_TRANSFER_SORT_ORDER', '70', 'Sort order of display.', 9, NULL, NULL

  UNION ALL SELECT 'Enable QRIS Dummy', 'MODULE_PAYMENT_QRIS_STATUS', 'True', 'Show QRIS instructions at checkout. No payment gateway is called.', 1, NULL, 'tep_cfg_select_option(array(\'True\', \'False\'), '
  UNION ALL SELECT 'QRIS Mode', 'MODULE_PAYMENT_QRIS_MODE', 'Dummy', 'Only Dummy is active. This module stores data only and does not confirm payment.', 2, NULL, 'tep_cfg_select_option(array(\'Dummy\'), '
  UNION ALL SELECT 'QRIS Merchant Name', 'MODULE_PAYMENT_QRIS_MERCHANT_NAME', 'Dummy Merchant', 'Merchant name shown to the customer at confirmation.', 3, NULL, NULL
  UNION ALL SELECT 'QRIS Merchant ID', 'MODULE_PAYMENT_QRIS_MERCHANT_ID', 'DUMMY-QRIS-001', 'Dummy merchant or QRIS ID. Replace only when approved for real use.', 4, NULL, NULL
  UNION ALL SELECT 'Static QRIS Payload', 'MODULE_PAYMENT_QRIS_STATIC_PAYLOAD', '', 'Optional static QR string. Leave empty in dummy mode.', 5, NULL, NULL
  UNION ALL SELECT 'QRIS Instructions', 'MODULE_PAYMENT_QRIS_INSTRUCTIONS', 'Simulasi: QRIS tidak diverifikasi otomatis. Order tetap menunggu konfirmasi admin.', 'Instructions shown to the customer after choosing QRIS.', 6, NULL, NULL
  UNION ALL SELECT 'QRIS Order Status', 'MODULE_PAYMENT_QRIS_ORDER_STATUS_ID', '100007', 'Order status after a dummy QRIS order is placed.', 7, '\\common\\helpers\\Order::get_order_status_name', 'tep_cfg_pull_down_order_statuses('
  UNION ALL SELECT 'QRIS Zone', 'MODULE_PAYMENT_QRIS_ZONE', '0', 'Restrict this payment method to a geo zone.', 8, '\\common\\helpers\\Zones::get_zone_class_title', 'tep_cfg_pull_down_zone_classes('
  UNION ALL SELECT 'QRIS Sort Order', 'MODULE_PAYMENT_QRIS_SORT_ORDER', '71', 'Sort order of display.', 9, NULL, NULL
) c
WHERE NOT EXISTS (
  SELECT 1 FROM platforms_configuration pc
  WHERE pc.platform_id = p.id AND pc.configuration_key = c.configuration_key
);

UPDATE platforms_configuration
SET configuration_value = CONCAT(configuration_value, ';jne.php;jnt.php')
WHERE configuration_key = 'MODULE_SHIPPING_INSTALLED'
  AND platform_id IN (0,1,7,8,9,10)
  AND configuration_value NOT LIKE '%jne.php%'
  AND configuration_value NOT LIKE '%jnt.php%';

UPDATE platforms_configuration
SET configuration_value = CONCAT(configuration_value, ';bank_transfer.php;qris.php')
WHERE configuration_key = 'MODULE_PAYMENT_INSTALLED'
  AND platform_id IN (0,1,7,8,9,10)
  AND configuration_value NOT LIKE '%bank_transfer.php%'
  AND configuration_value NOT LIKE '%qris.php%';

UPDATE platforms_configuration
SET configuration_value = 'True'
WHERE configuration_key IN (
  'MODULE_SHIPPING_JNE_STATUS', 'MODULE_SHIPPING_JNT_STATUS',
  'MODULE_PAYMENT_BANK_TRANSFER_STATUS', 'MODULE_PAYMENT_QRIS_STATUS'
)
AND platform_id IN (0,1,7,8,9,10);

UPDATE platforms_configuration
SET configuration_value = 'REG|REGULAR|0.90|0.10;YES|YES|1.20|0.15'
WHERE configuration_key = 'MODULE_SHIPPING_JNE_SERVICES'
  AND platform_id IN (0,1,7,8,9,10)
  AND configuration_value = 'REG|REGULAR|9000|2000;YES|YES|12000|3000';

UPDATE platforms_configuration
SET configuration_value = 'EZ|EZ|1.00|0.10;SUPER|SUPER|1.40|0.15'
WHERE configuration_key = 'MODULE_SHIPPING_JNT_SERVICES'
  AND platform_id IN (0,1,7,8,9,10)
  AND configuration_value = 'EZ|EZ|10000|2000;SUPER|SUPER|14000|3000';

INSERT INTO modules_visibility (platform_id, code, area)
SELECT p.id, c.code, 'admin,shop_order,shop_quote,shop_sample'
FROM (
  SELECT 0 AS id UNION ALL SELECT 1 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) p
CROSS JOIN (
  SELECT 'jne' AS code
  UNION ALL SELECT 'jnt'
  UNION ALL SELECT 'bank_transfer'
  UNION ALL SELECT 'qris'
) c
WHERE NOT EXISTS (
  SELECT 1 FROM modules_visibility mv
  WHERE mv.platform_id = p.id AND mv.code = c.code
);

UPDATE themes_settings
SET setting_value = '#ffffff'
WHERE setting_name = 'theme_color'
  AND (setting_value IS NULL OR setting_value = '');
