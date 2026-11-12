<?php

declare(strict_types=1);

namespace SepaPay\Http;

use SepaPay\Domain\PaymentRequest;

final class OpenGraphImageRenderer
{
    private const WIDTH = 1200;
    private const HEIGHT = 630;

    public function render(PaymentRequest $req): string
    {
        $title = 'SEPA-Überweisungslink (AT · DE)';
        $amountLabel = $req->amount !== ''
            ? $this->escape($req->amountFormattedDe())
            : $this->escape('Betrag frei wählbar');
        $name = $this->escape($req->recipientName);
        $iban = $this->escape($req->ibanMasked());
        $purposeLine = $req->reference !== ''
            ? 'Referenz: ' . $this->escape($req->reference)
            : ($req->purpose !== '' ? 'Zweck: ' . $this->escape($req->purpose) : '');
        $hint = $this->escape('Tippen zum Öffnen mit George, Mein ELBA, Sparkasse & weiteren Banking-Apps');

        $w = (string) self::WIDTH;
        $h = (string) self::HEIGHT;

        return <<<SVG
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{$w}" height="{$h}" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f766e"/>
      <stop offset="100%" style="stop-color:#134e4a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="534" rx="24" fill="#ffffff" fill-opacity="0.97"/>
  <text x="96" y="130" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="28" fill="#64748b">{$title}</text>
  <text x="96" y="220" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="64" font-weight="700" fill="#0f172a">{$amountLabel}</text>
  <text x="96" y="310" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="36" font-weight="600" fill="#1e293b">{$name}</text>
  <text x="96" y="370" font-family="ui-monospace,Menlo,monospace" font-size="28" fill="#475569">{$iban}</text>
  <text x="96" y="430" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="24" fill="#64748b">{$purposeLine}</text>
  <text x="96" y="530" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="22" fill="#94a3b8">{$hint}</text>
</svg>
SVG;
    }

    public function supportsPng(): bool
    {
        return extension_loaded('gd') && function_exists('imagecreatetruecolor') && function_exists('imagepng');
    }

    /**
     * Renders a 1200x630 PNG preview image for WhatsApp, iMessage, and Telegram crawlers
     * (which ignore SVG og:image tags). Avoids imagedestroy() for PHP 8.5 compatibility.
     */
    public function renderPng(PaymentRequest $req): string
    {
        $img = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        if ($img === false) {
            throw new \RuntimeException('GD image allocation failed.');
        }

        $tealDark = imagecolorallocate($img, 15, 118, 110);
        $white = imagecolorallocate($img, 255, 255, 255);
        $slate900 = imagecolorallocate($img, 15, 23, 42);
        $slate700 = imagecolorallocate($img, 51, 65, 85);
        $slate500 = imagecolorallocate($img, 100, 116, 139);

        imagefilledrectangle($img, 0, 0, self::WIDTH, self::HEIGHT, (int) $tealDark);
        imagefilledrectangle($img, 48, 48, self::WIDTH - 48, self::HEIGHT - 48, (int) $white);

        $title = 'SEPA-Überweisungslink (AT · DE)';
        $amountLabel = $req->amount !== '' ? $req->amountFormattedDe() : 'Betrag frei wählbar';
        $name = mb_substr($req->recipientName, 0, 48);
        $iban = $req->ibanMasked();
        $purposeLine = $req->reference !== ''
            ? 'Referenz: ' . $req->reference
            : ($req->purpose !== '' ? 'Zweck: ' . mb_substr($req->purpose, 0, 64) : '');
        $hint = 'Tippen zum Öffnen mit George, Mein ELBA, Sparkasse & weiteren Banking-Apps';

        $boldFont = $this->findTtfFont(true);
        $regularFont = $this->findTtfFont(false);

        if ($boldFont !== null && $regularFont !== null && function_exists('imagettftext')) {
            imagettftext($img, 20, 0, 96, 130, (int) $slate500, $regularFont, $title);
            imagettftext($img, 48, 0, 96, 225, (int) $slate900, $boldFont, $amountLabel);
            imagettftext($img, 28, 0, 96, 310, (int) $slate700, $boldFont, $name);
            imagettftext($img, 22, 0, 96, 370, (int) $slate500, $regularFont, $iban);
            if ($purposeLine !== '') {
                imagettftext($img, 20, 0, 96, 430, (int) $slate500, $regularFont, $purposeLine);
            }
            imagettftext($img, 16, 0, 96, 530, (int) $slate500, $regularFont, $hint);
        } else {
            imagestring($img, 5, 96, 110, 'SEPA-Ueberweisungslink (AT / DE)', (int) $slate500);
            imagestring($img, 5, 96, 180, str_replace('€', 'EUR', $amountLabel), (int) $slate900);
            imagestring($img, 5, 96, 250, $name, (int) $slate700);
            imagestring($img, 4, 96, 310, str_replace('•', '*', $iban), (int) $slate500);
            if ($purposeLine !== '') {
                imagestring($img, 4, 96, 370, $purposeLine, (int) $slate500);
            }
        }

        ob_start();
        imagepng($img, null, 6);
        $bytes = ob_get_clean();

        return is_string($bytes) ? $bytes : '';
    }

    private function findTtfFont(bool $bold): ?string
    {
        $candidates = $bold
            ? [
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            ]
            : [
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            ];

        foreach ($candidates as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    private function escape(string $text): string
    {
        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
