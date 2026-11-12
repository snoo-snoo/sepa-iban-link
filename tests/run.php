<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';

use SepaPay\Config\AppConfig;
use SepaPay\Domain\BankDirectory;
use SepaPay\Domain\EpcQrPayload;
use SepaPay\Domain\IbanValidator;
use SepaPay\Domain\PaytoUri;
use SepaPay\Domain\PaymentRequest;
use SepaPay\Http\AppController;
use SepaPay\Http\OpenGraphImageRenderer;
use SepaPay\Security\TokenCodec;

$passed = 0;
$failed = 0;
$failures = [];

function test(string $name, callable $fn): void
{
    global $passed, $failed, $failures;
    try {
        $fn();
        $passed++;
        echo "  ok  {$name}\n";
    } catch (Throwable $e) {
        $failed++;
        $failures[] = "{$name}: {$e->getMessage()}";
        echo " FAIL {$name} — {$e->getMessage()}\n";
    }
}

function assertTrue(bool $cond, string $msg = 'assertion failed'): void
{
    if (!$cond) {
        throw new RuntimeException($msg);
    }
}

function assertSame(mixed $expected, mixed $actual, string $msg = ''): void
{
    if ($expected !== $actual) {
        $detail = $msg !== '' ? "{$msg}: " : '';
        throw new RuntimeException($detail . 'expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

function assertThrows(callable $fn, string $exceptionClass): void
{
    try {
        $fn();
    } catch (Throwable $e) {
        if ($e instanceof $exceptionClass) {
            return;
        }
        throw new RuntimeException('expected ' . $exceptionClass . ', got ' . $e::class);
    }
    throw new RuntimeException('expected exception ' . $exceptionClass);
}

echo "sepa-iban-link PHP tests\n";

$iban = new IbanValidator();
$banks = new BankDirectory();
$epc = new EpcQrPayload();
$payto = new PaytoUri();

test('IbanValidator AT IBAN valid', function () use ($iban): void {
    assertTrue($iban->isValid('AT483200000012345864'));
});

test('IbanValidator DE IBAN valid', function () use ($iban): void {
    assertTrue($iban->isValid('DE89370400440532013000'));
});

test('IbanValidator CH IBAN valid', function () use ($iban): void {
    assertTrue($iban->isValid('CH5604835012345678009'));
});

test('IbanValidator NL IBAN valid', function () use ($iban): void {
    assertTrue($iban->isValid('NL91ABNA0417164300'));
});

test('IbanValidator rejects bad checksum', function () use ($iban): void {
    assertTrue(!$iban->isValid('AT483200000012345863'));
});

test('IbanValidator rejects wrong AT length', function () use ($iban): void {
    assertTrue(!$iban->isValid('AT4832000000123458641'));
});

test('IbanValidator format and mask', function () use ($iban): void {
    assertSame('AT48 3200 0000 1234 5864', $iban->format('AT483200000012345864'));
    $masked = $iban->mask('AT483200000012345864');
    assertTrue(str_contains($masked, '••••'));
});

test('IbanValidator BIC validation', function () use ($iban): void {
    assertTrue($iban->isValidBic(''));
    assertTrue($iban->isValidBic('RZBAATWWXXX'));
    assertTrue(!$iban->isValidBic('BAD'));
});

test('BankDirectory George AT', function () use ($banks): void {
    $r = $banks->resolveFromIban('AT232011100234573201');
    assertSame('george_at', $r['appKey']);
});

test('BankDirectory ELBA Raiffeisen', function () use ($banks): void {
    $r = $banks->resolveFromIban('AT483200000012345864');
    assertSame('elba_at', $r['appKey']);
});

test('BankDirectory Bank Austria', function () use ($banks): void {
    $r = $banks->resolveFromIban('AT6112011282212198000');
    assertSame('bankaustria_at', $r['appKey'] ?? '');
});

test('BankDirectory BAWAG', function () use ($banks): void {
    $r = $banks->resolveFromIban('AT141400000012345678');
    assertSame('bawag_at', $r['appKey']);
});

test('BankDirectory Sparkasse DE', function () use ($banks): void {
    $r = $banks->resolveFromIban('DE54100500000011111111');
    assertSame('sparkasse_de', $r['appKey']);
});

test('BankDirectory VR DE', function () use ($banks): void {
    $r = $banks->resolveFromIban('DE89370400440532013000');
    assertSame('commerzbank_de', $r['appKey']);
});

test('BankDirectory ING DE', function () use ($banks): void {
    $r = $banks->resolveFromIban('DE43500105170012345678');
    assertSame('ing_de', $r['appKey']);
});

test('BankDirectory DKB DE', function () use ($banks): void {
    $r = $banks->resolveFromIban('DE64120300000001234567');
    assertSame('dkb_de', $r['appKey']);
});

test('BankDirectory N26 DE', function () use ($banks): void {
    $r = $banks->resolveFromIban('DE37100110010012345678');
    assertSame('n26_de', $r['appKey']);
});

test('PaymentRequest parses 25,50', function (): void {
    $p = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'amount' => '25,50']);
    assertSame('25.50', $p->amount);
});

test('PaymentRequest parses 1.234,56', function (): void {
    $p = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'amount' => '1.234,56']);
    assertSame('1234.56', $p->amount);
});

test('PaymentRequest open amount', function (): void {
    $p = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'amount' => '']);
    assertSame('', $p->amount);
});

test('PaymentRequest rejects 0,00', function (): void {
    assertThrows(
        fn () => PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'amount' => '0,00']),
        InvalidArgumentException::class
    );
});

test('PaymentRequest mutual exclusion purpose/reference', function (): void {
    assertThrows(
        fn () => PaymentRequest::fromArray([
            'name' => 'Max',
            'iban' => 'AT483200000012345864',
            'purpose' => 'A',
            'reference' => 'B',
        ]),
        InvalidArgumentException::class
    );
});

test('PaymentRequest valid RF reference with spaces', function (): void {
    $p = PaymentRequest::fromArray([
        'name' => 'Max',
        'iban' => 'AT483200000012345864',
        'reference' => 'RF18 5390 0754 7034',
    ]);
    assertSame('RF18539007547034', trim(str_replace(' ', '', strtoupper($p->reference))));
});

test('PaymentRequest invalid RF checksum', function (): void {
    assertThrows(
        fn () => PaymentRequest::fromArray([
            'name' => 'Max',
            'iban' => 'AT483200000012345864',
            'reference' => 'RF00539007547034',
        ]),
        InvalidArgumentException::class
    );
});

test('PaymentRequest RF special char injection', function (): void {
    assertThrows(
        fn () => PaymentRequest::fromArray([
            'name' => 'Max',
            'iban' => 'AT483200000012345864',
            'reference' => 'RF18$123',
        ]),
        InvalidArgumentException::class
    );
});

test('EpcQrPayload 11 lines', function () use ($epc): void {
    $req = PaymentRequest::fromArray([
        'name' => 'Max Mustermann',
        'iban' => 'AT483200000012345864',
        'amount' => '25.50',
        'purpose' => 'Test',
    ]);
    $payload = $epc->build($req);
    $lines = explode("\n", $payload);
    assertSame(11, count($lines));
    assertSame('BCD', $lines[0]);
    assertSame('EUR25.50', $lines[7]);
});

test('EpcQrPayload UTF-8 umlauts', function () use ($epc): void {
    $req = PaymentRequest::fromArray([
        'name' => 'Müller',
        'iban' => 'AT483200000012345864',
        'purpose' => 'Grüße',
    ]);
    $payload = $epc->build($req);
    assertTrue(str_contains($payload, 'Müller'));
    assertTrue(strlen($payload) <= 331);
});

test('EpcQrPayload rejects >331 bytes', function () use ($epc): void {
    assertThrows(function () use ($epc): void {
        $req = PaymentRequest::fromArray([
            'name' => str_repeat('ä', 70),
            'iban' => 'AT483200000012345864',
            'purpose' => str_repeat('ü', 140),
        ]);
        $epc->build($req);
    }, InvalidArgumentException::class);
});

test('PaytoUri RFC 8905 payto', function () use ($payto): void {
    $req = PaymentRequest::fromArray([
        'name' => 'Max Muster',
        'iban' => 'AT483200000012345864',
        'amount' => '10.00',
        'purpose' => 'Rechnung November',
    ]);
    $uri = $payto->toPaytoUri($req);
    assertTrue(str_contains($uri, 'amount=EUR:10.00'));
    assertTrue(str_contains($uri, 'receiver-name=Max%20Muster'));
    assertTrue(str_contains($uri, 'message=Rechnung%20November'));
});

test('PaytoUri instruction for reference', function () use ($payto): void {
    $req = PaymentRequest::fromArray([
        'name' => 'Max',
        'iban' => 'AT483200000012345864',
        'reference' => 'RF18539007547034',
    ]);
    $uri = $payto->toPaytoUri($req);
    assertTrue(str_contains($uri, 'instruction=RF18539007547034'));
});

test('PaytoUri bank omit empty bic', function () use ($payto): void {
    $req = PaymentRequest::fromArray([
        'name' => 'Max',
        'iban' => 'AT483200000012345864',
        'amount' => '25.50',
        'purpose' => 'Test',
    ]);
    $uri = $payto->toBankUri($req);
    assertTrue(!str_contains($uri, 'bic='));
    assertTrue(str_contains($uri, 'amount=25%2C50'));
});

test('TokenCodec without HMAC unverified', function (): void {
    $config = new AppConfig(['hmacSecret' => '']);
    $codec = new TokenCodec($config);
    $req = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'purpose' => 'X']);
    $token = $codec->encode($req);
    $decoded = $codec->decode($token);
    assertSame(false, $decoded->verified);
});

test('TokenCodec with HMAC verified', function (): void {
    $config = new AppConfig(['hmacSecret' => 'test-secret']);
    $codec = new TokenCodec($config);
    $req = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'purpose' => 'X']);
    $token = $codec->encode($req);
    $decoded = $codec->decode($token);
    assertSame(true, $decoded->verified);
});

test('TokenCodec tampered signature rejected', function (): void {
    $config = new AppConfig(['hmacSecret' => 'test-secret']);
    $codec = new TokenCodec($config);
    $req = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'purpose' => 'X']);
    $token = $codec->encode($req);
    $pad = str_repeat('=', (4 - strlen($token) % 4) % 4);
    $json = base64_decode(strtr($token . $pad, '-_', '+/'), true);
    assertTrue(is_string($json));
    $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    $data['s'] = 'aaaaaaaaaaaaaaaaaaaaaa';
    $bad = rtrim(strtr(base64_encode(json_encode($data, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    assertThrows(fn () => $codec->decode($bad), InvalidArgumentException::class);
});

test('TokenCodec missing signature when HMAC on', function (): void {
    $config = new AppConfig(['hmacSecret' => 'test-secret']);
    $codec = new TokenCodec($config);
    $plain = new AppConfig(['hmacSecret' => '']);
    $plainCodec = new TokenCodec($plain);
    $token = $plainCodec->encode(PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864']));
    assertThrows(fn () => $codec->decode($token), InvalidArgumentException::class);
});

test('OpenGraphImageRenderer valid SVG', function (): void {
    $req = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864', 'amount' => '25.50']);
    $svg = (new OpenGraphImageRenderer())->render($req);
    assertTrue(str_starts_with($svg, '<?xml'));
    assertTrue(str_contains($svg, '<svg'));
});

test('OpenGraphImageRenderer XSS escape', function (): void {
    $req = PaymentRequest::fromArray(['name' => '<script>alert(1)</script>', 'iban' => 'AT483200000012345864']);
    $svg = (new OpenGraphImageRenderer())->render($req);
    assertTrue(!str_contains($svg, '<script>'));
    assertTrue(str_contains($svg, '&lt;script&gt;'));
});

test('OpenGraphImageRenderer masked IBAN', function (): void {
    $req = PaymentRequest::fromArray(['name' => 'Max', 'iban' => 'AT483200000012345864']);
    $svg = (new OpenGraphImageRenderer())->render($req);
    assertTrue(str_contains($svg, '••••'));
});

test('OpenGraphImageRenderer valid PNG when GD loaded', function (): void {
    $renderer = new OpenGraphImageRenderer();
    if (!$renderer->supportsPng()) {
        return;
    }
    $req = PaymentRequest::fromArray([
        'name' => 'Max Mustermann',
        'iban' => 'AT483200000012345864',
        'amount' => '25.50',
        'purpose' => 'Abendessen Pizzeria',
    ]);
    $png = $renderer->renderPng($req);
    assertTrue(str_starts_with($png, "\x89PNG\r\n\x1a\n"));
    assertTrue(strlen($png) > 500);
});

test('AppController buildInitialState generator', function (): void {
    $config = new AppConfig(['baseUrl' => 'https://example.test', 'hmacSecret' => '']);
    $controller = new AppController($config, new TokenCodec($config));
    $state = $controller->buildInitialState('generator');
    assertSame('generator', $state['mode']);
    assertSame('https://example.test', $state['baseUrl']);
});

test('AppController resolveViteAssets manifest', function (): void {
    $manifest = dirname(__DIR__) . '/public/assets/manifest.json';
    if (!is_file($manifest)) {
        return;
    }
    $config = new AppConfig(['hmacSecret' => '']);
    $controller = new AppController($config, new TokenCodec($config));
    $ref = new ReflectionMethod($controller, 'resolveViteAssets');
    $assets = $ref->invoke($controller);
    assertTrue($assets['js'] !== null || $assets['css'] !== []);
});

echo "\n{$passed} passed, {$failed} failed\n";
exit($failed > 0 ? 1 : 0);
