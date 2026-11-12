<?php

declare(strict_types=1);

namespace SepaPay\Http;

use InvalidArgumentException;
use SepaPay\Config\AppConfig;
use SepaPay\Domain\BankDirectory;
use SepaPay\Domain\EpcQrPayload;
use SepaPay\Domain\PaytoUri;
use SepaPay\Domain\PaymentRequest;
use SepaPay\Security\TokenCodec;
use Throwable;

final class AppController
{
    public function __construct(
        private readonly AppConfig $config,
        private readonly TokenCodec $tokenCodec,
        private readonly EpcQrPayload $epcQr = new EpcQrPayload(),
        private readonly PaytoUri $paytoUri = new PaytoUri(),
        private readonly BankDirectory $bankDirectory = new BankDirectory(),
        private readonly OpenGraphImageRenderer $ogRenderer = new OpenGraphImageRenderer(),
    ) {
    }

    public function handle(string $method, string $path): void
    {
        $this->sendSecurityHeaders();

        $method = strtoupper($method);
        $isRead = ($method === 'GET' || $method === 'HEAD');

        $path = $this->normalizePath($path);
        $base = $this->basePathPrefix();

        if ($base !== '' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base)) ?: '/';
        }

        if ($isRead && $path === '/health') {
            $this->respondJson(200, ['status' => 'ok', 'phpVersion' => PHP_VERSION]);
            return;
        }

        if ($isRead && preg_match('#^/og/([^/]+)\.(png|svg)$#', $path, $m) === 1) {
            $this->handleOpenGraph($m[1], $m[2]);
            return;
        }

        if ($method === 'POST' && $path === '/api/encode') {
            $this->handleEncode();
            return;
        }

        if ($isRead && preg_match('#^/p/([^/]+)$#', $path, $m) === 1) {
            $this->renderPaymentPage($m[1]);
            return;
        }

        if ($isRead && ($path === '/' || $path === '')) {
            $this->renderGeneratorPage();
            return;
        }

        http_response_code(404);
        echo 'Not Found';
    }

    /** @return array<string, mixed> */
    public function buildInitialState(string $mode, ?PaymentRequest $payment = null, ?string $token = null, ?string $error = null): array
    {
        $state = [
            'mode' => $mode,
            'baseUrl' => $this->config->baseUrl,
            'hmacEnabled' => $this->config->hmacEnabled(),
            'error' => $error,
            'payment' => null,
        ];

        if ($payment !== null && $token !== null) {
            $state['payment'] = $this->paymentPayload($payment, $token);
        }

        return $state;
    }

    /** @return array<string, mixed> */
    private function paymentPayload(PaymentRequest $payment, string $token): array
    {
        $bank = $this->bankDirectory->resolveFromIban($payment->iban);

        return [
            'token' => $token,
            'recipientName' => $payment->recipientName,
            'iban' => $payment->iban,
            'ibanFormatted' => $payment->ibanFormatted(),
            'ibanMasked' => $payment->ibanMasked(),
            'bic' => $payment->bic,
            'amount' => $payment->amount,
            'amountFormatted' => $payment->amountFormattedDe(),
            'purpose' => $payment->purpose,
            'reference' => $payment->reference,
            'verified' => $payment->verified,
            'epcPayload' => $this->epcQr->build($payment),
            'paytoUri' => $this->paytoUri->toPaytoUri($payment),
            'bankUri' => $this->paytoUri->toBankUri($payment),
            'recipientBank' => $bank,
        ];
    }

    private function renderGeneratorPage(): void
    {
        $state = $this->buildInitialState('generator');
        $this->renderLayout($state, 'Generator', null);
    }

    private function renderPaymentPage(string $token): void
    {
        try {
            $payment = $this->tokenCodec->decode($token);
            $state = $this->buildInitialState('payment', $payment, $token);
            $title = $this->paymentPageTitle($payment);
            $this->renderLayout($state, $title, $payment);
        } catch (Throwable) {
            http_response_code(400);
            $state = $this->buildInitialState(
                'payment',
                null,
                null,
                'Ungültiger oder beschädigter Zahlungslink.',
            );
            $this->renderLayout($state, 'Ungültiger Link', null);
        }
    }

    private function handleEncode(): void
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            $this->respondJson(422, ['ok' => false, 'error' => 'Leerer Request-Body.']);
            return;
        }

        try {
            /** @var array<string, mixed> $body */
            $body = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            $payment = PaymentRequest::fromArray([
                'name' => $body['name'] ?? '',
                'iban' => $body['iban'] ?? '',
                'bic' => $body['bic'] ?? '',
                'amount' => $body['amount'] ?? '',
                'purpose' => $body['purpose'] ?? '',
                'reference' => $body['reference'] ?? '',
            ]);
            $token = $this->tokenCodec->encode($payment);
            $url = $this->config->baseUrl . '/p/' . rawurlencode($token);

            $this->respondJson(200, [
                'ok' => true,
                'token' => $token,
                'url' => $url,
                'payment' => $this->paymentPayload($payment, $token),
            ]);
        } catch (InvalidArgumentException $e) {
            $this->respondJson(422, ['ok' => false, 'error' => $e->getMessage()]);
        } catch (Throwable $e) {
            $this->respondJson(422, ['ok' => false, 'error' => 'Validierung fehlgeschlagen.']);
        }
    }

    private function handleOpenGraph(string $token, string $format = 'svg'): void
    {
        try {
            $payment = $this->tokenCodec->decode($token);
            if ($format === 'png' && $this->ogRenderer->supportsPng()) {
                $png = $this->ogRenderer->renderPng($payment);
                header('Content-Type: image/png');
                header('Cache-Control: public, max-age=86400');
                echo $png;
                return;
            }
            $svg = $this->ogRenderer->render($payment);
            header('Content-Type: image/svg+xml; charset=UTF-8');
            header('Cache-Control: public, max-age=86400');
            echo $svg;
        } catch (Throwable) {
            http_response_code(400);
            header('Content-Type: text/plain; charset=UTF-8');
            echo 'Ungültiger Token';
        }
    }

    private function paymentPageTitle(PaymentRequest $payment): string
    {
        if ($payment->amount !== '') {
            return $payment->amountFormattedDe() . ' an ' . $payment->recipientName . ' überweisen';
        }

        return 'Überweisung an ' . $payment->recipientName;
    }

    private function paymentOgDescription(PaymentRequest $payment): string
    {
        $parts = [];
        if ($payment->reference !== '') {
            $parts[] = 'Referenz: ' . $payment->reference;
        } elseif ($payment->purpose !== '') {
            $parts[] = 'Zweck: ' . $payment->purpose;
        }
        $parts[] = 'IBAN ' . $payment->ibanMasked();
        $parts[] = 'Tippen für QR-Code & vorausgefüllte Überweisung (George, Mein ELBA, Sparkasse u.v.m.)';

        return implode(' · ', $parts);
    }

    /** @param array<string, mixed> $state */
    private function renderLayout(array $state, string $pageTitle, ?PaymentRequest $payment = null): void
    {
        $appTitle = $this->config->appTitle;
        $ogTitle = $payment !== null ? $this->paymentPageTitle($payment) : $pageTitle;
        $fullTitle = $pageTitle . ' · ' . $appTitle;
        $initialStateJson = json_encode(
            $state,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        );

        $ogUrl = $this->config->baseUrl . ($_SERVER['REQUEST_URI'] ?? '/');
        $ogImage = null;
        $ogDescription = 'SEPA-Überweisung per Link, QR-Code oder Banking-App (Österreich & Deutschland).';

        if ($payment !== null) {
            $ogDescription = $this->paymentOgDescription($payment);
        }

        if (isset($state['payment']['token'])) {
            $ext = $this->ogRenderer->supportsPng() ? 'png' : 'svg';
            $ogImage = $this->config->baseUrl . '/og/' . rawurlencode((string) $state['payment']['token']) . '.' . $ext;
        }

        $assets = $this->resolveViteAssets();
        $viewsDir = dirname(__DIR__, 2) . '/views';
        /** @var array<string, mixed> $state layout variable */

        require $viewsDir . '/layout.php';
    }

    /** @return array{css: list<string>, js: string|null} */
    private function resolveViteAssets(): array
    {
        $manifestPaths = [
            dirname(__DIR__, 2) . '/public/assets/manifest.json',
            dirname(__DIR__, 2) . '/public/assets/.vite/manifest.json',
        ];

        foreach ($manifestPaths as $manifestPath) {
            if (!is_file($manifestPath)) {
                continue;
            }

            $json = file_get_contents($manifestPath);
            if ($json === false) {
                continue;
            }

            /** @var array<string, array<string, mixed>> $manifest */
            $manifest = json_decode($json, true);
            if (!is_array($manifest)) {
                continue;
            }

            $entry = $manifest['static/src/js/main.js'] ?? $manifest['frontend/js/main.js'] ?? null;
            if (!is_array($entry)) {
                continue;
            }

            $base = $this->basePathPrefix() . '/assets/';
            $css = [];
            foreach ($entry['css'] ?? [] as $cssFile) {
                if (is_string($cssFile)) {
                    $css[] = $base . ltrim($cssFile, '/');
                }
            }

            $jsFile = $entry['file'] ?? null;
            $js = is_string($jsFile) ? $base . ltrim($jsFile, '/') : null;

            return ['css' => $css, 'js' => $js];
        }

        return ['css' => [], 'js' => null];
    }

    /** @param array<string, mixed> $data */
    private function respondJson(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    private function sendSecurityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');
        header(
            "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            . "img-src 'self' data: blob:; connect-src 'self';"
        );
    }

    private function normalizePath(string $path): string
    {
        $path = '/' . trim($path, '/');
        if ($path === '//') {
            return '/';
        }

        if ($path === '/') {
            return '/';
        }

        $trimmed = rtrim($path, '/');

        return $trimmed !== '' ? $trimmed : '/';
    }

    private function basePathPrefix(): string
    {
        $baseUrl = $this->config->baseUrl;
        if ($baseUrl === '') {
            return '';
        }

        $parts = parse_url($baseUrl);
        $path = $parts['path'] ?? '';

        return $path === '/' ? '' : rtrim((string) $path, '/');
    }
}
