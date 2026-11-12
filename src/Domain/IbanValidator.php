<?php

declare(strict_types=1);

namespace SepaPay\Domain;

final class IbanValidator
{
    /** @var array<string, int> */
    private const SEPA_LENGTHS = [
        'AT' => 20, 'DE' => 22, 'CH' => 21, 'LI' => 21,
        'BE' => 16, 'NL' => 18, 'LU' => 20, 'FR' => 27, 'IT' => 27,
        'ES' => 24, 'PT' => 25, 'IE' => 22, 'FI' => 18, 'SI' => 19,
        'SK' => 24, 'CZ' => 24, 'PL' => 28, 'HU' => 28, 'HR' => 21,
        'RO' => 24, 'BG' => 22, 'DK' => 18, 'SE' => 24, 'NO' => 15, 'GB' => 22,
    ];

    public function normalize(string $iban): string
    {
        return strtoupper(preg_replace('/\s+/', '', $iban) ?? '');
    }

    public function isValid(string $iban): bool
    {
        $normalized = $this->normalize($iban);
        if ($normalized === '' || !ctype_alnum($normalized)) {
            return false;
        }

        $country = substr($normalized, 0, 2);
        if (!ctype_upper($country)) {
            return false;
        }

        $len = strlen($normalized);
        $expected = self::SEPA_LENGTHS[$country] ?? null;
        if ($expected !== null) {
            if ($len !== $expected) {
                return false;
            }
        } elseif ($len < 15 || $len > 34) {
            return false;
        }

        return $this->mod97($normalized) === 1;
    }

    /**
     * ISO 13616 modulo-97 using chunked arithmetic (no bcmath required).
     */
    public function mod97(string $iban): int
    {
        $rearranged = substr($iban, 4) . substr($iban, 0, 4);
        $numeric = '';
        foreach (str_split($rearranged) as $ch) {
            if (ctype_digit($ch)) {
                $numeric .= $ch;
            } else {
                $numeric .= (string) (ord($ch) - 55);
            }
        }

        $remainder = 0;
        $chunkSize = 9;
        $offset = 0;
        $totalLen = strlen($numeric);
        while ($offset < $totalLen) {
            $chunk = (string) $remainder . substr($numeric, $offset, $chunkSize);
            $remainder = (int) ($chunk % 97);
            $offset += $chunkSize;
        }

        return $remainder;
    }

    public function format(string $iban): string
    {
        $normalized = $this->normalize($iban);
        return trim(chunk_split($normalized, 4, ' '));
    }

    public function mask(string $iban): string
    {
        $normalized = $this->normalize($iban);
        $len = strlen($normalized);
        if ($len <= 8) {
            return $normalized;
        }

        $first = substr($normalized, 0, 4);
        $last = substr($normalized, -4);
        $middleLen = $len - 8;
        $blocks = (int) ceil($middleLen / 4);
        $maskedMiddle = implode(' ', array_fill(0, $blocks, '••••'));

        return $first . ' ' . $maskedMiddle . ' ' . $last;
    }

    public function isValidBic(string $bic): bool
    {
        if ($bic === '') {
            return true;
        }

        return preg_match('/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/', $bic) === 1;
    }

    public function normalizeBic(string $bic): string
    {
        return strtoupper(preg_replace('/\s+/', '', $bic) ?? '');
    }
}
