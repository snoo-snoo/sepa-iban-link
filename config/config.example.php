<?php

declare(strict_types=1);

/**
 * Copy to config/config.local.php and adjust for production.
 * Environment variables SEPA_* override these values when set.
 */
return [
  'baseUrl' => '',
  'hmacSecret' => '',
  'appTitle' => 'SEPA-Überweisungslink',
];
