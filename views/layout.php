<?php

declare(strict_types=1);

/** @var string $fullTitle */
/** @var string $ogTitle */
/** @var string $appTitle */
/** @var string $initialStateJson */
/** @var string $ogUrl */
/** @var string|null $ogImage */
/** @var string $ogDescription */
/** @var string $metaDescription */
/** @var array{css: list<string>, js: string|null} $assets */
/** @var array<string, mixed> $state */

$mode = (string) ($state['mode'] ?? 'generator');
$payment = $state['payment'] ?? null;
$basePrefix = isset($basePrefix) ? (string) $basePrefix : '';
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafafa">
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#09090b">
    <title><?= htmlspecialchars($fullTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="description" content="<?= htmlspecialchars($metaDescription, ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= htmlspecialchars($ogTitle ?? $fullTitle, ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:description" content="<?= htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:url" content="<?= htmlspecialchars($ogUrl, ENT_QUOTES, 'UTF-8') ?>">
<?php if ($ogImage !== null): ?>
    <meta property="og:image" content="<?= htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
<?php endif; ?>
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= htmlspecialchars($ogTitle ?? $fullTitle, ENT_QUOTES, 'UTF-8') ?>">
    <meta name="twitter:description" content="<?= htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8') ?>">
<?php if ($ogImage !== null): ?>
    <meta name="twitter:image" content="<?= htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<?php foreach ($assets['css'] as $href): ?>
    <link rel="stylesheet" href="<?= htmlspecialchars($href, ENT_QUOTES, 'UTF-8') ?>">
<?php endforeach; ?>
    <style>
        .sepa-fallback { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 1.25rem; line-height: 1.5; }
        .sepa-fallback h1 { font-size: 1.25rem; margin: 0 0 1rem; }
        .sepa-fallback dl { margin: 0; }
        .sepa-fallback dt { font-weight: 600; margin-top: 0.75rem; }
        .sepa-fallback dd { margin: 0.15rem 0 0; }
        .sepa-fallback .error { color: #b91c1c; }
        .sepa-fallback a { color: #0f766e; word-break: break-all; }
    </style>
</head>
<body>
    <div id="app" class="sepa-shell">
<?php if ($mode === 'impressum' || $mode === 'datenschutz'): ?>
<?php $legalPage = $mode; require __DIR__ . '/legal.php'; ?>
<?php elseif ($mode === 'payment' && is_array($payment)): ?>
        <article class="sepa-fallback">
            <h1>SEPA-Überweisung</h1>
            <dl>
                <dt>Empfänger</dt>
                <dd><?= htmlspecialchars((string) $payment['recipientName'], ENT_QUOTES, 'UTF-8') ?></dd>
                <dt>IBAN</dt>
                <dd><?= htmlspecialchars((string) $payment['ibanFormatted'], ENT_QUOTES, 'UTF-8') ?></dd>
<?php if (($payment['amountFormatted'] ?? '') !== ''): ?>
                <dt>Betrag</dt>
                <dd><?= htmlspecialchars((string) $payment['amountFormatted'], ENT_QUOTES, 'UTF-8') ?></dd>
<?php else: ?>
                <dt>Betrag</dt>
                <dd>Betrag frei wählbar</dd>
<?php endif; ?>
<?php if (($payment['purpose'] ?? '') !== ''): ?>
                <dt>Verwendungszweck</dt>
                <dd><?= htmlspecialchars((string) $payment['purpose'], ENT_QUOTES, 'UTF-8') ?></dd>
<?php endif; ?>
<?php if (($payment['reference'] ?? '') !== ''): ?>
                <dt>Referenz</dt>
                <dd><?= htmlspecialchars((string) $payment['reference'], ENT_QUOTES, 'UTF-8') ?></dd>
<?php endif; ?>
                <dt>Banking-App öffnen</dt>
                <dd><a href="<?= htmlspecialchars((string) $payment['paytoUri'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars((string) $payment['paytoUri'], ENT_QUOTES, 'UTF-8') ?></a></dd>
            </dl>
            <p><a href="<?= htmlspecialchars($basePrefix . '/impressum', ENT_QUOTES, 'UTF-8') ?>">Impressum</a> · <a href="<?= htmlspecialchars($basePrefix . '/datenschutz', ENT_QUOTES, 'UTF-8') ?>">Datenschutzerklärung</a></p>
        </article>
<?php elseif ($mode === 'payment' && ($state['error'] ?? null) !== null): ?>
        <article class="sepa-fallback">
            <h1>Ungültiger Zahlungslink</h1>
            <p class="error"><?= htmlspecialchars((string) $state['error'], ENT_QUOTES, 'UTF-8') ?></p>
            <p><a href="<?= htmlspecialchars($basePrefix . '/', ENT_QUOTES, 'UTF-8') ?>">Eigenen SEPA-Link erstellen</a> · <a href="<?= htmlspecialchars($basePrefix . '/impressum', ENT_QUOTES, 'UTF-8') ?>">Impressum</a> · <a href="<?= htmlspecialchars($basePrefix . '/datenschutz', ENT_QUOTES, 'UTF-8') ?>">Datenschutzerklärung</a></p>
        </article>
<?php else: ?>
        <article class="sepa-fallback">
            <h1>SEPA-Überweisungslinks – 100&nbsp;% lokal &amp; DSGVO-konform</h1>
            <ul>
                <li>Keine Datenspeicherung am Server</li>
                <li>IBAN bleibt lokal auf deinem Gerät</li>
                <li>Kompatibel mit George, Mein ELBA, Sparkasse &amp; VR Banking</li>
            </ul>
            <p><a href="<?= htmlspecialchars($basePrefix . '/impressum', ENT_QUOTES, 'UTF-8') ?>">Impressum</a> · <a href="<?= htmlspecialchars($basePrefix . '/datenschutz', ENT_QUOTES, 'UTF-8') ?>">Datenschutzerklärung</a></p>
        </article>
<?php endif; ?>
    </div>
    <script id="sepa-initial-state" type="application/json"><?= $initialStateJson ?></script>
<?php if ($assets['js'] !== null): ?>
    <script type="module" src="<?= htmlspecialchars($assets['js'], ENT_QUOTES, 'UTF-8') ?>"></script>
<?php endif; ?>
</body>
</html>
