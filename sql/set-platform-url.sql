-- ---------------------------------------------------------------------------
-- set-platform-url.sql
--
-- The store now follows the URL of the current request automatically, so this
-- script is only needed when you want to PIN a fixed address instead, e.g.
--   * serving several domains from one install (requires the
--     AdditionalPlatforms extension to be active), or
--   * running the console application on a shared host.
--
-- Usage:
--   1. Edit the URL below so it matches how the store is really opened.
--   2. Import it, then clear lib/frontend/runtime/cache and lib/backend/runtime/cache.
-- ---------------------------------------------------------------------------

USE `osc414`;

-- 1 = main store. The value is a host plus folder path, WITHOUT the scheme.
--     Trailing slash is optional.
SET @store_url = 'localhost/osc414';

UPDATE `platforms`
   SET `platform_url`        = @store_url,
       `platform_url_secure` = '',
       `ssl_enabled`         = 0
 WHERE `platform_id` = 1;

-- Additional stores (satellite platforms). Fill these in only if you actually
-- copied the matching store folders next to this one; otherwise leave the URL
-- empty and switch the store off so visitors do not land on a 404 page.
UPDATE `platforms`
   SET `platform_url`        = '',
       `platform_url_secure` = '',
       `ssl_enabled`         = 0,
       `status`              = 0
 WHERE `platform_id` IN (7, 8, 9, 10);

SELECT `platform_id`, `platform_name`, `platform_url`, `platform_url_secure`, `ssl_enabled`, `status`
  FROM `platforms`
 ORDER BY `platform_id`;