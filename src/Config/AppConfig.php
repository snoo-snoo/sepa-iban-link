<?php

declare(strict_types=1);

namespace SepaPay\Config;

final class AppConfig
{
    public string $baseUrl;
    public string $hmacSecret;
    public string $appTitle;

    /** @param array<string, mixed> $overrides */
    public function __construct(array $overrides = [])
    {
        $defaults = $this->loadDefaults();
        $merged = array_merge($defaults, $overrides);

        $this->baseUrl = $this->stringEnv('SEPA_BASE_URL', (string) ($merged['baseUrl'] ?? ''));
        $this->hmacSecret = $this->stringEnv('SEPA_HMAC_SECRET', (string) ($merged['hmacSecret'] ?? ''));
        $this->appTitle = $this->stringEnv('SEPA_APP_TITLE', (string) ($merged['appTitle'] ?? 'SEPA-Überweisungslink'));

        if ($this->baseUrl === '' && PHP_SAPI !== 'cli') {
            $this->baseUrl = $this->detectBaseUrl();
        }

        $this->baseUrl = rtrim($this->baseUrl, '/');
    }

    public static function load(): self
    {
        $config = [];
        $example = dirname(__DIR__, 2) . '/config/config.example.php';
        if (is_file($example)) {
            /** @var array<string, mixed> $cfg */
            $cfg = require $example;
            $config = $cfg;
        }

        $local = dirname(__DIR__, 2) . '/config/config.local.php';
        if (is_file($local)) {
            /** @var array<string, mixed> $cfg */
            $cfg = require $local;
            $config = array_merge($config, $cfg);
        }

        return new self($config);
    }

    public function hmacEnabled(): bool
    {
        return $this->hmacSecret !== '';
    }

    /** @return array<string, mixed> */
    private function loadDefaults(): array
    {
        return [
            'baseUrl' => '',
            'hmacSecret' => '',
            'appTitle' => 'SEPA-Überweisungslink',
        ];
    }

    private function stringEnv(string $key, string $fallback): string
    {
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return (string) $val;
        }

        return $fallback;
    }

    private function detectBaseUrl(): string
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');
        $scheme = $https ? 'https' : 'http';

        $host = $_SERVER['HTTP_HOST'] ?? '';
        if ($host === '' || !$this->isValidHost($host)) {
            return '';
        }

        $basePath = '';
        if (PHP_SAPI !== 'cli-server') {
            $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
            if (basename($scriptName) === 'index.php') {
                $dir = dirname($scriptName);
                if ($dir !== '/' && $dir !== '.') {
                    $basePath = rtrim($dir, '/');
                    $reqUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
                    if (str_ends_with($basePath, '/public') && !str_starts_with($reqUri, $basePath . '/')) {
                        $basePath = substr($basePath, 0, -strlen('/public'));
                    }
                }
            }
        }

        return $scheme . '://' . $host . $basePath;
    }

    private function isValidHost(string $host): bool
    {
        if (preg_match('/^[\w.-]+(?::\d{1,5})?$/u', $host) !== 1) {
            return false;
        }

        return strlen($host) <= 253;
    }
}
