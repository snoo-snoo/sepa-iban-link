<?php

declare(strict_types=1);

if (PHP_SAPI === 'cli-server') {
    $staticPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if (is_string($staticPath) && $staticPath !== '/' && is_file(__DIR__ . $staticPath)) {
        return false;
    }
}

require dirname(__DIR__) . '/src/autoload.php';

use SepaPay\Config\AppConfig;
use SepaPay\Http\AppController;
use SepaPay\Security\TokenCodec;

$config = AppConfig::load();
$controller = new AppController($config, new TokenCodec($config));

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!is_string($path) || $path === '') {
    $path = '/';
}

$controller->handle($method, $path);
