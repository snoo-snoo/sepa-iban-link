<?php

declare(strict_types=1);

namespace SepaPay\Security;

use InvalidArgumentException;
use SepaPay\Config\AppConfig;
use SepaPay\Domain\PaymentRequest;

final class TokenCodec
{
    private const MAX_TOKEN_LENGTH = 1024;
    private const SIG_LENGTH = 22;

    public function __construct(
        private readonly AppConfig $config,
    ) {
    }

    public function encode(PaymentRequest $req): string
    {
        $data = [
            'v' => 1,
            'n' => $req->recipientName,
            'i' => $req->iban,
            'b' => $req->bic,
            'a' => $req->amount,
            'p' => $req->purpose,
            'r' => $req->reference,
            's' => '',
        ];

        if ($this->config->hmacEnabled()) {
            $canonical = $this->canonicalString($data);
            $data['s'] = $this->sign($canonical);
        }

        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return $this->base64UrlEncode($json);
    }

    public function decode(string $token): PaymentRequest
    {
        $token = trim($token);
        if ($token === '' || strlen($token) > self::MAX_TOKEN_LENGTH) {
            throw new InvalidArgumentException('Ungültiger Token.');
        }

        $json = $this->base64UrlDecode($token);
        /** @var array<string, mixed> $data */
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        if (($data['v'] ?? null) !== 1) {
            throw new InvalidArgumentException('Unbekannte Token-Version.');
        }

        $verified = false;
        $sig = (string) ($data['s'] ?? '');

        if ($this->config->hmacEnabled()) {
            if ($sig === '') {
                throw new InvalidArgumentException('Token ohne Signatur abgelehnt.');
            }

            $canonical = $this->canonicalString([
                'v' => 1,
                'n' => (string) ($data['n'] ?? ''),
                'i' => (string) ($data['i'] ?? ''),
                'b' => (string) ($data['b'] ?? ''),
                'a' => (string) ($data['a'] ?? ''),
                'p' => (string) ($data['p'] ?? ''),
                'r' => (string) ($data['r'] ?? ''),
            ]);

            $expected = $this->sign($canonical);
            if (!hash_equals($expected, $sig)) {
                throw new InvalidArgumentException('Token-Signatur ungültig (manipuliert).');
            }

            $verified = true;
        }

        return PaymentRequest::fromArray([
            'n' => $data['n'] ?? '',
            'i' => $data['i'] ?? '',
            'b' => $data['b'] ?? '',
            'a' => $data['a'] ?? '',
            'p' => $data['p'] ?? '',
            'r' => $data['r'] ?? '',
        ], $verified);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function canonicalString(array $data): string
    {
        return sprintf(
            'v1|%s|%s|%s|%s|%s|%s',
            (string) ($data['n'] ?? ''),
            (string) ($data['i'] ?? ''),
            (string) ($data['b'] ?? ''),
            (string) ($data['a'] ?? ''),
            (string) ($data['p'] ?? ''),
            (string) ($data['r'] ?? ''),
        );
    }

    private function sign(string $canonical): string
    {
        $raw = hash_hmac('sha256', $canonical, $this->config->hmacSecret, true);
        $b64 = $this->base64UrlEncode($raw);

        return substr($b64, 0, self::SIG_LENGTH);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder > 0) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($data, '-_', '+/'), true);
        if ($decoded === false) {
            throw new InvalidArgumentException('Token konnte nicht dekodiert werden.');
        }

        return $decoded;
    }
}
